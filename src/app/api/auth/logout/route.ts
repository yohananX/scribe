import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFriendlyMessage } from "@/lib/errors";

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return NextResponse.json({ message: "Signed out" });
  } catch (error) {
    return NextResponse.json(
      { error: getFriendlyMessage(error) },
      { status: 500 }
    );
  }
}
