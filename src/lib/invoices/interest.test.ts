import { describe, expect, it } from "vitest";

import { calculateLateFeeInterest } from "./interest";

describe("calculateLateFeeInterest", () => {
  it("returns 0 when the due date hasn't passed yet", () => {
    const dueDate = new Date(2026, 6, 20);
    const now = new Date(2026, 6, 10);
    expect(calculateLateFeeInterest(10000, dueDate, now)).toBe(0);
  });

  it("returns 0 on the due date itself (0 days overdue)", () => {
    const dueDate = new Date(2026, 6, 10);
    const now = new Date(2026, 6, 10);
    expect(calculateLateFeeInterest(10000, dueDate, now)).toBe(0);
  });

  it("returns 0 when nothing remains outstanding", () => {
    const dueDate = new Date(2026, 5, 1);
    const now = new Date(2026, 6, 10);
    expect(calculateLateFeeInterest(0, dueDate, now)).toBe(0);
  });

  it("computes interest for a known number of overdue days at the default rate", () => {
    const dueDate = new Date(2026, 0, 1);
    const now = new Date(2026, 0, 1 + 365); // exactly 365 days overdue, 1 full year
    // 100000 cents * 11% * (365/365) = 11000 cents
    expect(calculateLateFeeInterest(100000, dueDate, now)).toBe(11000);
  });

  it("respects a custom annual rate", () => {
    const dueDate = new Date(2026, 0, 1);
    const now = new Date(2026, 0, 1 + 365);
    // 100000 cents * 5% * (365/365) = 5000 cents
    expect(calculateLateFeeInterest(100000, dueDate, now, 5)).toBe(5000);
  });
});
