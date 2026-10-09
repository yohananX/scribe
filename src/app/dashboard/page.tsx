import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { Exam } from "@/types/database";

export default async function DashboardPage() {
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

  const isAdmin = profile.role === "admin";
  const examScope = (
    columns: string,
    options?: { count?: "exact"; head?: boolean }
  ) => {
    const query = supabase.from("exams").select(columns, options);
    return isAdmin
      ? query.eq("organisation_id", profile.organisation_id)
      : query.eq("teacher_id", user.id);
  };

  const [organisationResult, recentResult, totalResult, draftResult] =
    await Promise.all([
      supabase
        .from("organisations")
        .select("name")
        .eq("id", profile.organisation_id)
        .maybeSingle(),
      examScope("id, title_block, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      examScope("id", { count: "exact", head: true }),
      examScope("id", { count: "exact", head: true }).eq("status", "draft"),
    ]);

  const exams = (recentResult.data ?? []) as Partial<Exam>[];
  const totalCount = totalResult.count ?? 0;
  const draftCount = draftResult.count ?? 0;
  const schoolName = organisationResult.data?.name ?? "Your school";

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-col justify-between gap-6 border-b border-neutral-200 pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-primary-700">{schoolName}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-neutral-900">Good to see you{user.email ? `, ${user.email.split("@")[0]}` : ""}.</h1>
          <p className="mt-2 text-sm text-neutral-600">
            {isAdmin
              ? "Here is the latest exam activity across your school."
              : "Pick up where you left off or prepare a new exam."}
          </p>
        </div>
        <Link href="/exams/new" className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-md bg-primary-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700 sm:self-auto">
          <span aria-hidden="true" className="text-lg leading-none">+</span> Create exam
        </Link>
      </div>

      <section aria-label="Exam overview" className="grid grid-cols-2 gap-3 border-b border-neutral-200 py-6 sm:grid-cols-3 sm:gap-5">
        <div className="pr-3 sm:border-r sm:border-neutral-200"><p className="text-xs font-medium uppercase tracking-[0.1em] text-neutral-500">{isAdmin ? "School exams" : "Your exams"}</p><p className="mt-2 text-3xl font-semibold tabular-nums text-neutral-900">{totalCount}</p></div>
        <div className="sm:border-r sm:border-neutral-200 sm:px-5"><p className="text-xs font-medium uppercase tracking-[0.1em] text-neutral-500">Drafts to review</p><p className="mt-2 text-3xl font-semibold tabular-nums text-[#a44f36]">{draftCount}</p></div>
        <div className="col-span-2 border-t border-neutral-200 pt-4 sm:col-span-1 sm:border-0 sm:px-5 sm:pt-0"><p className="text-xs font-medium uppercase tracking-[0.1em] text-neutral-500">Ready to print</p><p className="mt-2 text-3xl font-semibold tabular-nums text-primary-700">{Math.max(0, totalCount - draftCount)}</p></div>
      </section>

      <section className="py-7" aria-labelledby="recent-exams-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div><h2 id="recent-exams-heading" className="text-lg font-semibold text-neutral-900">Recent exams</h2><p className="mt-1 text-sm text-neutral-600">Your latest work, ready to continue.</p></div>
          <Link href={isAdmin ? "/admin/exams" : "/exams"} className="shrink-0 text-sm font-semibold text-primary-700 hover:text-primary-800">{isAdmin ? "View school exams" : "View all"}<span aria-hidden="true"> &rarr;</span></Link>
        </div>
        {exams.length > 0 ? (
          <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
            {exams.map((exam) => {
              const titleBlock = (exam.title_block ?? {}) as Record<string, string>;
              const label = [titleBlock.subject, titleBlock.class]
                .filter(Boolean)
                .join(" · ") || "Untitled exam";
              const examHref =
                isAdmin || exam.status === "finalized"
                  ? `/exams/${exam.id}/preview`
                  : `/exams/${exam.id}/review`;

              return (
                <li key={exam.id}>
                  <Link href={examHref} className="flex min-h-[76px] items-center justify-between gap-4 py-3 transition-colors hover:bg-white/70 sm:px-3">
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold text-neutral-900">{label}</span><span className="mt-1 block text-xs text-neutral-500">{exam.created_at ? new Date(exam.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "Date unavailable"}</span></span>
                    <span className="flex shrink-0 items-center gap-3"><Badge variant={exam.status === "finalized" ? "success" : "warning"}>{exam.status === "finalized" ? "Ready" : "Draft"}</Badge><span className="hidden text-neutral-400 sm:inline" aria-hidden="true">&rarr;</span></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="border-y border-neutral-200 py-9">
            <p className="text-base font-semibold text-neutral-900">Your first exam starts here.</p>
            <p className="mt-1 max-w-xl text-sm leading-6 text-neutral-600">Capture handwritten pages, review the extracted questions, then create a clean document using your school&apos;s format.</p>
            <Link href="/exams/new" className="mt-5 inline-flex min-h-10 items-center rounded-md border border-primary-700 px-4 text-sm font-semibold text-primary-800 transition-colors hover:bg-primary-50">Prepare your first exam <span aria-hidden="true" className="ml-2">&rarr;</span></Link>
          </div>
        )}
      </section>

      {isAdmin && (
        <section aria-label="School management" className="border-t border-neutral-200 py-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">School setup</p>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <Link href="/admin/teachers" className="font-medium text-neutral-700 underline decoration-neutral-300 underline-offset-4 hover:text-primary-700">Invite and manage teachers</Link>
            <Link href="/admin/template" className="font-medium text-neutral-700 underline decoration-neutral-300 underline-offset-4 hover:text-primary-700">Review school exam template</Link>
          </div>
        </section>
      )}
    </div>
  );
}
