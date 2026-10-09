"use client";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import { AppShell } from "./AppShell";
import type { Profile } from "@/types/database";
import { createContext, useContext, ReactNode } from "react";

interface AuthenticatedShellProps {
  children: ReactNode;
  profile: Profile;
}

const ProfileContext = createContext<Profile | null>(null);

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within an AuthenticatedShell");
  }
  return context;
}

export async function AuthenticatedShell({ children, profile }: AuthenticatedShellProps) {
  return (
    <ProfileContext.Provider value={profile}>
      <AppShell role={profile.role === "admin" ? "admin" : "teacher"} onSignOut={signOut}>{children}</AppShell>
    </ProfileContext.Provider>
  );
}
