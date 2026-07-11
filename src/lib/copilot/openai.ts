import OpenAI from "openai";

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

const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export async function getCopilotReply(systemPrompt: string, history: ChatTurn[]): Promise<string> {
  const response = await getClient().responses.create({
    model: MODEL,
    input: [{ role: "system", content: systemPrompt }, ...history],
  });

  if (!response.output_text) {
    throw new Error("OpenAI response did not include output text");
  }
  return response.output_text;
}
