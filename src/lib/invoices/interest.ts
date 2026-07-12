const DEFAULT_ANNUAL_RATE_PERCENT = 11;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Estimated statutory late-fee interest (viivästyskorko). The real Finnish default rate
 * (reference rate + margin) changes twice yearly, so this is a fixed, documented
 * approximation, not a live-fetched figure — shown as an estimate, never auto-applied to
 * an invoice's balance due.
 */
export function calculateLateFeeInterest(
  remainingCents: number,
  dueDate: Date,
  now: Date = new Date(),
  annualRatePercent: number = DEFAULT_ANNUAL_RATE_PERCENT
): number {
  if (remainingCents <= 0) return 0;

  const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / MS_PER_DAY);
  if (daysOverdue <= 0) return 0;

  return Math.round(remainingCents * (annualRatePercent / 100) * (daysOverdue / 365));
}
