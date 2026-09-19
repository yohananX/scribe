import { redirect } from "next/navigation";
import { OrganisationForm } from "@/components/org/OrganisationForm";
import { ensureProfileRow, getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureProfileRow(user);

  const profile = await getProfile(supabase, user.id);

  if (profile?.organisation_id) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-neutral-900">
            Create your school account
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Set up your organisation to start using Scribe. You&apos;ll become
            the first admin.
          </p>
        </div>
        <OrganisationForm />
      </div>
    </div>
  );
}