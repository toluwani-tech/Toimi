import { notFound, redirect } from "next/navigation";

import { updateQuote } from "@/app/app/quotes/actions";
import { QuoteForm } from "@/components/quotes/quote-form";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { company } = await requireCompany();

  const quote = await db.quote.findFirst({
    where: { id, companyId: company.id },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!quote) notFound();
  if (quote.status !== "DRAFT") redirect(`/app/quotes/${quote.id}`);

  const customers = await db.customer.findMany({
    where: { companyId: company.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const updateAction = updateQuote.bind(null, quote.id);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Muokkaa tarjousta #{quote.number}</h1>
      <QuoteForm
        action={updateAction}
        customers={customers}
        submitLabel="Tallenna muutokset"
        defaultValues={{
          customerId: quote.customerId,
          title: quote.title ?? "",
          vatRatePercent: String(quote.vatRatePercent),
          discountPercent: String(quote.discountPercent),
          reverseVatApplies: quote.reverseVatApplies,
          notes: quote.notes ?? "",
          items: quote.items.map((item) => ({
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
