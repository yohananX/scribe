import { redirect } from "next/navigation";
import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) redirect("/login");

  const profile = await getProfile(supabase, session.user.id);
  if (!profile?.organisation_id) redirect("/onboarding");

  return <AuthenticatedShell profile={profile}>{children}</AuthenticatedShell>;
}
