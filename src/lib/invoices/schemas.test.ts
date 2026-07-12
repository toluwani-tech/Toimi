import { describe, expect, it } from "vitest";

import { creditNoteFormSchema, invoiceFormSchema, paymentFormSchema } from "./schemas";

const validItem = { type: "LABOR" as const, description: "Asennustyö", quantity: 2, unitPriceCents: 5000 };

describe("invoiceFormSchema", () => {
  const base = {
    customerId: "cust_1",
    vatRatePercent: 25,
    discountPercent: 0,
    reverseVatApplies: false,
    items: [validItem],
  };

  it("accepts a minimal valid invoice", () => {
    expect(invoiceFormSchema.safeParse(base).success).toBe(true);
  });

  it("requires a customer", () => {
    expect(invoiceFormSchema.safeParse({ ...base, customerId: "" }).success).toBe(false);
  });

  it("requires at least one line item", () => {
    expect(invoiceFormSchema.safeParse({ ...base, items: [] }).success).toBe(false);
  });

  it("accepts a valid due date", () => {
    const result = invoiceFormSchema.safeParse({ ...base, dueDate: "2026-08-01" });
    expect(result.success).toBe(true);
  });

  it("treats an empty due date as absent, not invalid", () => {
    const result = invoiceFormSchema.safeParse({ ...base, dueDate: "" });
    expect(result.success).toBe(true);
  });

  it("rejects a line item with zero quantity", () => {
    const result = invoiceFormSchema.safeParse({ ...base, items: [{ ...validItem, quantity: 0 }] });
    expect(result.success).toBe(false);
  });

  it("rejects a negative unit price", () => {
    const result = invoiceFormSchema.safeParse({
      ...base,
      items: [{ ...validItem, unitPriceCents: -100 }],
    });
    expect(result.success).toBe(false);
  });
});

describe("paymentFormSchema", () => {
  it("accepts a valid payment", () => {
    const result = paymentFormSchema.safeParse({ amountCents: 5000, paidAt: "2026-06-01" });
    expect(result.success).toBe(true);
  });

  it("accepts an optional method", () => {
    const result = paymentFormSchema.safeParse({
      amountCents: 5000,
      paidAt: "2026-06-01",
      method: "Tilisiirto",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a zero amount", () => {
    const result = paymentFormSchema.safeParse({ amountCents: 0, paidAt: "2026-06-01" });
    expect(result.success).toBe(false);
  });

  it("rejects a negative amount", () => {
    const result = paymentFormSchema.safeParse({ amountCents: -500, paidAt: "2026-06-01" });
    expect(result.success).toBe(false);
  });

  it("requires a paid date", () => {
    const result = paymentFormSchema.safeParse({ amountCents: 5000, paidAt: "" });
    expect(result.success).toBe(false);
  });
});

describe("creditNoteFormSchema", () => {
  it("accepts a minimal valid credit note", () => {
    const result = creditNoteFormSchema.safeParse({ items: [validItem] });
    expect(result.success).toBe(true);
  });

  it("accepts an optional reason", () => {
    const result = creditNoteFormSchema.safeParse({
      reason: "Virheellinen veloitus",
      items: [validItem],
    });
    expect(result.success).toBe(true);
  });

  it("treats an empty reason as absent, not invalid", () => {
    const result = creditNoteFormSchema.safeParse({ reason: "", items: [validItem] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.reason).toBeUndefined();
  });

  it("requires at least one line item", () => {
    const result = creditNoteFormSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });
});
