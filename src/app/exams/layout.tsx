import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
export default function ExamsLayout({ children }: { children: React.ReactNode }) { return <AuthenticatedShell>{children}</AuthenticatedShell>; }
