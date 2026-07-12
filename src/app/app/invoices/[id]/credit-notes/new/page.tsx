import { notFound, redirect } from "next/navigation";

import { createCreditNote } from "@/app/app/invoices/credit-notes/actions";
import { CreditNoteForm } from "@/components/invoices/credit-note-form";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";

export default async function NewCreditNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { company } = await requireCompany();

  const invoice = await db.invoice.findFirst({ where: { id, companyId: company.id } });
  if (!invoice) notFound();
  if (invoice.status !== "SENT" && invoice.status !== "PAID") {
    redirect(`/app/invoices/${invoice.id}`);
  }

  const createAction = createCreditNote.bind(null, invoice.id);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Uusi hyvityslasku laskulle #{invoice.number}</h1>
      <CreditNoteForm action={createAction} submitLabel="Luo hyvityslasku" />
    </div>
  );
}
