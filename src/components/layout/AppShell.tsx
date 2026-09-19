"use client";

import type { ReactNode } from "react";
import { DesktopNav } from "./DesktopNav";
import { MobileNav } from "./MobileNav";

type AppShellProps = {
  children: ReactNode;
  role: "teacher" | "admin";
  onSignOut: () => void;
};

export function AppShell({ children, role, onSignOut }: AppShellProps) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <DesktopNav role={role} onSignOut={onSignOut} />
      <div className="md:pl-64">
        <main className="min-h-screen pb-16 md:pb-0">{children}</main>
      </div>
      <MobileNav role={role} />
    </div>
  );
}
