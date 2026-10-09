import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { ExamPreview } from "@/components/template/ExamPreview";
import { PrintButton } from "@/components/exams/PrintButton";
import { createClient } from "@/lib/supabase/server";
import { getCachedProfile } from "@/lib/profile";
import { normalizeTemplateConfig } from "@/lib/template";
import type { PreviewExam } from "@/components/template/sampleExam";

type PreviewPageProps = {
  params: Promise<{ id: string }>;
};

const getExamForPreview = unstable_cache(
  async (examId: string, userId: string, isAdmin: boolean) => {
    const supabase = await createClient();
    const query = supabase.from("exams").select("id, teacher_id, title_block, status");
    if (isAdmin) {
      const { data } = await query.eq("id", examId).single();
      return data;
    }
    const { data } = await query.eq("id", examId).eq("teacher_id", userId).single();
    return data;
  },
  ["exam-preview"],
  { tags: ["exams"], revalidate: 60 }
);

const getQuestionsForExam = unstable_cache(
  async (examId: string) => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("questions")
      .select("text, marks, options")
      .eq("exam_id", examId)
      .order("order", { ascending: true });
    return data;
  },
  ["exam-questions"],
  { tags: ["exams"], revalidate: 60 }
);

const getTemplateForOrg = unstable_cache(
  async (organisationId: string) => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("templates")
      .select("config")
      .eq("organisation_id", organisationId)
      .maybeSingle();
    return data;
  },
  ["org-template"],
  { tags: ["templates"], revalidate: 300 }
);

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const profile = await getCachedProfile(session.user.id);

  if (!profile?.organisation_id) {
    redirect("/onboarding");
  }

  const isAdmin = profile.role === "admin";
  const exam = await getExamForPreview(id, session.user.id, isAdmin);

  if (!exam) {
    redirect("/exams");
  }

  const canView = exam.teacher_id === session.user.id || isAdmin;
  if (!canView) {
    redirect("/exams");
  }

  const isOwner = exam.teacher_id === session.user.id;

  const [questions, template] = await Promise.all([
    getQuestionsForExam(id),
    getTemplateForOrg(profile.organisation_id),
  ]);

  const config = normalizeTemplateConfig(template?.config);

  if (config.logo?.path) {
    const { data: signed } = await supabase.storage
      .from("logos")
      .createSignedUrl(config.logo.path, 60 * 60 * 24);

    if (signed?.signedUrl) {
      config.logo = { ...config.logo, url: signed.signedUrl };
    }
  }

  const rawTitleBlock = (exam.title_block ?? {}) as Record<string, string>;

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