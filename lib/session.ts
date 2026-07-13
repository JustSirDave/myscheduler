import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

// Server-side guard for Server Actions and server components. The proxy already
// gates page navigations, but Server Actions are reachable by direct POST, so
// every mutating action must re-check the session itself (per Next.js docs).
//
// Lives separately from lib/auth.ts so that module stays free of next/headers
// imports — the proxy imports lib/auth and must not pull server-only code in.
export async function requireSession(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySessionToken(token))) {
    redirect("/login");
  }
}

// Non-redirecting session check for fetch-called API routes, so an unauthenticated
// request gets a clean 401 instead of a 307 the client fetch would silently follow
// to /login (and mistake for success).
export async function hasValidSession(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}
