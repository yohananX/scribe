import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
export default function AdminLayout({ children }: { children: React.ReactNode }) { return <AuthenticatedShell>{children}</AuthenticatedShell>; }
