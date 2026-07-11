// Pure date-math helpers for building calendar grids. Everything is local-time,
// single-user. Week starts on Monday.

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Monday-based start of the week containing d. */
export function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // days since Monday
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
  const firstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  const gridStart = startOfWeek(firstOfMonth);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

/** Parse a "YYYY-MM-DD" param to a local Date, falling back to today. */
export function parseDateParam(value: string | undefined): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!m) return startOfDay(new Date());
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Date → "YYYY-MM-DD" for building nav links. */
export function toDateParam(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Minutes since local midnight for a Date (used to position timed items). */
export function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}
