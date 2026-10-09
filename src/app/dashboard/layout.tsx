import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
