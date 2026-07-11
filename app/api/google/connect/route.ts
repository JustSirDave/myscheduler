import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { getAuthUrl, isConfigured } from "@/lib/google";

export async function GET(request: NextRequest) {
  await requireSession();

  if (!isConfigured()) {
    return NextResponse.redirect(new URL("/settings?error=notconfigured", request.url));
  }

  return NextResponse.redirect(getAuthUrl(request.nextUrl.origin));
}
