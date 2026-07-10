import "server-only";
import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/rbac";

export const STARTER_SESSION_COOKIE = "toimi_starter_sid";

/**
 * Loads the anonymous/starter chat session for the current visitor, creating one
 * (and setting its cookie) on first visit. The cookie value is the session's own
 * `id` — a cuid, already unguessable — so no separate signed token is needed.
 */
export async function getOrCreateStarterSession() {
  const cookieStore = await cookies();
  const existingId = cookieStore.get(STARTER_SESSION_COOKIE)?.value;

  if (existingId) {
    const existing = await db.aIChatSession.findUnique({ where: { id: existingId } });
    if (existing) return existing;
  }

  const user = await getCurrentUser();
  const session = await db.aIChatSession.create({
    data: { userId: user?.id ?? null },
  });

  cookieStore.set(STARTER_SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return session;
}
