import { describe, expect, it } from "vitest";

import { starterChatResponseSchema, starterPlanSchema } from "./schemas";

describe("starterChatResponseSchema", () => {
  it("accepts a valid response", () => {
    const result = starterChatResponseSchema.safeParse({
      reply: "Millä alalla toimit?",
      status: "GATHERING_INFO",
      trade: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid status enum value", () => {
    const result = starterChatResponseSchema.safeParse({
      reply: "Hei",
      status: "DONE",
      trade: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty reply", () => {
    const result = starterChatResponseSchema.safeParse({
      reply: "",
      status: "ADVISING",
      trade: "sähköasentaja",
    });
    expect(result.success).toBe(false);
  });

  it("requires trade to be present (string or null), not omitted", () => {
    const result = starterChatResponseSchema.safeParse({
      reply: "Hei",
      status: "GATHERING_INFO",
    });
    expect(result.success).toBe(false);
  });
});

describe("starterPlanSchema", () => {
  const validPlan = {
    companyFormRecommendation: "TOIMINIMI" as const,
    companyFormReasoning: "Pieni riski, yksinyrittäjä.",
    registrationChecklist: [{ step: "Y-tunnus", description: "Hae YTJ:n kautta." }],
    vatYelSummary: "ALV-raja ...",
    insurancePermitNotes: "Vastuuvakuutus suositeltava.",
    pricingGuidance: "Laske tuntihinta kulujen mukaan.",
    nextSteps: ["Avaa pankkitili"],
  };

  it("accepts a fully valid plan", () => {
    expect(starterPlanSchema.safeParse(validPlan).success).toBe(true);
  });

  it("rejects an empty registration checklist", () => {
    const result = starterPlanSchema.safeParse({ ...validPlan, registrationChecklist: [] });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid company form", () => {
    const result = starterPlanSchema.safeParse({
      ...validPlan,
      companyFormRecommendation: "LTD",
    });
    expect(result.success).toBe(false);
  });
});
