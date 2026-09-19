import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function NewExamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900">New Exam</h1>
      <p className="mt-2 text-neutral-600">
        Capture handwritten pages and generate an exam. Coming next.
      </p>
    </div>
  );
}
