import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

export async function updateSession() {
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    }
  );

  await supabase.auth.getSession();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
}
