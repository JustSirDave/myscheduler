import { prisma } from "@/lib/prisma";
import { calendarFetch, getAccount } from "@/lib/google";
import { watInstant, watDateString } from "@/lib/tz";
import type { GoogleAccount, PlannerItem } from "@/lib/generated/prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;

// Maps between our PlannerItem rows and Google Calendar events, and runs the
// two-way sync. Outbound: origin=Local items with a start time. Inbound: Google
// events become origin=GoogleCalendar TimeBlocks, upserted idempotently on the
// unique googleEventId.

interface GoogleEventDate {
  date?: string; // all-day: YYYY-MM-DD
  dateTime?: string; // timed: RFC3339
}

interface GoogleEvent {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  start?: GoogleEventDate;
  end?: GoogleEventDate;
}

/** Build the event body Google expects from a PlannerItem. */
function toEventBody(item: PlannerItem): Record<string, unknown> {
  const body: Record<string, unknown> = {
    summary: item.name,
    description: item.notes ?? undefined,
  };

  if (item.isAllDay && item.startAt) {
    // All-day events use WAT calendar dates. Google's end date is exclusive, so
    // add a day.
    const startDate = watDateString(item.startAt);
    const endBase = item.endAt ?? item.startAt;
    const endDate = watDateString(new Date(endBase.getTime() + DAY_MS));
    body.start = { date: startDate };
    body.end = { date: endDate };
  } else if (item.startAt) {
    const end = item.endAt ?? new Date(item.startAt.getTime() + 60 * 60 * 1000);
    body.start = { dateTime: item.startAt.toISOString() };
    body.end = { dateTime: end.toISOString() };
  }

  // A per-item lead time becomes a popup notification on the Google event.
  if (item.reminderMinutes != null) {
    body.reminders = {
      useDefault: false,
      overrides: [{ method: "popup", minutes: item.reminderMinutes }],
    };
  } else {
    body.reminders = { useDefault: true };
  }

  return body;
}

/** Parse a Google event's start/end into our fields. */
function fromEvent(ev: GoogleEvent): {
  startAt: Date | null;
  endAt: Date | null;
  isAllDay: boolean;
} {
  const startAllDay = ev.start?.date;
  if (startAllDay) {
    const [y, m, d] = startAllDay.split("-").map(Number);
    const start = watInstant(y, m - 1, d); // WAT midnight
    let end: Date | null = null;
    if (ev.end?.date) {
      const [ey, em, ed] = ev.end.date.split("-").map(Number);
      // Google all-day end is exclusive; step back one day for our inclusive model.
      end = watInstant(ey, em - 1, ed - 1);
    }
    return { startAt: start, endAt: end, isAllDay: true };
  }
  return {
    startAt: ev.start?.dateTime ? new Date(ev.start.dateTime) : null,
    endAt: ev.end?.dateTime ? new Date(ev.end.dateTime) : null,
    isAllDay: false,
  };
}

// ---------------------------------------------------------------------------
// Outbound: MyScheduler → Google
// ---------------------------------------------------------------------------

/**
 * Reconcile a single item with Google Calendar. Only a Reminder whose kind is
 * "Event" with a start time belongs on the calendar; everything else (phone
 * reminders, Task, Goal) is delivered to the phone or stays local. Keyed off
 * type/kind, not origin, so events synced *in* can also be edited/removed here
 * (true two-way). No-ops if not connected. Best-effort — the caller wraps in
 * try/catch so a Google outage never blocks a local save.
 *
 * - Event reminder + startAt: create (no googleEventId) or patch (has one)
 * - otherwise, but has a googleEventId: no longer a calendar item (retyped, or the
 *   kind/time changed) → delete the remote event and unlink.
 */
