"use client";

import { useActionState } from "react";
import { inviteTeacher, type ActionState } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const initialState: ActionState = {};

export function InviteTeacherForm() {
  const [state, formAction, pending] = useActionState(
    inviteTeacher,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            id="inviteEmail"
            name="email"
            label="Teacher email"
            type="email"
            placeholder="teacher@school.edu"
            error={state.errors?.email?.[0]}
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Inviting..." : "Invite teacher"}
        </Button>
      </div>
      {state.message && (
        <p
          aria-live="polite"
          className={`text-sm ${
            state.success ? "text-success-600" : "text-error-600"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}