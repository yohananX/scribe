import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { ReviewScreen } from "@/components/exams/ReviewScreen";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import {
  normalizeTemplateConfig,
  TITLE_BLOCK_FIELDS,
  type TitleBlockField,
} from "@/lib/template";
import type { EditableBlock } from "@/types/database";

type ReviewPageProps = {
  params: Promise<{ id: string }>;
};

const getExamForReview = unstable_cache(
  async (examId: string, userId: string) => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("exams")
      .select("id, teacher_id, title_block, structure")
      .eq("id", examId)
      .eq("teacher_id", userId)
      .single();
    return data;
  },
  ["exam-review"],
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

export default async function ReviewPage({ params }: ReviewPageProps) {
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

  const exam = await getExamForReview(id, session.user.id);
  if (!exam) {
    redirect("/exams");
  }

  const [template] = await Promise.all([
    getTemplateForOrg(profile.organisation_id),
  ]);

  const config = normalizeTemplateConfig(template?.config);

  const rawTitleBlock = (exam.title_block ?? {}) as Record<string, unknown>;
  const initialTitleBlock: Record<string, string> = {};

  for (const field of TITLE_BLOCK_FIELDS) {
    const value = rawTitleBlock[field];
    if (typeof value === "string") {
      initialTitleBlock[field] = value;
    }
  }

  const initialBlocks: EditableBlock[] = (exam.structure ?? []).map((block: Record<string, unknown>) => ({
    id: block.id as string,
    type: block.type as EditableBlock["type"],
    order: block.order as number,
    text: block.text as string | undefined,
    title: block.title as string | undefined,
    instructions: block.instructions as string | undefined,
    content: block.content as string | undefined,
    questionText: block.questionText as string | undefined,
    marks: (block.marks as number | null) ?? null,
    options: block.options as string[] | undefined,
    subparts: block.subparts as EditableBlock["subparts"],
    pageNumber: block.pageNumber as number | null | undefined,
  }));

  const titleFields: TitleBlockField[] = config.titleBlock.fields;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <ReviewScreen
        examId={id}
        initialBlocks={initialBlocks}
        initialTitleBlock={initialTitleBlock}
        titleFields={titleFields}
      />
    </div>
  );
}