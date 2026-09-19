import { NextRequest, NextResponse } from "next/server";
import { getFriendlyMessage } from "@/lib/errors";
import { ensureProfileRow, linkInvitationIfAny } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

type LoginBody = {
  mode?: "magic" | "password";
  email?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = (await request.json()) as LoginBody;
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Enter your email address." }, { status: 400 });
    }

    if (body.mode === "password") {
      return handlePasswordLogin(supabase, email, body.password ?? "");
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${new URL(request.url).origin}/auth/callback`,
      },
    });

    if (error) {
      return NextResponse.json(
        { error: getFriendlyMessage(error) },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "Magic link sent" });
  } catch (error) {
    return NextResponse.json(
      { error: getFriendlyMessage(error) },
      { status: 500 }
    );
  }
}

async function handlePasswordLogin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  email: string,
  password: string
) {
  if (!password) {
    return NextResponse.json({ error: "Enter your password." }, { status: 400 });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      return handleAccountCreation(supabase, email, password);
    }

    return NextResponse.json({ error: getFriendlyMessage(error) }, { status: 400 });
  }

  await ensureProfileRow(data.user);
  await linkInvitationIfAny(data.user);

  return NextResponse.json({ message: "Signed in" });
}

async function handleAccountCreation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  email: string,
  password: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return NextResponse.json(
      { error: getFriendlyMessage(error) },
      { status: 400 }
    );
  }

  if (data.session) {
    if (!data.user) {
      return NextResponse.json({ message: "Signed in" });
    }

    await ensureProfileRow(data.user);
    await linkInvitationIfAny(data.user);
    return NextResponse.json({ message: "Signed in" });
  }

  return NextResponse.json({
    message: "Check your email to confirm your account.",
  });
}