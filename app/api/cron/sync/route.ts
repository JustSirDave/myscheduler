import { NextResponse, type NextRequest } from "next/server";
import { pullEvents } from "@/lib/gcal-sync";

// Called by Vercel Cron (server-to-server, no session cookie). Protected by the
// CRON_SECRET that Vercel injects as a Bearer token. Excluded from the proxy in
// proxy.ts so it isn't bounced to /login.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await pullEvents();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("Cron sync failed:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "sync failed" },
      { status: 500 },
    );
  }
}
