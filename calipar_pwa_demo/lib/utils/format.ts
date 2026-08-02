/**
 * Presentation of derived numbers. Derivations carry counts; rounding happens
 * here and nowhere else — see `docs/adr/0003-rates-carry-their-counts.md`.
 */

const currencyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatCurrency(cents: number): string {
  return currencyFormat.format(cents / 100);
}

/** The exact proportion, or null when there is no denominator to divide by. */
export function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

/**
 * A rate as a percentage. One decimal by default; readiness passes 0, because
 * it is a count of six and a fractional percent would imply precision that
 * scale does not have. A rate with no denominator renders as an em dash — it
 * does not exist, and it is not zero.
 */
export function formatPercent(
  numerator: number,
  denominator: number,
  fractionDigits = 1,
): string {
  const value = ratio(numerator, denominator);
  return value === null ? "—" : `${(value * 100).toFixed(fractionDigits)}%`;
}

/** A width for a meter or bar, clamped to the track. */
export function percentWidth(numerator: number, denominator: number): string {
  const value = ratio(numerator, denominator) ?? 0;
  return `${Math.min(100, Math.max(0, value * 100))}%`;
}