export async function syncItemOutbound(itemId: string): Promise<void> {
  const account = await getAccount();
  if (!account) return;

  const item = await prisma.plannerItem.findUnique({ where: { id: itemId } });
  if (!item) return;

  const cal = encodeURIComponent(account.calendarId);
  const belongsOnCalendar =
    item.type === "Reminder" && item.reminderKind === "Event" && !!item.startAt;

  if (!belongsOnCalendar) {
    if (item.googleEventId) {
      await calendarFetch(account, `/calendars/${cal}/events/${item.googleEventId}`, {
        method: "DELETE",
      });
      await prisma.plannerItem.update({
        where: { id: item.id },
        data: { googleEventId: null },
      });
    }
    return;
  }

  const body = toEventBody(item);

  if (item.googleEventId) {
    await calendarFetch(account, `/calendars/${cal}/events/${item.googleEventId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  } else {
    const created = (await calendarFetch(account, `/calendars/${cal}/events`, {
      method: "POST",
      body: JSON.stringify(body),
    })) as GoogleEvent | null;
    if (created?.id) {
      await prisma.plannerItem.update({
        where: { id: item.id },
        data: { googleEventId: created.id },
      });
    }
  }
}

/** Delete the remote event for an item that was removed locally. */
export async function deleteItemOutbound(googleEventId: string): Promise<void> {
  const account = await getAccount();
  if (!account) return;
  const cal = encodeURIComponent(account.calendarId);
  await calendarFetch(account, `/calendars/${cal}/events/${googleEventId}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Inbound: Google → MyScheduler
// ---------------------------------------------------------------------------

interface EventsListResponse {
  items?: GoogleEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

export interface PullResult {
  skipped?: string;
  created: number;
  updated: number;
  deleted: number;
}

/**
 * Pull events from Google into local PlannerItems. Incremental via the stored
 * syncToken when present; otherwise a windowed full sync (now-7d … now+60d).
 * Idempotent on googleEventId, so re-runs never duplicate.
 */
export async function pullEvents(): Promise<PullResult> {
  const account = await getAccount();
  if (!account) return { skipped: "not connected", created: 0, updated: 0, deleted: 0 };

  const cal = encodeURIComponent(account.calendarId);
  let created = 0;
  let updated = 0;
  let deleted = 0;
  let pageToken: string | undefined;
  let newSyncToken: string | undefined;

  // Build the base query: incremental if we have a syncToken, else a window.
  const baseParams = new URLSearchParams({ singleEvents: "true", maxResults: "250" });
  if (account.syncToken) {
    baseParams.set("syncToken", account.syncToken);
  } else {
    const now = Date.now();
    baseParams.set("timeMin", new Date(now - 7 * 864e5).toISOString());
    baseParams.set("timeMax", new Date(now + 60 * 864e5).toISOString());
  }

  do {
    const params = new URLSearchParams(baseParams);
    if (pageToken) params.set("pageToken", pageToken);

    let res: EventsListResponse | null;
    try {
      res = (await calendarFetch(
        account,
        `/calendars/${cal}/events?${params.toString()}`,
      )) as EventsListResponse | null;
    } catch (err) {
      // A 410 GONE means the syncToken expired — clear it and full-resync next run.
      if (err instanceof Error && err.message.includes(" 410 ")) {
        await prisma.googleAccount.update({
          where: { id: account.id },
          data: { syncToken: null },
        });
        return pullEvents();
      }
      throw err;
    }
    if (!res) break;

    for (const ev of res.items ?? []) {
      if (ev.status === "cancelled") {
        const del = await prisma.plannerItem.deleteMany({
          where: { googleEventId: ev.id, origin: "GoogleCalendar" },
        });
        deleted += del.count;
        continue;
      }
      const { startAt, endAt, isAllDay } = fromEvent(ev);
      if (!startAt) continue; // skip events with no usable start

      // Count genuinely new inbound events vs updates (an update includes our own
      // just-pushed events echoing back), so "Sync now" isn't misleading.
      const existing = await prisma.plannerItem.findUnique({
        where: { googleEventId: ev.id },
        select: { id: true },
      });

      await prisma.plannerItem.upsert({
        where: { googleEventId: ev.id },
        create: {
          name: ev.summary ?? "(no title)",
          type: "Reminder",
          reminderKind: "Event",
          origin: "GoogleCalendar",
          googleEventId: ev.id,
          notes: ev.description ?? null,
          startAt,
          endAt,
          isAllDay,
        },
        update: {
          name: ev.summary ?? "(no title)",
          notes: ev.description ?? null,
          startAt,
          endAt,
          isAllDay,
        },
      });

      if (existing) updated += 1;
      else created += 1;
    }

    pageToken = res.nextPageToken;
    if (res.nextSyncToken) newSyncToken = res.nextSyncToken;
  } while (pageToken);

  await prisma.googleAccount.update({
    where: { id: account.id },
    data: { lastSyncedAt: new Date(), syncToken: newSyncToken ?? account.syncToken },
  });

  return { created, updated, deleted };
}
