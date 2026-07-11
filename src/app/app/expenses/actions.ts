"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { expenseFormSchema } from "@/lib/expenses/schemas";
import { requireCompany } from "@/lib/rbac";

export type ExpenseFormState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
};

function parseExpenseForm(formData: FormData) {
  const amountEuros = Number(formData.get("amountEuros"));
  const jobId = formData.get("jobId");
  return expenseFormSchema.safeParse({
    category: formData.get("category"),
    description: formData.get("description"),
    amountCents: Number.isFinite(amountEuros) ? Math.round(amountEuros * 100) : formData.get("amountEuros"),
    vendor: formData.get("vendor"),
    incurredAt: formData.get("incurredAt"),
    jobId: jobId === "none" ? undefined : jobId,
    notes: formData.get("notes"),
  });
}

function firstFieldErrors(fieldErrors: Record<string, string[] | undefined>) {
  const result: Record<string, string> = {};
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) result[key] = messages[0];
  }
  return result;
}

async function validJobId(companyId: string, jobId: string | undefined) {
  if (!jobId) return null;
  const job = await db.job.findFirst({ where: { id: jobId, companyId }, select: { id: true } });
  return job ? job.id : null;
}

export async function createExpense(
  _prevState: ExpenseFormState,
  formData: FormData
): Promise<ExpenseFormState> {
  const { company } = await requireCompany();
  const parsed = parseExpenseForm(formData);
  if (!parsed.success) {
    return { error: "Tarkista lomakkeen tiedot.", fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const jobId = await validJobId(company.id, parsed.data.jobId);

  await db.expense.create({
    data: {
      companyId: company.id,
      jobId,
      category: parsed.data.category,
      description: parsed.data.description,
      amountCents: parsed.data.amountCents,
      vendor: parsed.data.vendor,
      incurredAt: parsed.data.incurredAt,
      notes: parsed.data.notes,
    },
  });

  revalidatePath("/app/expenses");
  redirect("/app/expenses");
}

export async function updateExpense(
  expenseId: string,
  _prevState: ExpenseFormState,
  formData: FormData
): Promise<ExpenseFormState> {
  const { company } = await requireCompany();
  const existing = await db.expense.findFirst({ where: { id: expenseId, companyId: company.id } });
  if (!existing) return { error: "Kulua ei löytynyt." };

  const parsed = parseExpenseForm(formData);
  if (!parsed.success) {
    return { error: "Tarkista lomakkeen tiedot.", fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const jobId = await validJobId(company.id, parsed.data.jobId);

  await db.expense.update({
    where: { id: expenseId },
    data: {
      jobId,
      category: parsed.data.category,
      description: parsed.data.description,
      amountCents: parsed.data.amountCents,
      vendor: parsed.data.vendor,
      incurredAt: parsed.data.incurredAt,
      notes: parsed.data.notes,
    },
  });

  revalidatePath("/app/expenses");
  redirect("/app/expenses");
}

export async function deleteExpense(expenseId: string) {
  const { company } = await requireCompany();
  const existing = await db.expense.findFirst({ where: { id: expenseId, companyId: company.id } });
  if (existing) {
    await db.expense.delete({ where: { id: expenseId } });
  }
  revalidatePath("/app/expenses");
  redirect("/app/expenses");
}
