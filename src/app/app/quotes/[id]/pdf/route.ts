import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { renderQuotePdfBuffer } from "@/lib/quotes/quote-pdf";
import { requireCompany } from "@/lib/rbac";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { company } = await requireCompany();

  const quote = await db.quote.findFirst({
    where: { id, companyId: company.id },
    include: { customer: true, items: { orderBy: { position: "asc" } } },
  });
  if (!quote) {
    return NextResponse.json({ error: "Tarjousta ei löytynyt." }, { status: 404 });
  }

  const buffer = await renderQuotePdfBuffer({
    number: quote.number,
    title: quote.title,
    createdAt: quote.createdAt,
    vatRatePercent: quote.vatRatePercent,
    reverseVatApplies: quote.reverseVatApplies,
    discountPercent: quote.discountPercent,
    notes: quote.notes,
    company: { name: company.name, businessId: company.businessId },
    customer: {
      name: quote.customer.name,
      email: quote.customer.email,
      phone: quote.customer.phone,
      street: quote.customer.street,
      postalCode: quote.customer.postalCode,
      city: quote.customer.city,
    },
    items: quote.items.map((item) => ({
      type: item.type,
      description: item.description,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
    })),
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="tarjous-${quote.number}.pdf"`,
    },
  });
}
