"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getFriendlyMessage } from "@/lib/errors";
import { env } from "@/lib/env";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export type ActionState = {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

const organisationSchema = z.object({
  name: z.string().trim().min(2, "Enter the name of your school.").max(120),
  contactEmail: z
    .email("Enter a valid email address.")
    .optional()
    .or(z.literal("")),
});

const inviteSchema = z.object({
  email: z.email("Enter a valid email address."),
});

async function requireAdmin() {
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

  return { supabase, profile, user };
}

async function sendInviteEmail(email: string) {
  try {
    const admin = createSupabaseClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { error } = await admin.auth.admin.inviteUserByEmail(email);

    if (error) {
      console.error("Failed to send invite email", error.message);
    }
  } catch (error) {
    console.error("Failed to send invite email", error);
  }
}

export async function createOrganisation(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = organisationSchema.safeParse({
    name: formData.get("name"),
    contactEmail: formData.get("contactEmail") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(supabase, user.id);

  if (profile?.organisation_id) {
    redirect("/dashboard");
  }

  try {
    const { data: organisation, error: organisationError } = await supabase
      .from("organisations")
      .insert({
        name: parsed.data.name,
        contact_email: parsed.data.contactEmail || null,
      })
      .select("id")
      .single();

    if (organisationError) {
      throw organisationError;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ organisation_id: organisation.id, role: "admin" })
      .eq("id", user.id);

    if (profileError) {
      throw profileError;
    }
  } catch (error) {
    return { message: getFriendlyMessage(error) };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function inviteTeacher(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, profile } = await requireAdmin();
  const email = parsed.data.email.toLowerCase();

  const { data: existing } = await supabase
    .from("invitations")
    .select("id")
    .eq("organisation_id", profile.organisation_id)
    .eq("email", email)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return { message: "This teacher has already been invited." };
  }

  const { data: member } = await supabase
    .from("profiles")
    .select("id")
    .eq("organisation_id", profile.organisation_id)
    .eq("email", email)
    .maybeSingle();

  if (member) {
    return { message: "This teacher is already part of your organisation." };
  }

  const { error } = await supabase.from("invitations").insert({
    organisation_id: profile.organisation_id,
    email,
    created_by: profile.id,
  });

  if (error) {
    return { message: getFriendlyMessage(error) };
  }

  await sendInviteEmail(email);

  revalidatePath("/admin/teachers");
  return { success: true, message: `Invitation sent to ${email}.` };
}

export async function revokeInvitation(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = formData.get("id");

  if (typeof id !== "string") {
    return;
  }

  await supabase
    .from("invitations")
    .update({ status: "revoked" })
    .eq("id", id);

  revalidatePath("/admin/teachers");
}

export async function removeTeacher(formData: FormData) {
  const { supabase, profile } = await requireAdmin();
  const id = formData.get("id");

  if (typeof id !== "string") {
    return;
  }

  const { data: target } = await supabase
    .from("profiles")
    .select("role, organisation_id")
    .eq("id", id)
    .single();

  if (
    !target ||
    target.role !== "teacher" ||
    target.organisation_id !== profile.organisation_id
  ) {
    return;
  }

  await supabase.from("profiles").update({ organisation_id: null }).eq("id", id);

  revalidatePath("/admin/teachers");
}