import Link from "next/link";
import { notFound } from "next/navigation";

import { convertQuoteToJob } from "@/app/app/jobs/actions";
import {
  deleteQuote,
  markQuoteAccepted,
  markQuoteRejected,
  markQuoteSent,
} from "@/app/app/quotes/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteQuoteButton } from "@/components/quotes/delete-quote-button";
import { calculateQuoteTotals, formatEuros } from "@/lib/quotes/calculations";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";

const statusLabel = {
  DRAFT: "Luonnos",
  SENT: "Lähetetty",
  ACCEPTED: "Hyväksytty",
  REJECTED: "Hylätty",
} as const;

const statusVariant = {
  DRAFT: "secondary",
  SENT: "default",
  ACCEPTED: "default",
  REJECTED: "destructive",
} as const;

const typeLabel = { LABOR: "Työ", MATERIAL: "Materiaali" } as const;

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { company } = await requireCompany();

  const quote = await db.quote.findFirst({
    where: { id, companyId: company.id },
    include: { customer: true, items: { orderBy: { position: "asc" } } },
  });
  if (!quote) notFound();

  const existingJob = quote.status === "ACCEPTED" ? await db.job.findFirst({ where: { quoteId: quote.id } }) : null;

  const totals = calculateQuoteTotals(quote.items, {
    discountPercent: quote.discountPercent,
    vatRatePercent: quote.vatRatePercent,
    reverseVatApplies: quote.reverseVatApplies,
  });

  const sendAction = markQuoteSent.bind(null, quote.id);
  const acceptAction = markQuoteAccepted.bind(null, quote.id);
  const rejectAction = markQuoteRejected.bind(null, quote.id);
  const deleteAction = deleteQuote.bind(null, quote.id);
  const convertAction = convertQuoteToJob.bind(null, quote.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Tarjous #{quote.number}</h1>
            <Badge variant={statusVariant[quote.status]}>{statusLabel[quote.status]}</Badge>
          </div>
          <p className="text-muted-foreground">
            {quote.customer.name}
            {quote.title ? ` · ${quote.title}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href={`/app/quotes/${quote.id}/pdf`} />}>
            Lataa PDF
          </Button>
          {quote.status === "DRAFT" && (
            <>
              <Button variant="outline" nativeButton={false} render={<Link href={`/app/quotes/${quote.id}/edit`} />}>
                Muokkaa
              </Button>
              <DeleteQuoteButton action={deleteAction} />
            </>
          )}
          {quote.status === "ACCEPTED" &&
            (existingJob ? (
              <Button nativeButton={false} render={<Link href={`/app/jobs/${existingJob.id}`} />}>
                Avaa työ →
              </Button>
            ) : (
              <form action={convertAction}>
                <Button type="submit">Muunna työksi</Button>
              </form>
            ))}
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
              {quote.items.map((item) => (
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
            {quote.discountPercent > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Alennus ({quote.discountPercent}%)</span>
                <span>-{formatEuros(totals.discountCents)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {quote.reverseVatApplies ? "ALV (käännetty)" : `ALV (${quote.vatRatePercent}%)`}
              </span>
              <span>{formatEuros(totals.vatCents)}</span>
            </div>
            <div className="flex justify-between border-t pt-1 font-semibold">
              <span>Yhteensä</span>
              <span>{formatEuros(totals.totalCents)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Tila</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          {quote.status === "DRAFT" && (
            <form action={sendAction}>
              <Button type="submit">Merkitse lähetetyksi</Button>
            </form>
          )}
          {quote.status === "SENT" && (
            <>
              <form action={acceptAction}>
                <Button type="submit">Merkitse hyväksytyksi</Button>
              </form>
              <form action={rejectAction}>
                <Button type="submit" variant="outline">
                  Merkitse hylätyksi
                </Button>
              </form>
            </>
          )}
          {(quote.status === "ACCEPTED" || quote.status === "REJECTED") && quote.respondedAt && (
            <p className="text-sm text-muted-foreground">
              Vastattu {new Intl.DateTimeFormat("fi-FI", { dateStyle: "long" }).format(quote.respondedAt)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
