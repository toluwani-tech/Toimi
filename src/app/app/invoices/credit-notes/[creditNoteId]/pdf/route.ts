import { NextResponse } from "next/server";

import { renderCreditNotePdfBuffer } from "@/lib/invoices/credit-note-pdf";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";

export async function GET(_request: Request, { params }: { params: Promise<{ creditNoteId: string }> }) {
  const { creditNoteId } = await params;
  const { company } = await requireCompany();

  const creditNote = await db.creditNote.findFirst({
    where: { id: creditNoteId, companyId: company.id },
    include: {
      items: { orderBy: { position: "asc" } },
      invoice: { include: { customer: true } },
    },
  });
  if (!creditNote) {
    return NextResponse.json({ error: "Hyvityslaskua ei löytynyt." }, { status: 404 });
  }

  const buffer = await renderCreditNotePdfBuffer({
    number: creditNote.number,
    invoiceNumber: creditNote.invoice.number,
    reason: creditNote.reason,
    createdAt: creditNote.createdAt,
    vatRatePercent: creditNote.invoice.vatRatePercent,
    reverseVatApplies: creditNote.invoice.reverseVatApplies,
    company: { name: company.name, businessId: company.businessId },
    customer: {
      name: creditNote.invoice.customer.name,
      email: creditNote.invoice.customer.email,
      phone: creditNote.invoice.customer.phone,
      street: creditNote.invoice.customer.street,
      postalCode: creditNote.invoice.customer.postalCode,
      city: creditNote.invoice.customer.city,
    },
    items: creditNote.items.map((item) => ({
      type: item.type,
      description: item.description,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
    })),
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="hyvityslasku-${creditNote.number}.pdf"`,
    },
  });
}
