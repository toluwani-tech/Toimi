import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { expenseCategoryLabel } from "@/lib/expenses/labels";
import { calculateLineItemTotals, formatEuros } from "@/lib/money";
import { buildMonthlyRevenueExpense, sumByCategory } from "@/lib/reports/aggregations";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";

export default async function ReportsPage() {
  const { company } = await requireCompany();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [payments, expenses, jobs] = await Promise.all([
    db.payment.findMany({
      where: { invoice: { companyId: company.id } },
      include: { invoice: { select: { customerId: true, customer: { select: { name: true } } } } },
    }),
    db.expense.findMany({ where: { companyId: company.id } }),
    db.job.findMany({
      where: { companyId: company.id, quoteId: { not: null } },
      include: {
        customer: true,
        quote: { include: { invoices: { include: { items: true } } } },
        expenses: true,
      },
    }),
  ]);

  const monthlyBuckets = buildMonthlyRevenueExpense(payments, expenses, now, 6);
  const currentMonthBucket = monthlyBuckets[monthlyBuckets.length - 1];
  const maxCents = Math.max(1, ...monthlyBuckets.flatMap((bucket) => [bucket.revenueCents, bucket.expenseCents]));

  const expensesThisMonth = expenses.filter((expense) => expense.incurredAt >= monthStart);
  const categoryTotals = sumByCategory(expensesThisMonth);
  const categoryEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const maxCategoryCents = categoryEntries[0]?.[1] ?? 1;

  const customerRevenue = new Map<string, { name: string; totalCents: number }>();
  for (const payment of payments) {
    const customerId = payment.invoice.customerId;
    const existing = customerRevenue.get(customerId);
    if (existing) {
      existing.totalCents += payment.amountCents;
    } else {
      customerRevenue.set(customerId, { name: payment.invoice.customer.name, totalCents: payment.amountCents });
    }
  }
  const topCustomers = [...customerRevenue.entries()]
    .map(([id, value]) => ({ id, ...value }))
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, 5);

  const jobProfitability = jobs
    .filter((job) => job.quote && job.quote.invoices.length > 0)
    .map((job) => {
      const revenueCents = job.quote!.invoices.reduce((sum, invoice) => {
        const totals = calculateLineItemTotals(invoice.items, {
          discountPercent: invoice.discountPercent,
          vatRatePercent: invoice.vatRatePercent,
          reverseVatApplies: invoice.reverseVatApplies,
        });
        return sum + totals.totalCents;
      }, 0);
      const expenseCents = job.expenses.reduce((sum, expense) => sum + expense.amountCents, 0);
      return { job, revenueCents, expenseCents, profitCents: revenueCents - expenseCents };
    });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Raportit</h1>

      <Card className="max-w-xs">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            <h3>Tulos tässä kuussa</h3>
          </CardTitle>
        </CardHeader>
        <CardContent
          className={`text-2xl font-semibold ${currentMonthBucket.profitCents < 0 ? "text-destructive" : ""}`}
        >
          {formatEuros(currentMonthBucket.profitCents)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Liikevaihto ja kulut (6 kuukautta)</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            {monthlyBuckets.map((bucket) => (
              <div key={bucket.key} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-32 items-end gap-1">
                  <div
                    className="w-3 rounded-t bg-primary"
                    style={{ height: `${Math.max(2, (bucket.revenueCents / maxCents) * 100)}%` }}
                    title={`Liikevaihto: ${formatEuros(bucket.revenueCents)}`}
                  />
                  <div
                    className="w-3 rounded-t bg-destructive"
                    style={{ height: `${Math.max(2, (bucket.expenseCents / maxCents) * 100)}%` }}
                    title={`Kulut: ${formatEuros(bucket.expenseCents)}`}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{bucket.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-primary" /> Liikevaihto
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-destructive" /> Kulut
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Kulut kategorioittain (tässä kuussa)</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categoryEntries.length === 0 ? (
            <p className="text-muted-foreground">Ei kuluja tässä kuussa.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {categoryEntries.map(([category, cents]) => (
                <div key={category} data-testid={`expense-category-${category}`} className="flex items-center gap-3">
                  <span className="w-24 text-sm">
                    {expenseCategoryLabel[category as keyof typeof expenseCategoryLabel]}
                  </span>
                  <div className="h-2 flex-1 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${(cents / maxCategoryCents) * 100}%` }}
                    />
                  </div>
                  <span className="w-20 text-right text-sm">{formatEuros(cents)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Parhaat asiakkaat</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topCustomers.length === 0 ? (
            <p className="text-muted-foreground">Ei vielä maksuja.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asiakas</TableHead>
                  <TableHead className="text-right">Liikevaihto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell className="text-right">{formatEuros(customer.totalCents)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Töiden kannattavuus</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {jobProfitability.length === 0 ? (
            <p className="text-muted-foreground">
              Ei vielä töitä, joilla on sekä tarjouksesta luotu lasku että kannattavuuslaskelma.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Työ</TableHead>
                  <TableHead>Asiakas</TableHead>
                  <TableHead className="text-right">Liikevaihto</TableHead>
                  <TableHead className="text-right">Kulut</TableHead>
                  <TableHead className="text-right">Tulos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobProfitability.map(({ job, revenueCents, expenseCents, profitCents }) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <Link href={`/app/jobs/${job.id}`} className="hover:underline">
                        {job.title}
                      </Link>
                    </TableCell>
                    <TableCell>{job.customer.name}</TableCell>
                    <TableCell className="text-right">{formatEuros(revenueCents)}</TableCell>
                    <TableCell className="text-right">{formatEuros(expenseCents)}</TableCell>
                    <TableCell className={`text-right ${profitCents < 0 ? "text-destructive" : ""}`}>
                      {formatEuros(profitCents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
