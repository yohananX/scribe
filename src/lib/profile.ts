import { createClient } from "@/lib/supabase/server";
import { unstable_cache } from "next/cache";
import type { Profile } from "@/types/database";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export async function linkInvitationIfAny(user: User) {
  const supabase = await createClient();

  const { data: invitation } = await supabase
    .from("invitations")
    .select("id, organisation_id")
    .eq("email", user.email ?? "")
    .eq("status", "pending")
    .maybeSingle();

  if (!invitation) {
    return;
  }

  // Preserve existing full_name if present
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? "",
      full_name: existingProfile?.full_name ?? user.user_metadata?.full_name ?? null,
      organisation_id: invitation.organisation_id,
      role: "teacher",
    },
    { onConflict: "id" }
  );

  if (profileError) {
    return;
  }

  await supabase
    .from("invitations")
    .update({ status: "accepted" })
    .eq("id", invitation.id);
}

export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, organisation_id, role")
    .eq("id", userId)
    .single();

  return (data ?? null) as Profile | null;
}

// Cached version for use in server components
export const getCachedProfile = unstable_cache(
  async (userId: string) => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, organisation_id, role")
      .eq("id", userId)
      .single();
    return (data ?? null) as Profile | null;
  },
  ["profile"],
  { tags: ["profile"], revalidate: 60 }
);
