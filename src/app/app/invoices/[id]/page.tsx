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
import { calculateLateFeeInterest } from "@/lib/invoices/interest";
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
      creditNotes: { include: { items: true }, orderBy: { number: "asc" } },
    },
  });
  if (!invoice) notFound();

  const totals = calculateLineItemTotals(invoice.items, {
    discountPercent: invoice.discountPercent,
    vatRatePercent: invoice.vatRatePercent,
    reverseVatApplies: invoice.reverseVatApplies,
  });
  const paidCents = invoice.payments.reduce((sum, p) => sum + p.amountCents, 0);

  const creditNoteTotals = invoice.creditNotes.map((creditNote) => ({
    creditNote,
    totalCents: calculateLineItemTotals(creditNote.items, {
      discountPercent: 0,
      vatRatePercent: invoice.vatRatePercent,
      reverseVatApplies: invoice.reverseVatApplies,
    }).totalCents,
  }));
  const creditedCents = creditNoteTotals.reduce((sum, c) => sum + c.totalCents, 0);
  const effectiveTotalCents = Math.max(totals.totalCents - creditedCents, 0);

  const now = new Date();
  const balanceDueCents = Math.max(effectiveTotalCents - paidCents, 0);
  const overdue = isInvoiceOverdue(invoice, paidCents, effectiveTotalCents, now);
  const daysOverdue = invoice.dueDate
    ? Math.floor((now.getTime() - invoice.dueDate.getTime()) / (24 * 60 * 60 * 1000))
    : 0;
  const lateFeeCents = invoice.dueDate ? calculateLateFeeInterest(balanceDueCents, invoice.dueDate, now) : 0;

  const canCreateCreditNote = invoice.status === "SENT" || invoice.status === "PAID";

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
            {creditedCents > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hyvitetty</span>
                <span>-{formatEuros(creditedCents)}</span>
              </div>
            )}
            {(paidCents > 0 || creditedCents > 0) && (
              <>
                {paidCents > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Maksettu</span>
                    <span>-{formatEuros(paidCents)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1 font-semibold">
                  <span>Jäljellä</span>
                  <span>{formatEuros(balanceDueCents)}</span>
                </div>
              </>
            )}
            {overdue && lateFeeCents > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Arvioitu viivästyskorko ({daysOverdue} pv)</span>
                <span>{formatEuros(lateFeeCents)}</span>
              </div>
            )}
          </div>
          {overdue && lateFeeCents > 0 && (
            <p className="text-xs text-muted-foreground">
              Arvio oletuskorolla, ei sisälly laskun summaan eikä PDF:ään — ei virallinen viivästyskorkolaskelma.
            </p>
          )}
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
            <h2>Hyvityslaskut</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {creditNoteTotals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ei vielä hyvityslaskuja.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {creditNoteTotals.map(({ creditNote, totalCents }) => (
                <li key={creditNote.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span>
                    Hyvityslasku #{creditNote.number}
                    {creditNote.reason ? ` · ${creditNote.reason}` : ""}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-medium">{formatEuros(totalCents)}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={<Link href={`/app/invoices/credit-notes/${creditNote.id}/pdf`} />}
                    >
                      Lataa PDF
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {canCreateCreditNote && (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/app/invoices/${invoice.id}/credit-notes/new`} />}
            >
              Luo hyvityslasku
            </Button>
          )}
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
