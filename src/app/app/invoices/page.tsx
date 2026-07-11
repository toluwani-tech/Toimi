import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isInvoiceOverdue } from "@/lib/invoices/status";
import { calculateLineItemTotals, formatEuros } from "@/lib/money";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";

const statusLabel = {
  DRAFT: "Luonnos",
  SENT: "Lähetetty",
  PAID: "Maksettu",
  CANCELLED: "Peruttu",
} as const;

const statusVariant = {
  DRAFT: "secondary",
  SENT: "default",
  PAID: "default",
  CANCELLED: "destructive",
} as const;

export default async function InvoicesPage() {
  const { company } = await requireCompany();
  const invoices = await db.invoice.findMany({
    where: { companyId: company.id },
    include: { customer: true, items: true, payments: true },
    orderBy: { number: "desc" },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const rows = invoices.map((invoice) => {
    const totals = calculateLineItemTotals(invoice.items, {
      discountPercent: invoice.discountPercent,
      vatRatePercent: invoice.vatRatePercent,
      reverseVatApplies: invoice.reverseVatApplies,
    });
    const paidCents = invoice.payments.reduce((sum, p) => sum + p.amountCents, 0);
    const overdue = isInvoiceOverdue(invoice, paidCents, totals.totalCents, now);

    return { invoice, totals, paidCents, overdue };
  });

  const outstandingCents = rows.reduce(
    (sum, row) => (row.invoice.status === "SENT" ? sum + row.totals.totalCents - row.paidCents : sum),
    0
  );
  const paidThisMonthCents = invoices
    .flatMap((invoice) => invoice.payments)
    .reduce((sum, payment) => (payment.paidAt >= monthStart ? sum + payment.amountCents : sum), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Laskut</h1>
        <Button nativeButton={false} render={<Link href="/app/invoices/new" />}>
          Uusi lasku
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              <h3>Avoinna</h3>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatEuros(outstandingCents)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              <h3>Maksettu tässä kuussa</h3>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatEuros(paidThisMonthCents)}</CardContent>
        </Card>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground">Ei vielä laskuja. Lisää ensimmäinen lasku yllä olevasta painikkeesta.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numero</TableHead>
              <TableHead>Asiakas</TableHead>
              <TableHead>Tila</TableHead>
              <TableHead>Summa</TableHead>
              <TableHead>Eräpäivä</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ invoice, totals, overdue }) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">
                  <Link href={`/app/invoices/${invoice.id}`} className="hover:underline">
                    #{invoice.number}
                  </Link>
                </TableCell>
                <TableCell>{invoice.customer.name}</TableCell>
                <TableCell className="flex items-center gap-2">
                  <Badge variant={statusVariant[invoice.status]}>{statusLabel[invoice.status]}</Badge>
                  {overdue && <Badge variant="destructive">Myöhässä</Badge>}
                </TableCell>
                <TableCell>{formatEuros(totals.totalCents)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {invoice.dueDate
                    ? new Intl.DateTimeFormat("fi-FI", { dateStyle: "short" }).format(invoice.dueDate)
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
