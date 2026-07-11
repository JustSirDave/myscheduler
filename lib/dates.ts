// Helpers for moving between DB DateTime values and HTML date/datetime-local
// inputs. Single-user app, so everything is treated in the browser's local
// timezone — no cross-user timezone handling needed.

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Date → "YYYY-MM-DDTHH:mm" for <input type="datetime-local">. */
export function toDateTimeInputValue(d: Date | null | undefined): string {
  if (!d) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/** Date → "YYYY-MM-DD" for <input type="date">. */
export function toDateInputValue(d: Date | null | undefined): string {
  if (!d) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Parse a form value from a date or datetime-local input into a Date (local),
 * or null when empty. A bare "YYYY-MM-DD" becomes local midnight (not UTC), so
 * the day never shifts on display.
 */
export function parseDateInput(value: FormDataEntryValue | null): Date | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (s === "") return null;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Current month as "YYYY-MM". */
export function currentMonthString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

/** Half-open [start, end) local-time range covering the given "YYYY-MM" month. */
export function monthRange(month: string): { start: Date; end: Date } {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  const now = new Date();
  const year = m ? Number(m[1]) : now.getFullYear();
  const monthIndex = m ? Number(m[2]) - 1 : now.getMonth();
  return {
    start: new Date(year, monthIndex, 1),
    end: new Date(year, monthIndex + 1, 1),
  };
}

/** Format a Date for compact display, e.g. "Jul 11, 2026, 14:30" or "" when null. */
export function formatDateTime(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
