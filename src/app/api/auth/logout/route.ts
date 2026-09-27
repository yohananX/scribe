import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFriendlyMessage } from "@/lib/errors";

export async function POST() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return NextResponse.json(
        { error: getFriendlyMessage(error) },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { message: "Signed out" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: getFriendlyMessage(error) },
      { status: 500 }
    );
  }
}
