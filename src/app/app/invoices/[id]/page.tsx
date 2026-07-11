import Link from "next/link";
import { notFound } from "next/navigation";

import {
  deleteInvoice,
  markInvoiceCancelled,
  markInvoicePaid,
  markInvoiceSent,
} from "@/app/app/invoices/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteInvoiceButton } from "@/components/invoices/delete-invoice-button";
import { RecordPaymentForm } from "@/components/invoices/record-payment-form";
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

const typeLabel = { LABOR: "Työ", MATERIAL: "Materiaali" } as const;

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { company } = await requireCompany();

  const invoice = await db.invoice.findFirst({
    where: { id, companyId: company.id },
    include: {
      customer: true,
      items: { orderBy: { position: "asc" } },
      payments: { orderBy: { paidAt: "desc" } },
    },
  });
  if (!invoice) notFound();

  const totals = calculateLineItemTotals(invoice.items, {
    discountPercent: invoice.discountPercent,
    vatRatePercent: invoice.vatRatePercent,
    reverseVatApplies: invoice.reverseVatApplies,
  });
  const paidCents = invoice.payments.reduce((sum, p) => sum + p.amountCents, 0);
  const balanceDueCents = Math.max(totals.totalCents - paidCents, 0);
  const overdue = isInvoiceOverdue(invoice, paidCents, totals.totalCents);

  const sendAction = markInvoiceSent.bind(null, invoice.id);
  const cancelAction = markInvoiceCancelled.bind(null, invoice.id);
  const paidAction = markInvoicePaid.bind(null, invoice.id);
  const deleteAction = deleteInvoice.bind(null, invoice.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Lasku #{invoice.number}</h1>
            <Badge variant={statusVariant[invoice.status]}>{statusLabel[invoice.status]}</Badge>
            {overdue && <Badge variant="destructive">Myöhässä</Badge>}
          </div>
          <p className="text-muted-foreground">
            {invoice.customer.name}
            {invoice.title ? ` · ${invoice.title}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href={`/app/invoices/${invoice.id}/pdf`} />}>
            Lataa PDF
          </Button>
          {invoice.status === "DRAFT" && (
            <>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={`/app/invoices/${invoice.id}/edit`} />}
              >
                Muokkaa
              </Button>
              <DeleteInvoiceButton action={deleteAction} />
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Rivit</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kuvaus</TableHead>
                <TableHead>Tyyppi</TableHead>
                <TableHead className="text-right">Määrä</TableHead>
                <TableHead className="text-right">À-hinta</TableHead>
                <TableHead className="text-right">Yhteensä</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{typeLabel[item.type]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatEuros(item.unitPriceCents)}</TableCell>
                  <TableCell className="text-right">
                    {formatEuros(Math.round(item.quantity * item.unitPriceCents))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="ml-auto flex w-full max-w-xs flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Välisumma</span>
              <span>{formatEuros(totals.subtotalCents)}</span>
            </div>
            {invoice.discountPercent > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Alennus ({invoice.discountPercent}%)</span>
                <span>-{formatEuros(totals.discountCents)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {invoice.reverseVatApplies ? "ALV (käännetty)" : `ALV (${invoice.vatRatePercent}%)`}
              </span>
              <span>{formatEuros(totals.vatCents)}</span>
            </div>
            <div className="flex justify-between border-t pt-1 font-semibold">
              <span>Yhteensä</span>
              <span>{formatEuros(totals.totalCents)}</span>
            </div>
            {paidCents > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Maksettu</span>
                  <span>-{formatEuros(paidCents)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-semibold">
                  <span>Jäljellä</span>
                  <span>{formatEuros(balanceDueCents)}</span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Maksut</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {invoice.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ei vielä maksuja.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {invoice.payments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span>
                    {new Intl.DateTimeFormat("fi-FI", { dateStyle: "long" }).format(payment.paidAt)}
                    {payment.method ? ` · ${payment.method}` : ""}
                  </span>
                  <span className="font-medium">{formatEuros(payment.amountCents)}</span>
                </li>
              ))}
            </ul>
          )}
          {invoice.status === "SENT" && <RecordPaymentForm invoiceId={invoice.id} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Tila</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          {invoice.status === "DRAFT" && (
            <form action={sendAction}>
              <Button type="submit">Merkitse lähetetyksi</Button>
            </form>
          )}
          {invoice.status === "SENT" && (
            <>
              <form action={paidAction}>
                <Button type="submit" variant="outline">
                  Merkitse maksetuksi
                </Button>
              </form>
              <form action={cancelAction}>
                <Button type="submit" variant="outline">
                  Peru
                </Button>
              </form>
            </>
          )}
          {(invoice.status === "PAID" || invoice.status === "CANCELLED") && (
            <p className="text-sm text-muted-foreground">Ei enää tilamuutoksia saatavilla.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
