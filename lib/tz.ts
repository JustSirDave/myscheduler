// The app operates in a single fixed timezone: WAT (Africa/Lagos, UTC+1, no DST).
// Vercel reserves the TZ env var and runs in UTC, so we can't set the process
// timezone — instead every "wall-clock" operation goes through these helpers,
// which are correct no matter what timezone the server process runs in.
//
// Trick: WAT wall-clock == UTC wall-clock of (instant + 1h). So we read WAT
// fields via getUTC* on a +1h-shifted Date, and build a UTC instant from WAT
// parts by subtracting 1h from Date.UTC(...).

export const APP_TZ = "Africa/Lagos";
const OFFSET_MS = 60 * 60 * 1000; // UTC+1

/** A Date whose UTC fields equal the WAT wall-clock of `d`. Read with getUTC*. */
function watShift(d: Date): Date {
  return new Date(d.getTime() + OFFSET_MS);
}

/** The real UTC instant for the given WAT wall-clock components. */
export function watInstant(
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
): Date {
  return new Date(Date.UTC(year, month, day, hours, minutes) - OFFSET_MS);
}

export const watYear = (d: Date): number => watShift(d).getUTCFullYear();
export const watMonth = (d: Date): number => watShift(d).getUTCMonth();
export const watDate = (d: Date): number => watShift(d).getUTCDate();
export const watDay = (d: Date): number => watShift(d).getUTCDay(); // 0=Sun
export const watHours = (d: Date): number => watShift(d).getUTCHours();
export const watMinutes = (d: Date): number => watShift(d).getUTCMinutes();

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Date → "YYYY-MM-DD" in WAT. */
export function watDateString(d: Date): string {
  return `${watYear(d)}-${pad(watMonth(d) + 1)}-${pad(watDate(d))}`;
}
