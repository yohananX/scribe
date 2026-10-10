import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { ExamPreview } from "@/components/template/ExamPreview";
import { PrintButton } from "@/components/exams/PrintButton";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { normalizeTemplateConfig } from "@/lib/template";
import type { PreviewExam, PreviewBlock } from "@/components/template/sampleExam";

type PreviewPageProps = {
  params: Promise<{ id: string }>;
};

const getExamForPreview = unstable_cache(
  async (examId: string, userId: string, isAdmin: boolean) => {
    const supabase = await createClient();
    const query = supabase.from("exams").select("id, teacher_id, title_block, status, structure");
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

function buildPreviewExam(rawTitleBlock: Record<string, string>, structure: unknown[]): PreviewExam {
  const blocks: PreviewBlock[] = [];

  for (const block of structure) {
    const b = block as Record<string, unknown>;
    switch (b.type) {
      case "instructions":
        if (b.text) {
          blocks.push({ type: "instructions", text: b.text as string });
        }
        break;
      case "section":
        if (b.title) {
          blocks.push({
            type: "section",
            title: b.title as string,
            instructions: b.instructions as string | undefined,
          });
        }
        break;
      case "passage":
        if (b.content) {
          blocks.push({
            type: "passage",
            title: b.title as string | undefined,
            content: b.content as string,
          });
        }
        break;
      case "question":
        const qText = (b.questionText ?? b.text ?? "") as string;
        const marks = (b.marks as number | null) ?? 0;
        const options = (b.options as string[] | undefined)?.filter((o) => o.length > 0);
        const subparts = (b.subparts as { text: string; marks: number | null }[] | undefined)?.map((s) => ({
          text: s.text,
          marks: s.marks ?? 0,
        }));
        blocks.push({
          type: "question",
          question: {
            text: qText,
            marks,
            options: options?.length ? options : undefined,
            subparts: subparts?.length ? subparts : undefined,
          },
        });
        break;
    }
  }

  return {
    heading: rawTitleBlock.term
      ? `${rawTitleBlock.term} Examination`
      : "Examination",
    titleBlock: {
      subject: rawTitleBlock.subject,
      class: rawTitleBlock.class,
      term: rawTitleBlock.term,
      date: rawTitleBlock.date,
      duration: rawTitleBlock.duration,
      totalMarks: rawTitleBlock.totalMarks,
    },
    blocks,
  };
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const profile = await getProfile(supabase, session.user.id);

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

  const template = await getTemplateForOrg(profile.organisation_id);

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
  const structure = (exam.structure ?? []) as unknown[];

  const previewExam = buildPreviewExam(rawTitleBlock, structure);

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