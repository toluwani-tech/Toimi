import { describe, expect, it } from "vitest";

import { quoteFormSchema } from "./schemas";

const validItem = { type: "LABOR" as const, description: "Asennustyö", quantity: 2, unitPriceCents: 5000 };

describe("quoteFormSchema", () => {
  const base = {
    customerId: "cust_1",
    vatRatePercent: 25,
    discountPercent: 0,
    reverseVatApplies: false,
    items: [validItem],
  };

  it("accepts a minimal valid quote", () => {
    expect(quoteFormSchema.safeParse(base).success).toBe(true);
  });

  it("requires a customer", () => {
    const result = quoteFormSchema.safeParse({ ...base, customerId: "" });
    expect(result.success).toBe(false);
  });

  it("requires at least one line item", () => {
    const result = quoteFormSchema.safeParse({ ...base, items: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a line item with zero quantity", () => {
    const result = quoteFormSchema.safeParse({
      ...base,
      items: [{ ...validItem, quantity: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative unit price", () => {
    const result = quoteFormSchema.safeParse({
      ...base,
      items: [{ ...validItem, unitPriceCents: -100 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a line item with an empty description", () => {
    const result = quoteFormSchema.safeParse({
      ...base,
      items: [{ ...validItem, description: "  " }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a VAT rate over 100", () => {
    const result = quoteFormSchema.safeParse({ ...base, vatRatePercent: 150 });
    expect(result.success).toBe(false);
  });

  it("accepts multiple mixed labor/material line items", () => {
    const result = quoteFormSchema.safeParse({
      ...base,
      items: [validItem, { type: "MATERIAL" as const, description: "Kaapeli", quantity: 10, unitPriceCents: 250 }],
    });
    expect(result.success).toBe(true);
  });

  it("treats an empty title/notes as absent, not invalid", () => {
    const result = quoteFormSchema.safeParse({ ...base, title: "", notes: "" });
    expect(result.success).toBe(true);
  });
});
