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
