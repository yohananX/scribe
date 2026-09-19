import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";
import type { Exam } from "@/types/database";

export default async function ExamsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("exams")
    .select("id, title_block, status, created_at")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  const exams = (data ?? []) as Partial<Exam>[];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">My exams</h1>
          <p className="mt-1 text-neutral-600">
            Open an exam to review, preview or print it.
          </p>
        </div>
        <a
          href="/exams/new"
          className="rounded-full bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
        >
          New exam
        </a>
      </div>

      {exams.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No exams yet"
            description="Capture your first handwritten exam pages to generate a clean, school-branded exam."
          />
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {exams.map((exam) => {
            const titleBlock = (exam.title_block ?? {}) as Record<string, string>;
            const label = [titleBlock.subject, titleBlock.class]
              .filter(Boolean)
              .join(" - ");

            return (
              <li key={exam.id}>
                <a href={`/exams/${exam.id}/preview`}>
                  <Card className="flex items-center justify-between gap-4 p-5 transition-colors hover:border-primary-300">
                    <div className="min-w-0">
                      <p className="truncate text-base font-medium text-neutral-900">
                        {label || "Untitled exam"}
                      </p>
                      <p className="mt-0.5 text-sm text-neutral-600">
                        {new Date(exam.created_at ?? "").toLocaleDateString(
                          undefined,
                          { day: "numeric", month: "short", year: "numeric" }
                        )}
                      </p>
                    </div>
                    <Badge
                      variant={exam.status === "finalized" ? "success" : "warning"}
                    >
                      {exam.status === "finalized" ? "Ready" : "Draft"}
                    </Badge>
                  </Card>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}