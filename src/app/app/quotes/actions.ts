"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { quoteFormSchema } from "@/lib/quotes/schemas";
import { canTransition } from "@/lib/quotes/status";
import { requireCompany } from "@/lib/rbac";

export type QuoteFormState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
};

function parseQuoteForm(formData: FormData) {
  let items: unknown = [];
  try {
    const raw = formData.get("itemsJson");
    items = raw ? JSON.parse(String(raw)) : [];
  } catch {
    items = [];
  }

  return quoteFormSchema.safeParse({
    customerId: formData.get("customerId"),
    title: formData.get("title"),
    vatRatePercent: formData.get("vatRatePercent"),
    discountPercent: formData.get("discountPercent"),
    reverseVatApplies: formData.get("reverseVatApplies") === "true",
    notes: formData.get("notes"),
    items,
  });
}

function firstFieldErrors(fieldErrors: Record<string, string[] | undefined>) {
  const result: Record<string, string> = {};
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) result[key] = messages[0];
  }
  return result;
}

export async function createQuote(
  _prevState: QuoteFormState,
  formData: FormData
): Promise<QuoteFormState> {
  const { company } = await requireCompany();
  const parsed = parseQuoteForm(formData);
  if (!parsed.success) {
    return { error: "Tarkista lomakkeen tiedot.", fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const customer = await db.customer.findFirst({
    where: { id: parsed.data.customerId, companyId: company.id },
  });
  if (!customer) {
    return { error: "Valittua asiakasta ei löytynyt." };
  }

  const quote = await db.$transaction(async (tx) => {
    const latest = await tx.quote.findFirst({
      where: { companyId: company.id },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    const nextNumber = (latest?.number ?? 0) + 1;

    return tx.quote.create({
      data: {
        companyId: company.id,
        customerId: parsed.data.customerId,
        number: nextNumber,
        title: parsed.data.title,
        vatRatePercent: parsed.data.vatRatePercent,
        discountPercent: parsed.data.discountPercent,
        reverseVatApplies: parsed.data.reverseVatApplies,
        notes: parsed.data.notes,
        items: {
          create: parsed.data.items.map((item, index) => ({
            type: item.type,
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            position: index,
          })),
        },
      },
    });
  });

  revalidatePath("/app/quotes");
  redirect(`/app/quotes/${quote.id}`);
}

export async function updateQuote(
  quoteId: string,
  _prevState: QuoteFormState,
  formData: FormData
): Promise<QuoteFormState> {
  const { company } = await requireCompany();
  const existing = await db.quote.findFirst({ where: { id: quoteId, companyId: company.id } });
  if (!existing) return { error: "Tarjousta ei löytynyt." };
  if (existing.status !== "DRAFT") {
    return { error: "Vain luonnostilassa olevaa tarjousta voi muokata." };
  }

  const parsed = parseQuoteForm(formData);
  if (!parsed.success) {
    return { error: "Tarkista lomakkeen tiedot.", fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const customer = await db.customer.findFirst({
    where: { id: parsed.data.customerId, companyId: company.id },
  });
  if (!customer) return { error: "Valittua asiakasta ei löytynyt." };

  await db.$transaction(async (tx) => {
    await tx.quoteLineItem.deleteMany({ where: { quoteId } });
    await tx.quote.update({
      where: { id: quoteId },
      data: {
        customerId: parsed.data.customerId,
        title: parsed.data.title,
        vatRatePercent: parsed.data.vatRatePercent,
        discountPercent: parsed.data.discountPercent,
        reverseVatApplies: parsed.data.reverseVatApplies,
        notes: parsed.data.notes,
        items: {
          create: parsed.data.items.map((item, index) => ({
            type: item.type,
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            position: index,
          })),
        },
      },
    });
  });

  revalidatePath("/app/quotes");
  redirect(`/app/quotes/${quoteId}`);
}

export async function deleteQuote(quoteId: string) {
  const { company } = await requireCompany();
  const existing = await db.quote.findFirst({ where: { id: quoteId, companyId: company.id } });
  if (existing && existing.status === "DRAFT") {
    await db.quote.delete({ where: { id: quoteId } });
  }
  revalidatePath("/app/quotes");
  redirect("/app/quotes");
}

async function transitionQuote(quoteId: string, next: "SENT" | "ACCEPTED" | "REJECTED") {
  const { company } = await requireCompany();
  const existing = await db.quote.findFirst({ where: { id: quoteId, companyId: company.id } });
  if (!existing) redirect("/app/quotes");

  if (canTransition(existing.status, next)) {
    await db.quote.update({
      where: { id: quoteId },
      data: {
        status: next,
        sentAt: next === "SENT" ? new Date() : existing.sentAt,
        respondedAt: next === "ACCEPTED" || next === "REJECTED" ? new Date() : existing.respondedAt,
      },
    });
    revalidatePath("/app/quotes");
  }

  redirect(`/app/quotes/${quoteId}`);
}

export async function markQuoteSent(quoteId: string) {
  await transitionQuote(quoteId, "SENT");
}

export async function markQuoteAccepted(quoteId: string) {
  await transitionQuote(quoteId, "ACCEPTED");
}

export async function markQuoteRejected(quoteId: string) {
  await transitionQuote(quoteId, "REJECTED");
}
