import { describe, expect, it } from "vitest";

import { renderInvoicePdfBuffer, type InvoicePdfData } from "./invoice-pdf";

const sampleInvoice: InvoicePdfData = {
  number: 1,
  title: "Testilasku",
  createdAt: new Date("2026-01-15"),
  dueDate: new Date("2026-02-14"),
  vatRatePercent: 25,
  reverseVatApplies: false,
  discountPercent: 0,
  notes: "Testihuomautus",
  paidCents: 0,
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

describe("renderInvoicePdfBuffer", () => {
  it("renders a valid, non-trivial PDF buffer", async () => {
    const buffer = await renderInvoicePdfBuffer(sampleInvoice);
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("renders successfully with a partial payment recorded", async () => {
    const buffer = await renderInvoicePdfBuffer({ ...sampleInvoice, paidCents: 5000 });
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("renders successfully with reverse VAT and no due date", async () => {
    const buffer = await renderInvoicePdfBuffer({
      ...sampleInvoice,
      reverseVatApplies: true,
      dueDate: null,
      notes: null,
      title: null,
    });
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
