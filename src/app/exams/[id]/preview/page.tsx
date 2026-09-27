import { redirect } from "next/navigation";
import { ExamPreview } from "@/components/template/ExamPreview";
import { PrintButton } from "@/components/exams/PrintButton";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { normalizeTemplateConfig } from "@/lib/template";
import type { PreviewExam } from "@/components/template/sampleExam";

type PreviewPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { id } = await params;
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

  const { data: exam } = await supabase
    .from("exams")
    .select("id, teacher_id, title_block, status")
    .eq("id", id)
    .single();

  const canView =
    exam &&
    (exam.teacher_id === user.id || profile.role === "admin");

  if (!canView) {
    redirect("/exams");
  }

  const isOwner = exam!.teacher_id === user.id;

  if (exam!.status === "draft" && isOwner) {
    await supabase
      .from("exams")
      .update({
        status: "finalized",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("text, marks, options")
    .eq("exam_id", id)
    .order("order", { ascending: true });

  const { data: template } = await supabase
    .from("templates")
    .select("config")
    .eq("organisation_id", profile.organisation_id)
    .maybeSingle();

  const config = normalizeTemplateConfig(template?.config);

  if (config.logo?.path) {
    const { data: signed } = await supabase.storage
      .from("logos")
      .createSignedUrl(config.logo.path, 60 * 60 * 24);

    if (signed?.signedUrl) {
      config.logo = { ...config.logo, url: signed.signedUrl };
    }
  }

  const rawTitleBlock = (exam!.title_block ?? {}) as Record<string, string>;

  const previewExam: PreviewExam = {
    heading: rawTitleBlock.term
      ? `${rawTitleBlock.term} Examination`
      : "Examination",
    instructions:
      "Answer all questions. Show all working where required.",
    titleBlock: {
      subject: rawTitleBlock.subject,
      class: rawTitleBlock.class,
      term: rawTitleBlock.term,
      date: rawTitleBlock.date,
      duration: rawTitleBlock.duration,
      totalMarks: rawTitleBlock.totalMarks,
    },
    questions: (questions ?? []).map((question) => ({
      text: String(question.text ?? ""),
      marks: Number(question.marks ?? 0),
      options: question.options?.length ? question.options : undefined,
    })),
  };

  return (
    <div>
      <div className="no-print">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Preview</h1>
            <p className="mt-1 text-neutral-600">
              This is how the exam will look when printed.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isOwner && (
              <a
                href={`/exams/${id}/review`}
                className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
              >
                Back to edit
              </a>
            )}
            <PrintButton />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-12">
        <ExamPreview config={config} exam={previewExam} />
      </div>
    </div>
  );
}