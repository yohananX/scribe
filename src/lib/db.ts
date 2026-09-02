import { createClient } from "@/lib/supabase/server";
import type { Exam, Profile, Question, Template } from "@/types/database";

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Profile;
}

export async function getOrganisationTemplate(organisationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("organisation_id", organisationId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Template;
}

export async function getOrganisationExams(organisationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exams")
    .select("*")
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as Exam[];
}

export async function getExamWithQuestions(examId: string) {
  const supabase = await createClient();
  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("*")
    .eq("id", examId)
    .single();

  if (examError || !exam) {
    return null;
  }

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("*")
    .eq("exam_id", examId)
    .order("order", { ascending: true });

  if (questionsError) {
    return exam as Exam;
  }

  return {
    ...(exam as Exam),
    questions: (questions ?? []) as Question[],
  };
}

export async function getOrganisationMembers(organisationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("organisation_id", organisationId)
    .order("role", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as Profile[];
}
