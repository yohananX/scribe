"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getFriendlyMessage } from "@/lib/errors";
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
  order: z.number().int().min(1),
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

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      return { ok: false, message: "One of the files you added is not an image." };
    }
    if (file.size > 8 * 1024 * 1024) {
      return {
        ok: false,
        message: "One of the images is larger than 8 MB. Please use a smaller image.",
      };
    }
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
      const signedUrl = await getExamPageSignedUrl(path, 300);
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

  const { error: deleteError } = await supabase
    .from("questions")
    .delete()
    .eq("exam_id", examId);

  if (deleteError) {
    return { ok: false, message: getFriendlyMessage(deleteError) };
  }

  const { error: insertError } = await supabase.from("questions").insert(
    parsed.data.questions.map((question) => ({
      exam_id: examId,
      text: question.text,
      marks: question.marks,
      options: question.options,
      order: question.order,
    }))
  );

  if (insertError) {
    return { ok: false, message: getFriendlyMessage(insertError) };
  }

  const { error: updateError } = await supabase
    .from("exams")
    .update({
      title_block: parsed.data.titleBlock,
      updated_at: new Date().toISOString(),
    })
    .eq("id", exam.id);

  if (updateError) {
    return { ok: false, message: getFriendlyMessage(updateError) };
  }

  revalidatePath(`/exams/${examId}/review`);
  revalidatePath(`/exams/${examId}/preview`);
  revalidatePath("/exams");

  return { ok: true, message: "Changes saved." };
}