import { redirect } from "next/navigation";
import { OrganisationForm } from "@/components/org/OrganisationForm";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { createClient } from "@/lib/supabase/server";
import { getCachedProfile } from "@/lib/profile";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const profile = await getCachedProfile(session.user.id);

  if (profile?.organisation_id) {
    redirect("/dashboard");
  }

  return (
    <AuthFrame
      eyebrow="Step 1 of 1 · School setup"
      title="Set up your school"
      description="Create your organisation workspace. You will be its first administrator and can invite teachers next."
    >
        <OrganisationForm />
    </AuthFrame>
  );
}
