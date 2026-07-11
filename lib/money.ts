// Money is stored as kobo (naira × 100) in integer columns to avoid float
// rounding. Users type naira; we convert at the boundary.

/**
 * Parse a naira input string (e.g. "1500.50", "1,500.5") into integer kobo.
 * Throws on empty/non-finite/negative input so callers can reject bad forms.
 */
export function nairaToKobo(input: string): number {
  const cleaned = input.replace(/[,\s₦]/g, "").trim();
  const naira = Number(cleaned);
  if (cleaned === "" || !Number.isFinite(naira) || naira < 0) {
    throw new Error(`Invalid naira amount: ${JSON.stringify(input)}`);
  }
  return Math.round(naira * 100);
}

/** Format integer kobo as a naira string, e.g. 150050 → "₦1,500.50". */
export function formatKobo(kobo: number): string {
  const naira = kobo / 100;
  return `₦${naira.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Kobo as a plain decimal string for a number input's value, e.g. 150050 → "1500.50". */
export function koboToNairaInput(kobo: number): string {
  return (kobo / 100).toFixed(2);
}
