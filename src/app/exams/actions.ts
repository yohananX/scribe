"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getFriendlyMessage } from "@/lib/errors";
import { EXAM_LIMITS, formatMb } from "@/lib/exam-limits";
import { getExtractionProvider } from "@/lib/extraction";
import { getProfile } from "@/lib/profile";
import { getExamPageSignedUrl, uploadExamPage } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export type ExamActionResult = {
  ok: boolean;
  message?: string;
};

const editableQuestionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1, "Question text cannot be empty.").max(4000),
  marks: z.number().int().min(0).max(200).nullable(),
  options: z.array(z.string().max(200)).max(8),
  order: z.number().int().min(1).optional(),
});

const saveExamSchema = z.object({
  questions: z.array(editableQuestionSchema).max(200),
  titleBlock: z.record(z.string(), z.string().max(120)),
});

async function requireExamOwner(examId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: exam } = await supabase
    .from("exams")
    .select("id, teacher_id, organisation_id")
    .eq("id", examId)
    .single();

  if (!exam || exam.teacher_id !== user.id) {
    redirect("/exams");
  }

  return { supabase, user, exam };
}

export async function createExamFromPages(
  formData: FormData
): Promise<ExamActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(supabase, user.id);

  if (!profile?.organisation_id) {
    redirect("/onboarding");
  }

  const files = Array.from(formData.getAll("pages")).filter(
    (entry): entry is File => entry instanceof File
  );

  if (files.length === 0) {
    return { ok: false, message: "Add at least one page before processing." };
  }

  if (files.length > EXAM_LIMITS.maxPages) {
    return {
      ok: false,
      message: `Too many pages at once (max ${EXAM_LIMITS.maxPages}). Split into smaller batches for reliable reading.`,
    };
  }

  let totalBytes = 0;
  for (const file of files) {
    const type = (file.type || "").toLowerCase();
    if (!type.startsWith("image/")) {
      return { ok: false, message: "One of the files you added is not an image." };
    }
    if (type === "image/heic" || type === "image/heif") {
      return {
        ok: false,
        message:
          "One photo is in HEIC format (iPhone). Re-save it as JPG/PNG, or retake without HDR, then try again.",
      };
    }
    if (file.size > EXAM_LIMITS.maxFileBytes) {
      return {
        ok: false,
        message: `One image is larger than ${formatMb(EXAM_LIMITS.maxFileBytes)}. Use a smaller photo or screenshot.`,
      };
    }
    totalBytes += file.size;
  }

  if (totalBytes > EXAM_LIMITS.maxTotalBytes) {
    return {
      ok: false,
      message: `Those pages total ${formatMb(totalBytes)} (max ${formatMb(EXAM_LIMITS.maxTotalBytes)}). Process fewer pages at once.`,
    };
  }

  let examId: string | null = null;
  const uploadedPaths: string[] = [];

  try {
    const { data: exam, error: examError } = await supabase
      .from("exams")
      .insert({
        organisation_id: profile.organisation_id,
        teacher_id: user.id,
        status: "draft",
      })
      .select("id")
      .single();

    if (examError) {
      return { ok: false, message: getFriendlyMessage(examError) };
    }

    examId = exam.id;

    const imageUris: string[] = [];
    const pageRows: { exam_id: string; page_number: number; storage_path: string }[] = [];

    for (let index = 0; index < files.length; index += 1) {
      const path = await uploadExamPage(exam.id, index + 1, files[index]);
      uploadedPaths.push(path);
      pageRows.push({
        exam_id: exam.id,
        page_number: index + 1,
        storage_path: path,
      });
      const signedUrl = await getExamPageSignedUrl(
        path,
        EXAM_LIMITS.signedUrlExpirySeconds
      );
      imageUris.push(signedUrl);
    }

    const { error: pagesError } = await supabase
      .from("exam_pages")
      .insert(pageRows);

    if (pagesError) {
      throw pagesError;
    }

    const provider = getExtractionProvider();
    const result = await provider.extract(imageUris);

    if (!result.questions || result.questions.length === 0) {
      throw new Error(
        "No questions were found on those pages. Try sharper photos with good lighting."
      );
    }

    const { error: insertError } = await supabase.from("questions").insert(
      result.questions.map((question) => ({
        exam_id: examId,
        text: question.text,
        marks: question.marks ?? null,
        options: question.options ?? [],
        order: question.order,
        page_number: question.pageNumber,
      }))
    );

    if (insertError) {
      throw insertError;
    }
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from("exam-pages").remove(uploadedPaths);
    }

    if (examId) {
      await supabase.from("exams").delete().eq("id", examId);
    }

    return { ok: false, message: getFriendlyMessage(error) };
  }

  revalidatePath("/exams");
  redirect(`/exams/${examId}/review`);
}

