"use client";

import { useActionState } from "react";
import { createOrganisation, type ActionState } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const initialState: ActionState = {};

export function OrganisationForm() {
  const [state, formAction, pending] = useActionState(
    createOrganisation,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Input
        id="name"
        name="name"
        label="School name"
        placeholder="Springfield High School"
        required
        error={state.errors?.name?.[0]}
      />
      <Input
        id="contactEmail"
        name="contactEmail"
        label="Contact email"
        type="email"
        placeholder="exams@school.edu"
        hint="Optional. Used for official exam correspondence."
        error={state.errors?.contactEmail?.[0]}
      />
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
      <Button type="submit" disabled={pending} className="mt-2 w-full">
        {pending ? "Creating..." : "Create organisation"}
      </Button>
    </form>
  );
}