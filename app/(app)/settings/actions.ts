"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { disconnect } from "@/lib/google";
import { pullEvents, type PullResult } from "@/lib/gcal-sync";
import { sendPushToAll } from "@/lib/push";

export async function syncNow() {
  await requireSession();

  let result: PullResult;
  try {
    result = await pullEvents();
  } catch (e) {
    console.error("Sync now failed:", e);
    redirect("/settings?error=sync"); // returns never
  }

  revalidatePath("/settings");
  revalidatePath("/calendar");
  revalidatePath("/");

  if (result.skipped) redirect("/settings?error=notconnected");
  redirect(`/settings?synced=${result.created}`);
}

export async function disconnectGoogle() {
  await requireSession();
  await disconnect();
  revalidatePath("/settings");
  redirect("/settings?disconnected=1");
}

export async function sendTestPush() {
  await requireSession();
  const sent = await sendPushToAll({
    title: "MyScheduler",
    body: "Test notification — push is working 🎉",
    url: "/",
  });
  redirect(`/settings?pushtest=${sent}`);
}
