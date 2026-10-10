"use client";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import { AppShell } from "./AppShell";
import type { Profile } from "@/types/database";

interface AuthenticatedShellProps {
  children: React.ReactNode;
  profile: Profile;
}

export async function AuthenticatedShell({ children, profile }: AuthenticatedShellProps) {
  return <AppShell role={profile.role === "admin" ? "admin" : "teacher"} onSignOut={signOut}>{children}</AppShell>;
}
