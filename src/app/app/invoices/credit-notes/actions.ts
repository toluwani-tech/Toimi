"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { creditNoteFormSchema } from "@/lib/invoices/schemas";
import { requireCompany } from "@/lib/rbac";

export type CreditNoteFormState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
};

function firstFieldErrors(fieldErrors: Record<string, string[] | undefined>) {
  const result: Record<string, string> = {};
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) result[key] = messages[0];
  }
  return result;
}

export async function createCreditNote(
  invoiceId: string,
  _prevState: CreditNoteFormState,
  formData: FormData
): Promise<CreditNoteFormState> {
  const { company } = await requireCompany();
  const invoice = await db.invoice.findFirst({ where: { id: invoiceId, companyId: company.id } });
  if (!invoice) return { error: "Laskua ei löytynyt." };
  if (invoice.status !== "SENT" && invoice.status !== "PAID") {
    return { error: "Hyvityslaskun voi luoda vain lähetetylle tai maksetulle laskulle." };
  }

  let items: unknown = [];
  try {
    const raw = formData.get("itemsJson");
    items = raw ? JSON.parse(String(raw)) : [];
  } catch {
    items = [];
  }

  const parsed = creditNoteFormSchema.safeParse({
    reason: formData.get("reason"),
    items,
  });
  if (!parsed.success) {
    return { error: "Tarkista lomakkeen tiedot.", fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  await db.$transaction(async (tx) => {
    const latest = await tx.creditNote.findFirst({
      where: { companyId: company.id },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    const nextNumber = (latest?.number ?? 0) + 1;

    return tx.creditNote.create({
      data: {
        companyId: company.id,
        invoiceId,
        number: nextNumber,
        reason: parsed.data.reason,
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

  revalidatePath(`/app/invoices/${invoiceId}`);
  redirect(`/app/invoices/${invoiceId}`);
}
