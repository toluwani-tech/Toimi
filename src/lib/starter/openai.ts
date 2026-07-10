import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import {
  starterChatResponseSchema,
  starterPlanSchema,
  type StarterChatResponse,
  type StarterPlanOutput,
} from "@/lib/starter/schemas";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

// Cost-effective tier by default — verified available on the account this was built
// against (2026-07-10). Override via OPENAI_MODEL if it's since been superseded.
const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export async function getStarterChatResponse(
  systemPrompt: string,
  history: ChatTurn[]
): Promise<StarterChatResponse> {
  const response = await getClient().responses.parse({
    model: MODEL,
    input: [{ role: "system", content: systemPrompt }, ...history],
    text: { format: zodTextFormat(starterChatResponseSchema, "starter_chat_response") },
  });

  if (!response.output_parsed) {
    throw new Error("OpenAI response did not include parsed output");
  }
  return response.output_parsed;
}

export async function getStarterPlan(
  systemPrompt: string,
  history: ChatTurn[]
): Promise<StarterPlanOutput> {
  const response = await getClient().responses.parse({
    model: MODEL,
    input: [
      { role: "system", content: systemPrompt },
      ...history,
      {
        role: "user",
        content:
          "Kokoa nyt koko keskustelun perusteella kirjallinen käynnistyssuunnitelma yllä kuvatussa muodossa.",
      },
    ],
    text: { format: zodTextFormat(starterPlanSchema, "starter_plan") },
  });

  if (!response.output_parsed) {
    throw new Error("OpenAI response did not include parsed output");
  }
  return response.output_parsed;
}
