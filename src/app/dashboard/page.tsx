import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organisation_id")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
      <p className="mt-2 text-neutral-600">
        {isAdmin
          ? "Manage your organisation, teachers, and exam template."
          : "Create and manage your exams."}
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {isAdmin && (
          <a
            href="/admin/teachers"
            className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition-colors hover:border-primary-300"
          >
            <h2 className="text-lg font-semibold text-neutral-900">Teachers</h2>
            <p className="mt-1 text-sm text-neutral-600">Invite and manage teachers in your organisation.</p>
          </a>
        )}
        <a
          href="/admin/template"
          className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition-colors hover:border-primary-300"
        >
          <h2 className="text-lg font-semibold text-neutral-900">Template</h2>
          <p className="mt-1 text-sm text-neutral-600">Configure the official school exam template.</p>
        </a>
        <a
          href="/exams/new"
          className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition-colors hover:border-primary-300"
        >
          <h2 className="text-lg font-semibold text-neutral-900">New Exam</h2>
          <p className="mt-1 text-sm text-neutral-600">Capture handwritten pages and generate an exam.</p>
        </a>
        <a
          href="/dashboard"
          className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition-colors hover:border-primary-300"
        >
          <h2 className="text-lg font-semibold text-neutral-900">My Exams</h2>
          <p className="mt-1 text-sm text-neutral-600">Review, edit and print your exams.</p>
        </a>
      </div>
    </div>
  );
}
