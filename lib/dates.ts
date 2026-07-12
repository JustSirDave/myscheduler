// Helpers for moving between DB DateTime values and HTML date/datetime-local
// inputs, all in the app's fixed timezone (WAT). See lib/tz.ts — we can't rely on
// the server process timezone (Vercel forces UTC), so everything is explicit.

import {
  APP_TZ,
  watInstant,
  watYear,
  watMonth,
  watDate,
  watHours,
  watMinutes,
} from "@/lib/tz";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Date → "YYYY-MM-DDTHH:mm" (WAT) for <input type="datetime-local">. */
export function toDateTimeInputValue(d: Date | null | undefined): string {
  if (!d) return "";
  return `${watYear(d)}-${pad(watMonth(d) + 1)}-${pad(watDate(d))}T${pad(
    watHours(d),
  )}:${pad(watMinutes(d))}`;
}

/** Date → "YYYY-MM-DD" (WAT) for <input type="date">. */
export function toDateInputValue(d: Date | null | undefined): string {
  if (!d) return "";
  return `${watYear(d)}-${pad(watMonth(d) + 1)}-${pad(watDate(d))}`;
}

/**
 * Parse a form value from a date or datetime-local input, interpreting it as WAT
 * wall-clock, into the correct UTC instant. Empty → null.
 */
export function parseDateInput(value: FormDataEntryValue | null): Date | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (s === "") return null;

  const dateTime = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(s);
  if (dateTime) {
    return watInstant(
      Number(dateTime[1]),
      Number(dateTime[2]) - 1,
      Number(dateTime[3]),
      Number(dateTime[4]),
      Number(dateTime[5]),
    );
  }

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (dateOnly) {
    return watInstant(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }

  return null;
}

/** Current month as "YYYY-MM" (WAT). */
export function currentMonthString(): string {
  const now = new Date();
  return `${watYear(now)}-${pad(watMonth(now) + 1)}`;
}

/** Half-open [start, end) range covering the given "YYYY-MM" month, in WAT. */
export function monthRange(month: string): { start: Date; end: Date } {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  const now = new Date();
  const year = m ? Number(m[1]) : watYear(now);
  const monthIndex = m ? Number(m[2]) - 1 : watMonth(now);
  return {
    start: watInstant(year, monthIndex, 1),
    end: watInstant(year, monthIndex + 1, 1),
  };
}

/** Format a Date for compact display in WAT, e.g. "11 Jul 2026, 14:30". */
export function formatDateTime(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toLocaleString("en-GB", {
    timeZone: APP_TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
