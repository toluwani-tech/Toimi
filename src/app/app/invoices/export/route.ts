import { NextResponse } from "next/server";

import { toCsv } from "@/lib/csv";
import { calculateLineItemTotals } from "@/lib/money";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";

const statusLabel = {
  DRAFT: "Luonnos",
  SENT: "Lähetetty",
  PAID: "Maksettu",
  CANCELLED: "Peruttu",
} as const;

function toDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export async function GET() {
  const { company } = await requireCompany();

  const invoices = await db.invoice.findMany({
    where: { companyId: company.id },
    include: { customer: true, items: true, payments: true },
    orderBy: { number: "desc" },
  });

  const rows = [
    ["Numero", "Asiakas", "Tila", "Eräpäivä", "Summa (€)", "Maksettu (€)", "Luotu"],
    ...invoices.map((invoice) => {
      const totals = calculateLineItemTotals(invoice.items, {
        discountPercent: invoice.discountPercent,
        vatRatePercent: invoice.vatRatePercent,
        reverseVatApplies: invoice.reverseVatApplies,
      });
      const paidCents = invoice.payments.reduce((sum, payment) => sum + payment.amountCents, 0);

      return [
        String(invoice.number),
        invoice.customer.name,
        statusLabel[invoice.status],
        invoice.dueDate ? toDateString(invoice.dueDate) : "",
        (totals.totalCents / 100).toFixed(2),
        (paidCents / 100).toFixed(2),
        toDateString(invoice.createdAt),
      ];
    }),
  ];

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laskut.csv"`,
    },
  });
}
