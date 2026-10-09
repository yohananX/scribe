import { NextRequest, NextResponse } from "next/server";
import { getFriendlyMessage } from "@/lib/errors";
import { linkInvitationIfAny } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getRateLimitHeaders, maybeCleanupRateLimit } from "@/lib/rate-limit";

type LoginBody = {
  mode?: "magic" | "password";
  email?: string;
  password?: string;
  next?: string;
};

function safeNext(value: unknown): string {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
    ? value
    : "/dashboard";
}

export async function POST(request: NextRequest) {
  maybeCleanupRateLimit();

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateLimitResult = rateLimit(`login:${ip}`, 10, 60_000); // 10 requests per minute

  const headers = getRateLimitHeaders(10, rateLimitResult);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please wait a minute and try again." },
      { status: 429, headers }
    );
  }

  try {
    const supabase = await createClient();
    let body: LoginBody;

    try {
      body = (await request.json()) as LoginBody;
    } catch {
      return NextResponse.json(
        { error: "Send a valid login request." },
        { status: 400, headers: { "Cache-Control": "no-store", ...headers } }
      );
    }

    if (body.mode && body.mode !== "magic" && body.mode !== "password") {
      return NextResponse.json(
        { error: "Choose a valid sign-in method." },
        { status: 400, headers: { "Cache-Control": "no-store", ...headers } }
      );
    }

    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return jsonError("Enter your email address.", 400, headers);
    }

    if (body.mode === "password") {
      return handlePasswordLogin(
        supabase,
        email,
        body.password ?? "",
        headers
      );
    }

    const next = safeNext(body.next);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${new URL(request.url).origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      return NextResponse.json(
        { error: getFriendlyMessage(error) },
        { status: 400, headers }
      );
    }

    return NextResponse.json(
      { message: "Magic link sent" },
      { status: 202, headers: { "Cache-Control": "no-store", ...headers } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: getFriendlyMessage(error) },
      { status: 500, headers: { "Cache-Control": "no-store", ...headers } }
    );
  }
}

async function handlePasswordLogin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  email: string,
  password: string,
  headers: Record<string, string>
) {
  if (!password) return jsonError("Enter your password.", 400, headers);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return jsonError(getFriendlyMessage(error), 401, headers);

  await linkInvitationIfAny(data.user);

  return NextResponse.json(
    { message: "Signed in" },
    { headers: { "Cache-Control": "no-store", ...headers } }
  );
}

function jsonError(error: string, status: 400 | 401, headers: Record<string, string>) {
  return NextResponse.json(
    { error },
    { status, headers: { "Cache-Control": "no-store", ...headers } }
  );
}
