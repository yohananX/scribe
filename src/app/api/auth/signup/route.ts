import { NextRequest, NextResponse } from "next/server";
import { getFriendlyMessage } from "@/lib/errors";
import { getProfile, linkInvitationIfAny } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getRateLimitHeaders, maybeCleanupRateLimit } from "@/lib/rate-limit";

type SignupBody = {
  email?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  maybeCleanupRateLimit();

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateLimitResult = rateLimit(`signup:${ip}`, 5, 60_000); // 5 requests per minute

  const headers = getRateLimitHeaders(5, rateLimitResult);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please wait a minute and try again." },
      { status: 429, headers }
    );
  }

  try {
    const supabase = await createClient();
    let body: SignupBody;

    try {
      body = (await request.json()) as SignupBody;
    } catch {
      return NextResponse.json(
        { error: "Send a valid signup request." },
        { status: 400, headers: { "Cache-Control": "no-store", ...headers } }
      );
    }

    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!email) {
      return NextResponse.json(
        { error: "Enter your email address." },
        { status: 400, headers: { "Cache-Control": "no-store", ...headers } }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400, headers: { "Cache-Control": "no-store", ...headers } }
      );
    }

    const origin = new URL(request.url).origin;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      return NextResponse.json(
        { error: getFriendlyMessage(error) },
        { status: 400, headers: { "Cache-Control": "no-store", ...headers } }
      );
    }

    // If email confirmation is disabled, we get a session immediately.
    if (data.session && data.user) {
      await linkInvitationIfAny(data.user);
      const profile = await getProfile(supabase, data.user.id);
      const redirect = profile?.organisation_id ? "/dashboard" : "/onboarding";
      return NextResponse.json(
        { message: "Signed up", redirect },
        { headers: { "Cache-Control": "no-store", ...headers } }
      );
    }

    // Email confirmation required — user must click the link.
    return NextResponse.json(
      {
        message:
          "Check your email to confirm your account, then continue to onboarding.",
      },
      { status: 201, headers: { "Cache-Control": "no-store", ...headers } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: getFriendlyMessage(error) },
      { status: 500, headers: { "Cache-Control": "no-store", ...headers } }
    );
  }
}
