import { describe, expect, it } from "vitest";

import { canTransitionInvoice, isInvoiceOverdue } from "./status";

describe("canTransitionInvoice", () => {
  it("allows DRAFT to SENT", () => {
    expect(canTransitionInvoice("DRAFT", "SENT")).toBe(true);
  });

  it("allows DRAFT to CANCELLED", () => {
    expect(canTransitionInvoice("DRAFT", "CANCELLED")).toBe(true);
  });

  it("allows SENT to PAID", () => {
    expect(canTransitionInvoice("SENT", "PAID")).toBe(true);
  });

  it("allows SENT to CANCELLED", () => {
    expect(canTransitionInvoice("SENT", "CANCELLED")).toBe(true);
  });

  it("rejects skipping DRAFT straight to PAID", () => {
    expect(canTransitionInvoice("DRAFT", "PAID")).toBe(false);
  });

  it("rejects any transition out of PAID", () => {
    expect(canTransitionInvoice("PAID", "SENT")).toBe(false);
    expect(canTransitionInvoice("PAID", "CANCELLED")).toBe(false);
  });

  it("rejects any transition out of CANCELLED", () => {
    expect(canTransitionInvoice("CANCELLED", "DRAFT")).toBe(false);
    expect(canTransitionInvoice("CANCELLED", "SENT")).toBe(false);
  });

  it("rejects a no-op transition to the same status", () => {
    expect(canTransitionInvoice("SENT", "SENT")).toBe(false);
  });
});

describe("isInvoiceOverdue", () => {
  const past = new Date("2026-01-01");
  const future = new Date("2026-12-31");
  const now = new Date("2026-06-01");

  it("is overdue when SENT, past due date, and not fully paid", () => {
    expect(isInvoiceOverdue({ status: "SENT", dueDate: past }, 0, 10000, now)).toBe(true);
  });

  it("is not overdue when the due date is in the future", () => {
    expect(isInvoiceOverdue({ status: "SENT", dueDate: future }, 0, 10000, now)).toBe(false);
  });

  it("is not overdue once fully paid, even past due date", () => {
    expect(isInvoiceOverdue({ status: "SENT", dueDate: past }, 10000, 10000, now)).toBe(false);
  });

  it("is not overdue when there is no due date", () => {
    expect(isInvoiceOverdue({ status: "SENT", dueDate: null }, 0, 10000, now)).toBe(false);
  });

  it("is not overdue for a DRAFT invoice regardless of due date", () => {
    expect(isInvoiceOverdue({ status: "DRAFT", dueDate: past }, 0, 10000, now)).toBe(false);
  });

  it("is not overdue for a PAID invoice", () => {
    expect(isInvoiceOverdue({ status: "PAID", dueDate: past }, 10000, 10000, now)).toBe(false);
  });

  it("is not overdue for a CANCELLED invoice", () => {
    expect(isInvoiceOverdue({ status: "CANCELLED", dueDate: past }, 0, 10000, now)).toBe(false);
  });
});
