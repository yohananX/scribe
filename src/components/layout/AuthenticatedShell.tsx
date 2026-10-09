import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import { AppShell } from "./AppShell";

export async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return <AppShell role={profile?.role === "admin" ? "admin" : "teacher"} onSignOut={signOut}>{children}</AppShell>;
}
