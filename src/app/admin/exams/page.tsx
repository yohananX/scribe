import { redirect } from "next/navigation";
import { cache } from "react";
import { AdminExamsBoard, type BoardExam } from "@/components/admin/AdminExamsBoard";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";

// Request-scoped memoization for org-scoped data
const getAdminExams = cache(
  async (supabase: Awaited<ReturnType<typeof createClient>>, orgId: string) => {
    const { data } = await supabase
      .from("exams")
      .select("id, teacher_id, title_block, status, created_at")
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: false });
    return data;
  }
);

const getOrgMembers = cache(
  async (supabase: Awaited<ReturnType<typeof createClient>>, orgId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("organisation_id", orgId);
    return data;
  }
);

const getExamPages = cache(
  async (supabase: Awaited<ReturnType<typeof createClient>>, orgId: string) => {
    const { data } = await supabase
      .from("exams")
      .select("id")
      .eq("organisation_id", orgId);
    
    if (!data?.length) return [];
    
    const examIds = data.map(e => e.id);
    const { data: pages } = await supabase
      .from("exam_pages")
      .select("exam_id")
      .in("exam_id", examIds);
    return pages;
  }
);

export default async function AdminExamsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(supabase, user.id);

  if (!profile?.organisation_id || profile.role !== "admin") {
    redirect("/dashboard");
  }

  const orgId = profile.organisation_id;

  const [examsData, membersData, pagesData] = await Promise.all([
    getAdminExams(supabase, orgId),
    getOrgMembers(supabase, orgId),
    getExamPages(supabase, orgId),
  ]);

  const teacherNames = new Map<string, string>();

  for (const member of membersData ?? []) {
    teacherNames.set(member.id, member.full_name || member.email);
  }

  const pageCounts = new Map<string, number>();

  for (const page of pagesData ?? []) {
    pageCounts.set(page.exam_id, (pageCounts.get(page.exam_id) ?? 0) + 1);
  }

  const exams: BoardExam[] = (examsData ?? []).map((exam) => {
    const titleBlock = (exam.title_block ?? {}) as Record<string, string>;
    const className = titleBlock.class?.trim() || "Unassigned";

    return {
      id: exam.id,
      label: [titleBlock.subject, className].filter(Boolean).join(" - ") || "Untitled",
      className,
      teacherName: teacherNames.get(exam.teacher_id) ?? "Unknown teacher",
      createdLabel: new Date(exam.created_at ?? "").toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      pages: pageCounts.get(exam.id) ?? 0,
      status: exam.status === "finalized" ? "finalized" : "draft",
    };
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Exams by class</h1>
      <p className="mt-2 text-neutral-600">
        Every exam from your teachers, grouped by class. Open one to preview or
        print it.
      </p>
      <AdminExamsBoard exams={exams} />
    </div>
  );
}