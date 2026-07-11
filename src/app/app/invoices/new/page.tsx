import { createInvoice } from "@/app/app/invoices/actions";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";

export default async function NewInvoicePage() {
  const { company } = await requireCompany();
  const customers = await db.customer.findMany({
    where: { companyId: company.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Uusi lasku</h1>
      <InvoiceForm action={createInvoice} customers={customers} submitLabel="Luo lasku" />
    </div>
  );
}
