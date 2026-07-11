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
