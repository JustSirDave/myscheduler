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
  // Run on everything except the login page, API routes, Next internals, and
  // static assets. `api` is excluded so the cookieless Vercel Cron call to
  // /api/cron/sync (and the Google OAuth callback) isn't bounced to /login —
  // those route handlers self-protect (session for connect/callback,
  // CRON_SECRET for cron). The login server action also posts back to /login,
  // so it stays reachable while logged out.
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico|manifest.webmanifest).*)"],
};
