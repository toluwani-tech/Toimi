"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";

export type SignupState = { error: string | null };

export async function signup(_prevState: SignupState, formData: FormData): Promise<SignupState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) {
    return { error: "Täytä nimi, sähköposti ja salasana." };
  }
  if (password.length < 8) {
    return { error: "Salasanan tulee olla vähintään 8 merkkiä." };
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Sähköpostiosoite on jo käytössä." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email, passwordHash },
    });
    const company = await tx.company.create({
      data: { name: `${name}n yritys`, form: "UNDECIDED" },
    });
    await tx.companyMember.create({
      data: { userId: user.id, companyId: company.id, role: "OWNER" },
    });
  });

  redirect("/login?registered=1");
}
