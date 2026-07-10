import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { buildStarterSystemPrompt } from "@/lib/starter/knowledge";
import { getStarterPlan, type ChatTurn } from "@/lib/starter/openai";
import { checkRateLimit, getClientKey } from "@/lib/starter/rate-limit";
import { getOrCreateStarterSession } from "@/lib/starter/session";

export async function GET() {
  const session = await getOrCreateStarterSession();
  const plan = await db.starterPlan.findUnique({ where: { sessionId: session.id } });
  return NextResponse.json({ plan });
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(getClientKey(request));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Liikaa pyyntöjä lyhyessä ajassa. Yritä hetken kuluttua uudelleen." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
    );
  }

  const session = await getOrCreateStarterSession();

  const existingPlan = await db.starterPlan.findUnique({ where: { sessionId: session.id } });
  if (existingPlan) {
    return NextResponse.json({ plan: existingPlan });
  }

  if (session.status !== "PLAN_READY") {
    return NextResponse.json(
      { error: "Keskustelu ei ole vielä valmis suunnitelman koontiin." },
      { status: 400 }
    );
  }

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
    result = await getStarterPlan(buildStarterSystemPrompt(), history);
  } catch (error) {
    console.error("starter plan: OpenAI call failed", error);
    return NextResponse.json(
      { error: "Suunnitelman koonti ei onnistunut juuri nyt. Yritä hetken kuluttua uudelleen." },
      { status: 502 }
    );
  }

  const plan = await db.starterPlan.create({
    data: {
      sessionId: session.id,
      companyFormRecommendation: result.companyFormRecommendation,
      companyFormReasoning: result.companyFormReasoning,
      registrationChecklist: result.registrationChecklist,
      vatYelSummary: result.vatYelSummary,
      insurancePermitNotes: result.insurancePermitNotes,
      pricingGuidance: result.pricingGuidance,
      nextSteps: result.nextSteps,
    },
  });

  return NextResponse.json({ plan });
}
