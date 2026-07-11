import { NextResponse } from "next/server";

import { renderInvoicePdfBuffer } from "@/lib/invoices/invoice-pdf";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { company } = await requireCompany();

  const invoice = await db.invoice.findFirst({
    where: { id, companyId: company.id },
    include: { customer: true, items: { orderBy: { position: "asc" } }, payments: true },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Laskua ei löytynyt." }, { status: 404 });
  }

  const paidCents = invoice.payments.reduce((sum, p) => sum + p.amountCents, 0);

  const buffer = await renderInvoicePdfBuffer({
    number: invoice.number,
    title: invoice.title,
    createdAt: invoice.createdAt,
    dueDate: invoice.dueDate,
    vatRatePercent: invoice.vatRatePercent,
    reverseVatApplies: invoice.reverseVatApplies,
    discountPercent: invoice.discountPercent,
    notes: invoice.notes,
    paidCents,
    company: { name: company.name, businessId: company.businessId },
    customer: {
      name: invoice.customer.name,
      email: invoice.customer.email,
      phone: invoice.customer.phone,
      street: invoice.customer.street,
      postalCode: invoice.customer.postalCode,
      city: invoice.customer.city,
    },
    items: invoice.items.map((item) => ({
      type: item.type,
      description: item.description,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
    })),
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="lasku-${invoice.number}.pdf"`,
    },
  });
}
