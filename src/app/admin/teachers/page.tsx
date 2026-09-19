import { redirect } from "next/navigation";
import { revokeInvitation, removeTeacher } from "@/app/actions";
import { InviteTeacherForm } from "@/components/admin/InviteTeacherForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { Invitation, Profile } from "@/types/database";

export default async function TeachersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(supabase, user.id);

  if (!profile?.organisation_id || profile.role !== "admin") {
    redirect("/dashboard");
  }

  const { data: invitations } = await supabase
    .from("invitations")
    .select("*")
    .eq("organisation_id", profile.organisation_id)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const { data: teachers } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .eq("organisation_id", profile.organisation_id)
    .eq("role", "teacher")
    .order("email", { ascending: true });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Teachers</h1>
      <p className="mt-2 text-neutral-600">
        Invite teachers so they can join your organisation and create exams.
      </p>

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-semibold text-neutral-900">Invite a teacher</h2>
        <p className="mt-1 text-sm text-neutral-600">
          They&apos;ll receive an email and can join with a magic link or a
          password once their invitation is accepted.
        </p>
        <div className="mt-4">
          <InviteTeacherForm />
        </div>
      </Card>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-900">
          Pending invitations
        </h2>
        {!invitations || invitations.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No pending invitations"
              description="Invitations you send will appear here until the teacher joins."
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {(invitations as Invitation[]).map((invitation) => (
              <li key={invitation.id}>
                <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium text-neutral-900">
                      {invitation.email}
                    </p>
                    <Badge variant="warning">Pending</Badge>
                  </div>
                  <form action={revokeInvitation}>
                    <input type="hidden" name="id" value={invitation.id} />
                    <button
                      type="submit"
                      className="self-start text-sm font-medium text-error-600 hover:text-error-700"
                    >
                      Revoke
                    </button>
                  </form>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-900">Teachers</h2>
        {!teachers || teachers.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No teachers yet"
              description="Once teachers accept their invitations they will appear here."
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {(teachers as Profile[]).map((teacher) => (
              <li key={teacher.id}>
                <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {teacher.email}
                    </p>
                    {teacher.full_name && (
                      <p className="text-sm text-neutral-600">{teacher.full_name}</p>
                    )}
                  </div>
                  <form action={removeTeacher}>
                    <input type="hidden" name="id" value={teacher.id} />
                    <button
                      type="submit"
                      className="self-start text-sm font-medium text-error-600 hover:text-error-700"
                    >
                      Remove
                    </button>
                  </form>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}