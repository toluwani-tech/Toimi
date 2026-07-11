import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculateLineItemTotals, formatEuros } from "@/lib/money";
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

export default async function QuotesPage() {
  const { company } = await requireCompany();
  const quotes = await db.quote.findMany({
    where: { companyId: company.id },
    include: { customer: true, items: true },
    orderBy: { number: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Tarjoukset</h1>
        <Button nativeButton={false} render={<Link href="/app/quotes/new" />}>
          Uusi tarjous
        </Button>
      </div>

      {quotes.length === 0 ? (
        <p className="text-muted-foreground">
          Ei vielä tarjouksia. Lisää ensimmäinen tarjous yllä olevasta painikkeesta.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numero</TableHead>
              <TableHead>Asiakas</TableHead>
              <TableHead>Tila</TableHead>
              <TableHead>Summa</TableHead>
              <TableHead>Luotu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.map((quote) => {
              const totals = calculateLineItemTotals(quote.items, {
                discountPercent: quote.discountPercent,
                vatRatePercent: quote.vatRatePercent,
                reverseVatApplies: quote.reverseVatApplies,
              });
              return (
                <TableRow key={quote.id}>
                  <TableCell className="font-medium">
                    <Link href={`/app/quotes/${quote.id}`} className="hover:underline">
                      #{quote.number}
                    </Link>
                  </TableCell>
                  <TableCell>{quote.customer.name}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[quote.status]}>{statusLabel[quote.status]}</Badge>
                  </TableCell>
                  <TableCell>{formatEuros(totals.totalCents)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Intl.DateTimeFormat("fi-FI", { dateStyle: "short" }).format(quote.createdAt)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
