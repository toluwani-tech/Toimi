export type MonthBucket = {
  key: string;
  label: string;
  revenueCents: number;
  expenseCents: number;
  profitCents: number;
};

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function buildMonthlyRevenueExpense(
  payments: { amountCents: number; paidAt: Date }[],
  expenses: { amountCents: number; incurredAt: Date }[],
  now: Date,
  monthsBack = 6
): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: monthKey(d),
      label: new Intl.DateTimeFormat("fi-FI", { month: "short" }).format(d),
      revenueCents: 0,
      expenseCents: 0,
      profitCents: 0,
    });
  }

  const bucketIndex = new Map(buckets.map((bucket, index) => [bucket.key, index]));

  for (const payment of payments) {
    const index = bucketIndex.get(monthKey(payment.paidAt));
    if (index !== undefined) buckets[index].revenueCents += payment.amountCents;
  }
  for (const expense of expenses) {
    const index = bucketIndex.get(monthKey(expense.incurredAt));
    if (index !== undefined) buckets[index].expenseCents += expense.amountCents;
  }
  for (const bucket of buckets) {
    bucket.profitCents = bucket.revenueCents - bucket.expenseCents;
  }

  return buckets;
}

export function sumByCategory<T extends string>(
  expenses: { category: T; amountCents: number }[]
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const expense of expenses) {
    result[expense.category] = (result[expense.category] ?? 0) + expense.amountCents;
  }
  return result;
}
