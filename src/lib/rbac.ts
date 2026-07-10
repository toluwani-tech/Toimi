import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import type { CompanyRole } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Server-side guard for company-scoped routes/actions. Redirects to /app if the
 * signed-in user isn't a member of `companyId` with one of `allowedRoles`. */
export async function requireRole(companyId: string, allowedRoles: CompanyRole[]) {
  const user = await requireUser();
  const membership = await db.companyMember.findUnique({
    where: { userId_companyId: { userId: user.id, companyId } },
  });
  if (!membership || !allowedRoles.includes(membership.role)) {
    redirect("/app");
  }
  return { user, membership };
}

/** Same as requireRole but any role qualifies — just needs to belong to the company. */
export async function requireMembership(companyId: string) {
  const user = await requireUser();
  const membership = await db.companyMember.findUnique({
    where: { userId_companyId: { userId: user.id, companyId } },
  });
  if (!membership) {
    redirect("/app");
  }
  return { user, membership };
}

/** The company a user acts in by default — their earliest membership. Multi-company
 * switching isn't built yet, so this is "the current company" everywhere for now. */
export async function getPrimaryCompany(userId: string) {
  return db.companyMember.findFirst({
    where: { userId },
    include: { company: true },
    orderBy: { createdAt: "asc" },
  });
}

/** requireUser() + resolve their current company in one call. Every module's
 * company-scoped pages/actions use this instead of threading companyId around. */
export async function requireCompany() {
  const user = await requireUser();
  const membership = await getPrimaryCompany(user.id);
  if (!membership) redirect("/app");
  return { user, membership, company: membership.company };
}
