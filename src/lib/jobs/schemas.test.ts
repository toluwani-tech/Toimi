import { describe, expect, it } from "vitest";

import { jobFormSchema } from "./schemas";

describe("jobFormSchema", () => {
  const base = {
    customerId: "cust_1",
    title: "Keittiöremontti",
    startAt: "2026-08-01T09:00",
  };

  it("accepts a minimal valid job with no end time or tasks", () => {
    expect(jobFormSchema.safeParse(base).success).toBe(true);
  });

  it("requires a customer", () => {
    expect(jobFormSchema.safeParse({ ...base, customerId: "" }).success).toBe(false);
  });

  it("requires a title", () => {
    expect(jobFormSchema.safeParse({ ...base, title: "  " }).success).toBe(false);
  });

  it("rejects an invalid start date", () => {
    expect(jobFormSchema.safeParse({ ...base, startAt: "not-a-date" }).success).toBe(false);
  });

  it("accepts an end time after the start time", () => {
    const result = jobFormSchema.safeParse({ ...base, endAt: "2026-08-01T15:00" });
    expect(result.success).toBe(true);
  });

  it("accepts an end time equal to the start time", () => {
    const result = jobFormSchema.safeParse({ ...base, endAt: "2026-08-01T09:00" });
    expect(result.success).toBe(true);
  });

  it("rejects an end time before the start time", () => {
    const result = jobFormSchema.safeParse({ ...base, endAt: "2026-08-01T08:00" });
    expect(result.success).toBe(false);
  });

  it("treats an empty end time as absent, not invalid", () => {
    expect(jobFormSchema.safeParse({ ...base, endAt: "" }).success).toBe(true);
  });

  it("accepts a list of tasks", () => {
    const result = jobFormSchema.safeParse({
      ...base,
      tasks: [{ description: "Puretaan vanhat kaapit" }, { description: "Asennetaan uudet" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a task with an empty description", () => {
    const result = jobFormSchema.safeParse({ ...base, tasks: [{ description: "  " }] });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed postal code", () => {
    expect(jobFormSchema.safeParse({ ...base, postalCode: "abc" }).success).toBe(false);
  });

  it("defaults assigneeIds and tasks to empty arrays when omitted", () => {
    const result = jobFormSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.assigneeIds).toEqual([]);
      expect(result.data.tasks).toEqual([]);
    }
  });
});
