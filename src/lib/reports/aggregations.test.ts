import { describe, expect, it } from "vitest";

import { buildMonthlyRevenueExpense, sumByCategory } from "./aggregations";

describe("buildMonthlyRevenueExpense", () => {
  it("returns monthsBack buckets ending at the current month", () => {
    const now = new Date(2026, 6, 15); // July 2026
    const buckets = buildMonthlyRevenueExpense([], [], now, 6);
    expect(buckets).toHaveLength(6);
    expect(buckets[0].key).toBe("2026-02");
    expect(buckets[5].key).toBe("2026-07");
  });

  it("buckets a payment into the correct month", () => {
    const now = new Date(2026, 6, 15);
    const buckets = buildMonthlyRevenueExpense(
      [{ amountCents: 5000, paidAt: new Date(2026, 6, 1) }],
      [],
      now,
      6
    );
    const july = buckets.find((b) => b.key === "2026-07");
    expect(july?.revenueCents).toBe(5000);
  });

  it("excludes a payment older than the window", () => {
    const now = new Date(2026, 6, 15);
    const buckets = buildMonthlyRevenueExpense(
      [{ amountCents: 5000, paidAt: new Date(2025, 11, 1) }], // Dec 2025, 7 months back
      [],
      now,
      6
    );
    const total = buckets.reduce((sum, b) => sum + b.revenueCents, 0);
    expect(total).toBe(0);
  });

  it("handles a year boundary correctly", () => {
    const now = new Date(2026, 1, 10); // Feb 2026
    const buckets = buildMonthlyRevenueExpense(
      [{ amountCents: 1000, paidAt: new Date(2025, 11, 20) }], // Dec 2025
      [],
      now,
      6
    );
    const dec = buckets.find((b) => b.key === "2025-12");
    expect(dec?.revenueCents).toBe(1000);
  });

  it("computes profit as revenue minus expenses per bucket", () => {
    const now = new Date(2026, 6, 15);
    const buckets = buildMonthlyRevenueExpense(
      [{ amountCents: 10000, paidAt: new Date(2026, 6, 1) }],
      [{ amountCents: 4000, incurredAt: new Date(2026, 6, 5) }],
      now,
      6
    );
    const july = buckets.find((b) => b.key === "2026-07");
    expect(july?.profitCents).toBe(6000);
  });
});

describe("sumByCategory", () => {
  it("sums amounts grouped by category", () => {
    const result = sumByCategory([
      { category: "MATERIAL", amountCents: 1000 },
      { category: "MATERIAL", amountCents: 500 },
      { category: "FUEL", amountCents: 2000 },
    ]);
    expect(result).toEqual({ MATERIAL: 1500, FUEL: 2000 });
  });

  it("returns an empty object for no expenses", () => {
    expect(sumByCategory([])).toEqual({});
  });
});
