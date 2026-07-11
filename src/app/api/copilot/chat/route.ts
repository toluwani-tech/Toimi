import { NextResponse } from "next/server";
import { z } from "zod";

import { buildBusinessContextSnapshot } from "@/lib/copilot/context";
import { getCopilotReply, type ChatTurn } from "@/lib/copilot/openai";
import { buildCopilotSystemPrompt } from "@/lib/copilot/system-prompt";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";
import { checkRateLimit } from "@/lib/starter/rate-limit";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(4000),
});

export async function GET() {
  const { user, company } = await requireCompany();

  const messages = await db.copilotMessage.findMany({
    where: { companyId: company.id, userId: user.id },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role === "USER" ? "user" : "assistant",
      content: m.content,
    })),
  });
}

export async function POST(request: Request) {
  const { user, company } = await requireCompany();

  const rateLimit = checkRateLimit(`${company.id}:${user.id}`);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Liikaa viestejä lyhyessä ajassa. Yritä hetken kuluttua uudelleen." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
    );
  }

  const json = await request.json().catch(() => null);
  const parsedBody = bodySchema.safeParse(json);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Virheellinen viesti." }, { status: 400 });
  }

  await db.copilotMessage.create({
    data: { companyId: company.id, userId: user.id, role: "USER", content: parsedBody.data.message },
  });

  const priorMessages = await db.copilotMessage.findMany({
    where: { companyId: company.id, userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const history: ChatTurn[] = priorMessages
    .reverse()
    .map((m) => ({ role: m.role === "USER" ? "user" : "assistant", content: m.content }));

  let reply: string;
  try {
    const snapshot = await buildBusinessContextSnapshot(company.id);
    const systemPrompt = buildCopilotSystemPrompt(company.name, snapshot);
    reply = await getCopilotReply(systemPrompt, history);
  } catch (error) {
    console.error("copilot chat: OpenAI call failed", error);
    return NextResponse.json(
      { error: "AI-copilot ei ole juuri nyt käytettävissä. Yritä hetken kuluttua uudelleen." },
      { status: 502 }
    );
  }

  await db.copilotMessage.create({
    data: { companyId: company.id, userId: user.id, role: "ASSISTANT", content: reply },
  });

  return NextResponse.json({ reply });
}
