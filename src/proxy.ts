import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);

  const isAuthPage = request.nextUrl.pathname === "/login";
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/exams") ||
    request.nextUrl.pathname.startsWith("/onboarding");

  if (isProtectedRoute && !userId) {
    return redirectWithSession("/login", request, response);
  }

  if (isAuthPage && userId) {
    return redirectWithSession("/dashboard", request, response);
  }

  return response;
}

function redirectWithSession(
  path: string,
  request: NextRequest,
  sessionResponse: NextResponse
) {
  const response = NextResponse.redirect(new URL(path, request.url));
  sessionResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|docs).*)"],
};
