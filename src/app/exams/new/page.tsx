import { redirect } from "next/navigation";
import { PageCapture } from "@/components/exams/PageCapture";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";

export default async function NewExamPage() {
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const profile = await getProfile(supabase, session.user.id);

  if (!profile?.organisation_id) {
    redirect("/onboarding");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900">New exam</h1>
      <p className="mt-2 text-neutral-600">
        Take photos of your handwritten exam pages and Scribe will turn them
        into a clean, school-branded exam.
      </p>
      <div className="mt-6">
        <PageCapture />
      </div>
    </div>
  );
}