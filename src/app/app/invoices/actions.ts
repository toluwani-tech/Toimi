"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { invoiceFormSchema, paymentFormSchema } from "@/lib/invoices/schemas";
import { canTransitionInvoice } from "@/lib/invoices/status";
import { calculateLineItemTotals } from "@/lib/money";
import { requireCompany } from "@/lib/rbac";

export type InvoiceFormState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
};

function parseInvoiceForm(formData: FormData) {
  let items: unknown = [];
  try {
    const raw = formData.get("itemsJson");
    items = raw ? JSON.parse(String(raw)) : [];
  } catch {
    items = [];
  }

  return invoiceFormSchema.safeParse({
    customerId: formData.get("customerId"),
    title: formData.get("title"),
    vatRatePercent: formData.get("vatRatePercent"),
    discountPercent: formData.get("discountPercent"),
    reverseVatApplies: formData.get("reverseVatApplies") === "true",
    dueDate: formData.get("dueDate"),
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

export async function createInvoice(
  _prevState: InvoiceFormState,
  formData: FormData
): Promise<InvoiceFormState> {
  const { company } = await requireCompany();
  const parsed = parseInvoiceForm(formData);
  if (!parsed.success) {
    return { error: "Tarkista lomakkeen tiedot.", fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const customer = await db.customer.findFirst({
    where: { id: parsed.data.customerId, companyId: company.id },
  });
  if (!customer) return { error: "Valittua asiakasta ei löytynyt." };

  const invoice = await db.$transaction(async (tx) => {
    const latest = await tx.invoice.findFirst({
      where: { companyId: company.id },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    const nextNumber = (latest?.number ?? 0) + 1;

    return tx.invoice.create({
      data: {
        companyId: company.id,
        customerId: parsed.data.customerId,
        number: nextNumber,
        title: parsed.data.title,
        vatRatePercent: parsed.data.vatRatePercent,
        discountPercent: parsed.data.discountPercent,
        reverseVatApplies: parsed.data.reverseVatApplies,
        dueDate: parsed.data.dueDate,
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

  revalidatePath("/app/invoices");
  redirect(`/app/invoices/${invoice.id}`);
}

export async function updateInvoice(
  invoiceId: string,
  _prevState: InvoiceFormState,
  formData: FormData
): Promise<InvoiceFormState> {
  const { company } = await requireCompany();
  const existing = await db.invoice.findFirst({ where: { id: invoiceId, companyId: company.id } });
  if (!existing) return { error: "Laskua ei löytynyt." };
  if (existing.status !== "DRAFT") {
    return { error: "Vain luonnostilassa olevaa laskua voi muokata." };
  }

  const parsed = parseInvoiceForm(formData);
  if (!parsed.success) {
    return { error: "Tarkista lomakkeen tiedot.", fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const customer = await db.customer.findFirst({
    where: { id: parsed.data.customerId, companyId: company.id },
  });
  if (!customer) return { error: "Valittua asiakasta ei löytynyt." };

  await db.$transaction(async (tx) => {
    await tx.invoiceLineItem.deleteMany({ where: { invoiceId } });
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        customerId: parsed.data.customerId,
        title: parsed.data.title,
        vatRatePercent: parsed.data.vatRatePercent,
        discountPercent: parsed.data.discountPercent,
        reverseVatApplies: parsed.data.reverseVatApplies,
        dueDate: parsed.data.dueDate,
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

  revalidatePath("/app/invoices");
  redirect(`/app/invoices/${invoiceId}`);
}

export async function deleteInvoice(invoiceId: string) {
  const { company } = await requireCompany();
  const existing = await db.invoice.findFirst({ where: { id: invoiceId, companyId: company.id } });
  if (existing && existing.status === "DRAFT") {
    await db.invoice.delete({ where: { id: invoiceId } });
  }
  revalidatePath("/app/invoices");
  redirect("/app/invoices");
}

async function transitionInvoice(invoiceId: string, next: "SENT" | "PAID" | "CANCELLED") {
  const { company } = await requireCompany();
  const existing = await db.invoice.findFirst({ where: { id: invoiceId, companyId: company.id } });
  if (!existing) redirect("/app/invoices");

  if (canTransitionInvoice(existing.status, next)) {
    if (next === "CANCELLED") {
      const paymentCount = await db.payment.count({ where: { invoiceId } });
      if (paymentCount > 0) {
        redirect(`/app/invoices/${invoiceId}`);
      }
    }

    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        status: next,
        sentAt: next === "SENT" ? new Date() : existing.sentAt,
      },
    });
    revalidatePath("/app/invoices");
  }

  redirect(`/app/invoices/${invoiceId}`);
}

export async function markInvoiceSent(invoiceId: string) {
  await transitionInvoice(invoiceId, "SENT");
}

export async function markInvoiceCancelled(invoiceId: string) {
  await transitionInvoice(invoiceId, "CANCELLED");
}

export async function markInvoicePaid(invoiceId: string) {
  await transitionInvoice(invoiceId, "PAID");
}

export type PaymentFormState = { error: string | null };

export async function recordPayment(
  invoiceId: string,
  _prevState: PaymentFormState,
  formData: FormData
): Promise<PaymentFormState> {
  const { company } = await requireCompany();
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, companyId: company.id },
    include: { items: true, payments: true },
  });
  if (!invoice) return { error: "Laskua ei löytynyt." };
  if (invoice.status !== "SENT") {
    return { error: "Maksuja voi kirjata vain lähetetylle laskulle." };
  }

  const amountEuros = Number(formData.get("amountEuros"));
  const parsed = paymentFormSchema.safeParse({
    amountCents: Number.isFinite(amountEuros) ? Math.round(amountEuros * 100) : formData.get("amountEuros"),
    paidAt: formData.get("paidAt"),
    method: formData.get("method"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Virheellinen maksu." };
  }

  await db.payment.create({
    data: {
      invoiceId,
      amountCents: parsed.data.amountCents,
      paidAt: parsed.data.paidAt,
      method: parsed.data.method,
    },
  });

  const totals = calculateLineItemTotals(invoice.items, {
    discountPercent: invoice.discountPercent,
    vatRatePercent: invoice.vatRatePercent,
    reverseVatApplies: invoice.reverseVatApplies,
  });
  const paidSoFarCents =
    invoice.payments.reduce((sum, p) => sum + p.amountCents, 0) + parsed.data.amountCents;

  if (paidSoFarCents >= totals.totalCents) {
    await db.invoice.update({ where: { id: invoiceId }, data: { status: "PAID" } });
  }

  revalidatePath(`/app/invoices/${invoiceId}`);
  revalidatePath("/app/invoices");
  return { error: null };
}

export async function createInvoiceFromQuote(quoteId: string) {
  const { company } = await requireCompany();
  const quote = await db.quote.findFirst({
    where: { id: quoteId, companyId: company.id },
    include: { items: true },
  });
  if (!quote || quote.status !== "ACCEPTED") {
    redirect(`/app/quotes/${quoteId}`);
  }

  const invoice = await db.$transaction(async (tx) => {
    const latest = await tx.invoice.findFirst({
      where: { companyId: company.id },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    const nextNumber = (latest?.number ?? 0) + 1;

    return tx.invoice.create({
      data: {
        companyId: company.id,
        customerId: quote.customerId,
        quoteId: quote.id,
        number: nextNumber,
        title: quote.title,
        vatRatePercent: quote.vatRatePercent,
        discountPercent: quote.discountPercent,
        reverseVatApplies: quote.reverseVatApplies,
        notes: quote.notes,
        items: {
          create: quote.items.map((item, index) => ({
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

  revalidatePath("/app/invoices");
  redirect(`/app/invoices/${invoice.id}/edit`);
}
