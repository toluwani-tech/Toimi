import { describe, expect, it } from "vitest";

import { customerFormSchema, customerNoteSchema } from "./schemas";

describe("customerFormSchema", () => {
  const base = { type: "INDIVIDUAL" as const, name: "Matti Meikäläinen" };

  it("accepts a minimal individual customer", () => {
    expect(customerFormSchema.safeParse(base).success).toBe(true);
  });

  it("accepts a full organization customer", () => {
    const result = customerFormSchema.safeParse({
      type: "ORGANIZATION",
      name: "Esimerkki Oy",
      email: "laskutus@esimerkki.fi",
      phone: "0401234567",
      businessId: "1234567-8",
      street: "Testikatu 1",
      postalCode: "00100",
      city: "Helsinki",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = customerFormSchema.safeParse({ ...base, name: "  " });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed email when provided", () => {
    const result = customerFormSchema.safeParse({ ...base, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("treats an empty-string email as absent, not invalid", () => {
    const result = customerFormSchema.safeParse({ ...base, email: "" });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed Finnish business ID (Y-tunnus)", () => {
    const result = customerFormSchema.safeParse({ ...base, businessId: "123456" });
    expect(result.success).toBe(false);
  });

  it("accepts a well-formed Finnish business ID", () => {
    const result = customerFormSchema.safeParse({ ...base, businessId: "1234567-8" });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed postal code", () => {
    const result = customerFormSchema.safeParse({ ...base, postalCode: "abc" });
    expect(result.success).toBe(false);
  });
});

describe("customerNoteSchema", () => {
  it("accepts non-empty content", () => {
    expect(customerNoteSchema.safeParse({ content: "Soitti tiistaina." }).success).toBe(true);
  });

  it("rejects empty content", () => {
    expect(customerNoteSchema.safeParse({ content: "   " }).success).toBe(false);
  });
});