export async function saveExam(
  examId: string,
  input: unknown
): Promise<ExamActionResult> {
  const parsed = saveExamSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Some exam details are not valid. Check the questions and try again.",
    };
  }

  const { supabase, exam } = await requireExamOwner(examId);

  // Server is the source of truth for order: display position wins.
  const normalized = parsed.data.questions.map((question, index) => ({
    ...question,
    text: question.text.trim(),
    options: question.options.map((o) => o.trim()).filter((o) => o.length > 0),
    order: index + 1,
  }));

  for (const q of normalized) {
    if (!q.text) {
      return {
        ok: false,
        message: "Question text cannot be empty. Fill every question or delete it.",
      };
    }
  }

  // 1) Try atomic RPC (requires supabase/migrations/20260927001 applied).
  const rpcPayload = {
    p_exam_id: exam.id,
    p_title_block: parsed.data.titleBlock,
    p_questions: normalized.map((q) => ({
      text: q.text,
      marks: q.marks,
      options: q.options,
    })),
  };

  const { error: rpcError } = await supabase.rpc(
    "save_exam_with_questions",
    rpcPayload
  );

  if (!rpcError) {
    revalidatePath(`/exams/${examId}/review`);
    revalidatePath(`/exams/${examId}/preview`);
    revalidatePath("/exams");
    return { ok: true, message: "Changes saved." };
  }

  // Missing function -> fall back to safe differential save.
  // Postgres error code 42883 = undefined_function.
  // Any other RPC error is a real validation/auth failure.
  const isMissingFn = rpcError.code === "42883";

  if (!isMissingFn) {
    return { ok: false, message: getFriendlyMessage(rpcError) };
  }

  return differentialSave(supabase, exam.id, normalized, parsed.data.titleBlock);
}

async function differentialSave(
  supabase: Awaited<ReturnType<typeof createClient>>,
  examId: string,
  questions: { id: string; text: string; marks: number | null; options: string[]; order: number }[],
  titleBlock: Record<string, string>
): Promise<ExamActionResult> {
  // Insert new rows first so a failure leaves existing data intact.
  const { data: existing } = await supabase
    .from("questions")
    .select("id")
    .eq("exam_id", examId);

  const existingIds = new Set((existing ?? []).map((r) => r.id as string));
  const incomingIds = new Set(
    questions.filter((q) => !q.id.startsWith("local-")).map((q) => q.id)
  );

  const toInsert = questions.filter(
    (q) => q.id.startsWith("local-") || !existingIds.has(q.id)
  );
  const toUpdate = questions.filter(
    (q) => !q.id.startsWith("local-") && existingIds.has(q.id)
  );
  const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));

  if (toInsert.length > 0) {
    const { error } = await supabase.from("questions").insert(
      toInsert.map((q) => ({
        exam_id: examId,
        text: q.text,
        marks: q.marks,
        options: q.options,
        order: q.order,
      }))
    );
    if (error) return { ok: false, message: getFriendlyMessage(error) };
  }

  for (const q of toUpdate) {
    const { error } = await supabase
      .from("questions")
      .update({ text: q.text, marks: q.marks, options: q.options, order: q.order })
      .eq("id", q.id)
      .eq("exam_id", examId);
    if (error) return { ok: false, message: getFriendlyMessage(error) };
  }

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("questions")
      .delete()
      .eq("exam_id", examId)
      .in("id", toDelete);
    if (error) return { ok: false, message: getFriendlyMessage(error) };
  }

  const { error: updateError } = await supabase
    .from("exams")
    .update({
      title_block: titleBlock,
      updated_at: new Date().toISOString(),
    })
    .eq("id", examId);

  if (updateError) {
    return { ok: false, message: getFriendlyMessage(updateError) };
  }

  revalidatePath(`/exams/${examId}/review`);
  revalidatePath(`/exams/${examId}/preview`);
  revalidatePath("/exams");

  return { ok: true, message: "Changes saved." };
}

export async function finalizeExam(examId: string): Promise<ExamActionResult> {
  const { supabase, exam } = await requireExamOwner(examId);

  const { error } = await supabase
    .from("exams")
    .update({ status: "finalized", updated_at: new Date().toISOString() })
    .eq("id", exam.id)
    .eq("status", "draft");

  if (error) {
    return { ok: false, message: getFriendlyMessage(error) };
  }

  revalidatePath(`/exams/${examId}/preview`);
  revalidatePath("/exams");
  return { ok: true, message: "Exam finalized." };
}