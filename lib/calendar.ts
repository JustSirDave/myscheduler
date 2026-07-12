// Pure date-math helpers for building calendar grids, all in the app's fixed
// timezone (WAT). Server-local Date methods are avoided — see lib/tz.ts — because
// Vercel runs in UTC. Week starts on Monday.

import { watInstant, watYear, watMonth, watDate, watDay, watHours, watMinutes } from "@/lib/tz";

const DAY_MS = 24 * 60 * 60 * 1000;

/** WAT midnight of the day containing d, as a UTC instant. */
export function startOfDay(d: Date): Date {
  return watInstant(watYear(d), watMonth(d), watDate(d));
}

/** Add n whole days. WAT has no DST, so a fixed 24h step preserves wall-clock. */
export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

export function addMonths(d: Date, n: number): Date {
  return watInstant(watYear(d), watMonth(d) + n, watDate(d), watHours(d), watMinutes(d));
}

export function isSameDay(a: Date, b: Date): boolean {
  return watYear(a) === watYear(b) && watMonth(a) === watMonth(b) && watDate(a) === watDate(b);
}

/** Monday-based WAT start of the week containing d. */
export function startOfWeek(d: Date): Date {
  const diff = (watDay(d) + 6) % 7; // days since Monday
  return addDays(startOfDay(d), -diff);
}

/** The 7 days (Mon..Sun) of the week containing d. */
export function weekDays(d: Date): Date[] {
  const start = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/**
 * The 6×7 = 42 days that fill a month grid: leading days from the previous
 * month, the whole month, and trailing days from the next month.
 */
export function monthGridDays(d: Date): Date[] {
  const firstOfMonth = watInstant(watYear(d), watMonth(d), 1);
  const gridStart = startOfWeek(firstOfMonth);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

/** Parse a "YYYY-MM-DD" param to WAT midnight, falling back to today. */
export function parseDateParam(value: string | undefined): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!m) return startOfDay(new Date());
  return watInstant(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Date → "YYYY-MM-DD" (WAT) for building nav links. */
export function toDateParam(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${watYear(d)}-${pad(watMonth(d) + 1)}-${pad(watDate(d))}`;
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Minutes since WAT midnight for a Date (used to position timed items). */
export function minutesSinceMidnight(d: Date): number {
  return watHours(d) * 60 + watMinutes(d);
}
