import { NextRequest, NextResponse } from "next/server";
import { getFriendlyMessage } from "@/lib/errors";
import { linkInvitationIfAny } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

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
  try {
    const supabase = await createClient();
    let body: LoginBody;

    try {
      body = (await request.json()) as LoginBody;
    } catch {
      return NextResponse.json(
        { error: "Send a valid login request." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (body.mode && body.mode !== "magic" && body.mode !== "password") {
      return NextResponse.json(
        { error: "Choose a valid sign-in method." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return jsonError("Enter your email address.", 400);
    }

    if (body.mode === "password") {
      return handlePasswordLogin(
        supabase,
        email,
        body.password ?? ""
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
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Magic link sent" },
      { status: 202, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: getFriendlyMessage(error) },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

async function handlePasswordLogin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  email: string,
  password: string
) {
  if (!password) return jsonError("Enter your password.", 400);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return jsonError(getFriendlyMessage(error), 401);

  await linkInvitationIfAny(data.user);

  return NextResponse.json(
    { message: "Signed in" },
    { headers: { "Cache-Control": "no-store" } }
  );
}

function jsonError(error: string, status: 400 | 401) {
  return NextResponse.json(
    { error },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}
