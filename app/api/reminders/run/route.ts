import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToAll } from "@/lib/push";

// Fires due phone reminders/alarms as Web Push. Meant to be hit every minute by a
// free external cron (Vercel's own cron is daily-only). Guarded by CRON_SECRET,
// accepted as a Bearer header or ?key= (cron-job.org can send either).
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const key = request.nextUrl.searchParams.get("key");
    if (auth !== `Bearer ${secret}` && key !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  // Don't fire items whose time is more than an hour stale (avoid a burst of old
  // notifications if the cron was down).
  const staleFloor = new Date(now.getTime() - 60 * 60 * 1000);

  const candidates = await prisma.plannerItem.findMany({
    where: {
      notifiedAt: null,
      startAt: { gte: staleFloor },
      type: "Reminder",
      reminderKind: { not: "Event" }, // Event reminders go to Google, not the phone
    },
    select: {
      id: true,
      name: true,
      startAt: true,
      reminderMinutes: true,
    },
  });

  let fired = 0;
  for (const item of candidates) {
    if (!item.startAt) continue;
    const fireAt = item.startAt.getTime() - (item.reminderMinutes ?? 0) * 60_000;
    if (fireAt > now.getTime()) continue; // not due yet

    const sent = await sendPushToAll({
      title: "🔔 Reminder",
      body: item.name,
      url: "/planner",
    });
    // Only mark as notified if it actually reached a device — otherwise leave it
    // due so it fires once a device subscribes (until it goes stale).
    if (sent > 0) {
      await prisma.plannerItem.update({ where: { id: item.id }, data: { notifiedAt: now } });
      fired += 1;
    }
  }

  return NextResponse.json({ ok: true, checked: candidates.length, fired });
}
