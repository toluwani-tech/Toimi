import { z } from "zod";

export const starterStatusSchema = z.enum(["GATHERING_INFO", "ADVISING", "PLAN_READY"]);

export const starterChatResponseSchema = z.object({
  reply: z.string().min(1),
  status: starterStatusSchema,
  trade: z.string().nullable(),
});
export type StarterChatResponse = z.infer<typeof starterChatResponseSchema>;

export const starterChatResponseJsonSchema = {
  name: "starter_chat_response",
  schema: {
    type: "object",
    properties: {
      reply: {
        type: "string",
        description: "The assistant's reply to show the user, in Finnish.",
      },
      status: {
        type: "string",
        enum: ["GATHERING_INFO", "ADVISING", "PLAN_READY"],
        description:
          "GATHERING_INFO while still asking about trade/situation/goals. ADVISING once giving concrete guidance. PLAN_READY once the core topics have been covered for this user's situation and a written plan can be produced.",
      },
      trade: {
        type: ["string", "null"],
        description: "The user's trade once known (e.g. 'sähköasentaja'), else null.",
      },
    },
    required: ["reply", "status", "trade"],
    additionalProperties: false,
  },
  strict: true,
} as const;

const checklistItemSchema = z.object({
  step: z.string().min(1),
  description: z.string().min(1),
});

export const starterPlanSchema = z.object({
  companyFormRecommendation: z.enum(["TOIMINIMI", "OY", "UNDECIDED"]),
  companyFormReasoning: z.string().min(1),
  registrationChecklist: z.array(checklistItemSchema).min(1),
  vatYelSummary: z.string().min(1),
  insurancePermitNotes: z.string().min(1),
  pricingGuidance: z.string().min(1),
  nextSteps: z.array(z.string().min(1)).min(1),
});
export type StarterPlanOutput = z.infer<typeof starterPlanSchema>;

export const starterPlanJsonSchema = {
  name: "starter_plan",
  schema: {
    type: "object",
    properties: {
      companyFormRecommendation: {
        type: "string",
        enum: ["TOIMINIMI", "OY", "UNDECIDED"],
      },
      companyFormReasoning: { type: "string" },
      registrationChecklist: {
        type: "array",
        items: {
          type: "object",
          properties: {
            step: { type: "string" },
            description: { type: "string" },
          },
          required: ["step", "description"],
          additionalProperties: false,
        },
      },
      vatYelSummary: { type: "string" },
      insurancePermitNotes: { type: "string" },
      pricingGuidance: { type: "string" },
      nextSteps: { type: "array", items: { type: "string" } },
    },
    required: [
      "companyFormRecommendation",
      "companyFormReasoning",
      "registrationChecklist",
      "vatYelSummary",
      "insurancePermitNotes",
      "pricingGuidance",
      "nextSteps",
    ],
    additionalProperties: false,
  },
  strict: true,
} as const;
