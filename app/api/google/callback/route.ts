import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { exchangeCodeAndStore } from "@/lib/google";
import { pullEvents } from "@/lib/gcal-sync";

export async function GET(request: NextRequest) {
  await requireSession();

  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/settings?error=oauth", request.url));
  }

  try {
    await exchangeCodeAndStore(code, request.nextUrl.origin);
    // Kick off an initial pull so the calendar is populated immediately.
    await pullEvents();
  } catch (e) {
    console.error("Google callback failed:", e);
    return NextResponse.redirect(new URL("/settings?error=exchange", request.url));
  }

  return NextResponse.redirect(new URL("/settings?connected=1", request.url));
}
