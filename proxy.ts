import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

// Next 16 renamed the `middleware` convention to `proxy`. This gates every
// matched route behind a valid session cookie and bounces everyone else to
// /login.
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const isAuthenticated = await verifySessionToken(token);

  if (!isAuthenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except the login page, Next internals, and static assets.
  // The login server action posts back to /login, so it stays reachable while
  // logged out (a matcher that excludes a path also skips Server Functions on
  // that path).
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|manifest.webmanifest).*)"],
};
