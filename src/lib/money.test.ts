import { describe, expect, it } from "vitest";

import { calculateLineItemTotals, formatEuros } from "./money";

const baseOptions = { discountPercent: 0, vatRatePercent: 25, reverseVatApplies: false };

describe("calculateLineItemTotals", () => {
  it("sums a single line item with no discount or VAT quirks", () => {
    const result = calculateLineItemTotals([{ quantity: 2, unitPriceCents: 5000 }], baseOptions);
    expect(result.subtotalCents).toBe(10000);
    expect(result.vatCents).toBe(2500);
    expect(result.totalCents).toBe(12500);
  });

  it("sums mixed labor and material line items", () => {
    const result = calculateLineItemTotals(
      [
        { quantity: 3, unitPriceCents: 4500 }, // labor: 13500
        { quantity: 1, unitPriceCents: 12000 }, // material: 12000
      ],
      baseOptions
    );
    expect(result.subtotalCents).toBe(25500);
  });

  it("applies a percentage discount before VAT", () => {
    const result = calculateLineItemTotals(
      [{ quantity: 1, unitPriceCents: 10000 }],
      { ...baseOptions, discountPercent: 10 }
    );
    expect(result.discountCents).toBe(1000);
    expect(result.vatCents).toBe(2250); // 25% of (10000 - 1000)
    expect(result.totalCents).toBe(11250);
  });

  it("zeroes VAT when reverse-charge VAT applies, regardless of the nominal rate", () => {
    const result = calculateLineItemTotals(
      [{ quantity: 1, unitPriceCents: 10000 }],
      { ...baseOptions, reverseVatApplies: true }
    );
    expect(result.vatCents).toBe(0);
    expect(result.totalCents).toBe(10000);
  });

  it("returns all zeros for an empty item list", () => {
    const result = calculateLineItemTotals([], baseOptions);
    expect(result).toEqual({ subtotalCents: 0, discountCents: 0, vatCents: 0, totalCents: 0 });
  });

  it("rounds fractional cents from non-integer quantities", () => {
    const result = calculateLineItemTotals([{ quantity: 1.5, unitPriceCents: 999 }], baseOptions);
    expect(result.subtotalCents).toBe(1499); // round(1498.5)
  });
});

describe("formatEuros", () => {
  it("formats cents as a Finnish-locale euro string", () => {
    // fi-FI currency formatting uses a non-breaking space (U+00A0) before the symbol.
    expect(formatEuros(12550)).toBe(`125,50 €`);
  });

  it("formats zero correctly", () => {
    expect(formatEuros(0)).toBe(`0,00 €`);
  });
});
