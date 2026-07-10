import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { buildStarterSystemPrompt } from "@/lib/starter/knowledge";
import { getStarterChatResponse, type ChatTurn } from "@/lib/starter/openai";
import { checkRateLimit, getClientKey } from "@/lib/starter/rate-limit";
import { getOrCreateStarterSession } from "@/lib/starter/session";
import { advanceStatus } from "@/lib/starter/state-machine";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(4000),
});

export async function GET() {
  const session = await getOrCreateStarterSession();
  const messages = await db.aIChatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    status: session.status,
    trade: session.trade,
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role === "USER" ? "user" : "assistant",
      content: m.content,
    })),
  });
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(getClientKey(request));
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

  const session = await getOrCreateStarterSession();

  await db.aIChatMessage.create({
    data: { sessionId: session.id, role: "USER", content: parsedBody.data.message },
  });

  const priorMessages = await db.aIChatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "asc" },
  });
  const history: ChatTurn[] = priorMessages.map((m) => ({
    role: m.role === "USER" ? "user" : "assistant",
    content: m.content,
  }));

  let result;
  try {
    result = await getStarterChatResponse(buildStarterSystemPrompt(), history);
  } catch (error) {
    console.error("starter chat: OpenAI call failed", error);
    return NextResponse.json(
      { error: "AI-neuvonantaja ei ole juuri nyt käytettävissä. Yritä hetken kuluttua uudelleen." },
      { status: 502 }
    );
  }

  await db.aIChatMessage.create({
    data: { sessionId: session.id, role: "ASSISTANT", content: result.reply },
  });

  const nextStatus = advanceStatus(session.status, result.status);
  await db.aIChatSession.update({
    where: { id: session.id },
    data: {
      status: nextStatus,
      trade: result.trade ?? session.trade,
    },
  });

  return NextResponse.json({ reply: result.reply, status: nextStatus, trade: result.trade ?? session.trade });
}
