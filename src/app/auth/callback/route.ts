import { NextRequest, NextResponse } from "next/server";
import { linkInvitationIfAny } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next");
  const next =
    requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/dashboard";

  // Supabase may redirect here with ?error=... when the link is expired/used.
  const providerError =
    requestUrl.searchParams.get("error_description") ||
    requestUrl.searchParams.get("error");

  if (providerError && !code) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(providerError)}`, request.url)
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await linkInvitationIfAny(user);

        // New users without an organisation belong in onboarding,
        // even if the link requested /dashboard.
        if (next === "/dashboard") {
          const { data: profile } = await supabase
            .from("profiles")
            .select("organisation_id")
            .eq("id", user.id)
            .single();

          if (!profile?.organisation_id) {
            return NextResponse.redirect(new URL("/onboarding", request.url));
          }
        }
      }

      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=invalid_link", request.url));
}
