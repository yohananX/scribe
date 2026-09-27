import { NextRequest, NextResponse } from "next/server";
import { getFriendlyMessage } from "@/lib/errors";
import { getProfile, linkInvitationIfAny } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

type SignupBody = {
  email?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    let body: SignupBody;

    try {
      body = (await request.json()) as SignupBody;
    } catch {
      return NextResponse.json(
        { error: "Send a valid signup request." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!email) {
      return NextResponse.json(
        { error: "Enter your email address." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const origin = new URL(request.url).origin;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
      },
    });

    if (error) {
      return NextResponse.json(
        { error: getFriendlyMessage(error) },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    // If email confirmation is disabled, we get a session immediately.
    if (data.session && data.user) {
      await linkInvitationIfAny(data.user);
      const profile = await getProfile(supabase, data.user.id);
      const redirect = profile?.organisation_id ? "/dashboard" : "/onboarding";
      return NextResponse.json(
        { message: "Signed up", redirect },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Email confirmation required — user must click the link.
    return NextResponse.json(
      {
        message:
          "Check your email to confirm your account, then continue to onboarding.",
      },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: getFriendlyMessage(error) },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
