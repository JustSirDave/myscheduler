import { NextResponse, type NextRequest } from "next/server";
import { hasValidSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// Store (or update) a Web Push subscription for this browser/device.
export async function POST(request: NextRequest) {
  if (!(await hasValidSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const sub = body?.subscription;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ error: "invalid subscription" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    update: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });

  return NextResponse.json({ ok: true });
}

// Remove a subscription (device turned notifications off).
export async function DELETE(request: NextRequest) {
  if (!(await hasValidSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const endpoint = body?.endpoint;
  if (typeof endpoint === "string") {
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }
  return NextResponse.json({ ok: true });
}
