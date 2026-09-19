import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function TeachersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Teachers</h1>
      <p className="mt-2 text-neutral-600">
        Invite and manage teachers in your organisation. Coming next.
      </p>
    </div>
  );
}
