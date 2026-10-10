import { redirect } from "next/navigation";
import Link from "next/link";
import { cache } from "react";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import type { Exam } from "@/types/database";

// Request-scoped memoization (per-request deduplication)
const getExamsForOrg = cache(
  async (supabase: Awaited<ReturnType<typeof createClient>>, organisationId: string, userId: string, isAdmin: boolean) => {
    const query = supabase.from("exams").select("id, title_block, status, created_at, teacher_id");
    const filteredQuery = isAdmin
      ? query.eq("organisation_id", organisationId)
      : query.eq("teacher_id", userId);
    const { data } = await filteredQuery.order("created_at", { ascending: false }).limit(5);
    return (data ?? []) as Partial<Exam>[];
  }
);

const getExamCounts = cache(
  async (supabase: Awaited<ReturnType<typeof createClient>>, organisationId: string, userId: string, isAdmin: boolean) => {
    const query = supabase.from("exams").select("id", { count: "exact", head: true });
    const filteredQuery = isAdmin
      ? query.eq("organisation_id", organisationId)
      : query.eq("teacher_id", userId);
    const [{ count: total }, { count: drafts }] = await Promise.all([
      filteredQuery,
      filteredQuery.eq("status", "draft"),
    ]);
    return { total: total ?? 0, drafts: drafts ?? 0 };
  }
);

// Org name is shared across users in the same org - can use persistent cache
// But we can't pass supabase client (circular refs). Just fetch directly - it's fast.
async function getOrgName(supabase: Awaited<ReturnType<typeof createClient>>, organisationId: string) {
  const { data } = await supabase.from("organisations").select("name").eq("id", organisationId).maybeSingle();
  return data?.name ?? "Your school";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfile(supabase, user.id);
  if (!profile?.organisation_id) redirect("/onboarding");

  const isAdmin = profile.role === "admin";
  const organisationId = profile.organisation_id!;

  const [exams, { total, drafts }, schoolName] = await Promise.all([
    getExamsForOrg(supabase, organisationId, profile.id, isAdmin),
    getExamCounts(supabase, organisationId, profile.id, isAdmin),
    getOrgName(supabase, organisationId),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-col justify-between gap-6 border-b border-neutral-200 pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-primary-700">{schoolName}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-neutral-900">Good to see you{profile.email ? `, ${profile.email.split("@")[0]}` : ""}.</h1>
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
        <div className="pr-3 sm:border-r sm:border-neutral-200"><p className="text-xs font-medium uppercase tracking-[0.1em] text-neutral-500">{isAdmin ? "School exams" : "Your exams"}</p><p className="mt-2 text-3xl font-semibold tabular-nums text-neutral-900">{total}</p></div>
        <div className="sm:border-r sm:border-neutral-200 sm:px-5"><p className="text-xs font-medium uppercase tracking-[0.1em] text-neutral-500">Drafts to review</p><p className="mt-2 text-3xl font-semibold tabular-nums text-[#a44f36]">{drafts}</p></div>
        <div className="col-span-2 border-t border-neutral-200 pt-4 sm:col-span-1 sm:border-0 sm:px-5 sm:pt-0"><p className="text-xs font-medium uppercase tracking-[0.1em] text-neutral-500">Ready to print</p><p className="mt-2 text-3xl font-semibold tabular-nums text-primary-700">{Math.max(0, total - drafts)}</p></div>
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
