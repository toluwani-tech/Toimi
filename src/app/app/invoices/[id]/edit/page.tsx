import { notFound, redirect } from "next/navigation";

import { updateInvoice } from "@/app/app/invoices/actions";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";

function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { company } = await requireCompany();

  const invoice = await db.invoice.findFirst({
    where: { id, companyId: company.id },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!invoice) notFound();
  if (invoice.status !== "DRAFT") redirect(`/app/invoices/${invoice.id}`);

  const customers = await db.customer.findMany({
    where: { companyId: company.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const updateAction = updateInvoice.bind(null, invoice.id);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Muokkaa laskua #{invoice.number}</h1>
      <InvoiceForm
        action={updateAction}
        customers={customers}
        submitLabel="Tallenna muutokset"
        defaultValues={{
          customerId: invoice.customerId,
          title: invoice.title ?? "",
          vatRatePercent: String(invoice.vatRatePercent),
          discountPercent: String(invoice.discountPercent),
          reverseVatApplies: invoice.reverseVatApplies,
          dueDate: invoice.dueDate ? toDateInputValue(invoice.dueDate) : "",
          notes: invoice.notes ?? "",
          items: invoice.items.map((item) => ({
            type: item.type,
            description: item.description,
            quantity: String(item.quantity),
            unitPrice: (item.unitPriceCents / 100).toFixed(2),
          })),
        }}
      />
    </div>
  );
}
