import { redirect } from "next/navigation";
import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";

export default async function ExamsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfile(supabase, user.id);
  if (!profile?.organisation_id) redirect("/onboarding");

  return <AuthenticatedShell profile={profile}>{children}</AuthenticatedShell>;
}
