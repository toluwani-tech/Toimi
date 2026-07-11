import { describe, expect, it } from "vitest";

import { expenseFormSchema } from "./schemas";

describe("expenseFormSchema", () => {
  const base = {
    category: "MATERIAL" as const,
    description: "Putkiliitokset",
    amountCents: 4500,
    incurredAt: "2026-07-01",
  };

  it("accepts a minimal valid expense", () => {
    expect(expenseFormSchema.safeParse(base).success).toBe(true);
  });

  it("requires a description", () => {
    expect(expenseFormSchema.safeParse({ ...base, description: "" }).success).toBe(false);
  });

  it("requires an incurred date", () => {
    const result = expenseFormSchema.safeParse({ ...base, incurredAt: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a zero amount", () => {
    expect(expenseFormSchema.safeParse({ ...base, amountCents: 0 }).success).toBe(false);
  });

  it("rejects a negative amount", () => {
    expect(expenseFormSchema.safeParse({ ...base, amountCents: -100 }).success).toBe(false);
  });

  it("rejects an invalid category", () => {
    expect(expenseFormSchema.safeParse({ ...base, category: "TOOLS" }).success).toBe(false);
  });

  it("accepts an optional vendor and jobId", () => {
    const result = expenseFormSchema.safeParse({ ...base, vendor: "K-Rauta", jobId: "job_1" });
    expect(result.success).toBe(true);
  });

  it("treats an empty jobId as absent, not invalid", () => {
    const result = expenseFormSchema.safeParse({ ...base, jobId: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.jobId).toBeUndefined();
  });

  it("accepts an optional notes field", () => {
    const result = expenseFormSchema.safeParse({ ...base, notes: "Ostettu käteisellä" });
    expect(result.success).toBe(true);
  });
});
