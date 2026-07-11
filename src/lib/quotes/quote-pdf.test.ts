import { describe, expect, it } from "vitest";

import { renderQuotePdfBuffer, type QuotePdfData } from "./quote-pdf";

const sampleQuote: QuotePdfData = {
  number: 1,
  title: "Testitarjous",
  createdAt: new Date("2026-01-15"),
  vatRatePercent: 25,
  reverseVatApplies: false,
  discountPercent: 10,
  notes: "Testihuomautus",
  company: { name: "Testi Oy", businessId: "1234567-8" },
  customer: {
    name: "Matti Meikäläinen",
    email: "matti@example.com",
    phone: "0401234567",
    street: "Testikatu 1",
    postalCode: "00100",
    city: "Helsinki",
  },
  items: [
    { type: "LABOR", description: "Asennustyö", quantity: 2, unitPriceCents: 5000 },
    { type: "MATERIAL", description: "Kaapeli", quantity: 10, unitPriceCents: 250 },
  ],
};

describe("renderQuotePdfBuffer", () => {
  it("renders a valid, non-trivial PDF buffer", async () => {
    const buffer = await renderQuotePdfBuffer(sampleQuote);
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("renders successfully with reverse VAT and no discount", async () => {
    const buffer = await renderQuotePdfBuffer({
      ...sampleQuote,
      reverseVatApplies: true,
      discountPercent: 0,
      notes: null,
      title: null,
    });
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("renders successfully with a single line item", async () => {
    const buffer = await renderQuotePdfBuffer({
      ...sampleQuote,
      items: [{ type: "LABOR", description: "Yksi rivi", quantity: 1, unitPriceCents: 1000 }],
    });
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
