import { redirect } from "next/navigation";
import { ReviewScreen } from "@/components/exams/ReviewScreen";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeTemplateConfig,
  TITLE_BLOCK_FIELDS,
  type TitleBlockField,
} from "@/lib/template";
import type { EditableQuestion, Question } from "@/types/database";

type ReviewPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReviewPage({ params }: ReviewPageProps) {
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
    .select("id, teacher_id, title_block")
    .eq("id", id)
    .single();

  if (!exam || exam.teacher_id !== user.id) {
    redirect("/exams");
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("exam_id", id)
    .order("order", { ascending: true });

  const { data: template } = await supabase
    .from("templates")
    .select("config")
    .eq("organisation_id", profile.organisation_id)
    .maybeSingle();

  const config = normalizeTemplateConfig(template?.config);

  const rawTitleBlock = (exam.title_block ?? {}) as Record<string, unknown>;
  const initialTitleBlock: Record<string, string> = {};

  for (const field of TITLE_BLOCK_FIELDS) {
    const value = rawTitleBlock[field];
    if (typeof value === "string") {
      initialTitleBlock[field] = value;
    }
  }

  const editableQuestions: EditableQuestion[] = (questions ?? []).map(
    (question: Question) => ({
      id: question.id,
      text: question.text,
      marks: question.marks,
      options: question.options,
      order: question.order,
    })
  );

  const titleFields: TitleBlockField[] = config.titleBlock.fields;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <ReviewScreen
        examId={id}
        initialQuestions={editableQuestions}
        initialTitleBlock={initialTitleBlock}
        titleFields={titleFields}
      />
    </div>
  );
}