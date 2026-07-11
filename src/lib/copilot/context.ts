import "server-only";

import { db } from "@/lib/db";
import { isInvoiceOverdue } from "@/lib/invoices/status";
import { calculateLineItemTotals } from "@/lib/money";
import { sumByCategory } from "@/lib/reports/aggregations";

export async function buildBusinessContextSnapshot(companyId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [company, customerCount, quotes, jobs, invoices, expenses] = await Promise.all([
    db.company.findUniqueOrThrow({ where: { id: companyId }, select: { name: true, form: true } }),
    db.customer.count({ where: { companyId } }),
    db.quote.findMany({ where: { companyId }, select: { status: true } }),
    db.job.findMany({
      where: { companyId },
      select: { title: true, status: true, startAt: true, customer: { select: { name: true } } },
      orderBy: { startAt: "asc" },
    }),
    db.invoice.findMany({
      where: { companyId },
      include: { items: true, payments: true, customer: { select: { name: true } } },
    }),
    db.expense.findMany({ where: { companyId }, select: { amountCents: true, category: true, incurredAt: true } }),
  ]);

  const quoteStatusCounts: Record<string, number> = {};
  for (const quote of quotes) {
    quoteStatusCounts[quote.status] = (quoteStatusCounts[quote.status] ?? 0) + 1;
  }

  const jobStatusCounts: Record<string, number> = {};
  for (const job of jobs) {
    jobStatusCounts[job.status] = (jobStatusCounts[job.status] ?? 0) + 1;
  }
  const upcomingJobs = jobs
    .filter((job) => job.status === "SCHEDULED" && job.startAt >= now)
    .slice(0, 10)
    .map((job) => ({ title: job.title, customer: job.customer.name, startAt: job.startAt.toISOString() }));

  let outstandingCents = 0;
  let paidThisMonthCents = 0;
  const overdueInvoices: { number: number; customer: string; remainingCents: number; dueDate: string }[] = [];
  const customerRevenue = new Map<string, number>();

  for (const invoice of invoices) {
    const totals = calculateLineItemTotals(invoice.items, {
      discountPercent: invoice.discountPercent,
      vatRatePercent: invoice.vatRatePercent,
      reverseVatApplies: invoice.reverseVatApplies,
    });
    const paidCents = invoice.payments.reduce((sum, payment) => sum + payment.amountCents, 0);

    if (invoice.status === "SENT") {
      outstandingCents += totals.totalCents - paidCents;
    }
    for (const payment of invoice.payments) {
      if (payment.paidAt >= monthStart) paidThisMonthCents += payment.amountCents;
    }
    if (isInvoiceOverdue(invoice, paidCents, totals.totalCents, now) && overdueInvoices.length < 10) {
      overdueInvoices.push({
        number: invoice.number,
        customer: invoice.customer.name,
        remainingCents: totals.totalCents - paidCents,
        dueDate: invoice.dueDate ? invoice.dueDate.toISOString().slice(0, 10) : "",
      });
    }
    customerRevenue.set(invoice.customer.name, (customerRevenue.get(invoice.customer.name) ?? 0) + paidCents);
  }

  const expensesThisMonth = expenses.filter((expense) => expense.incurredAt >= monthStart);
  const expenseThisMonthCents = expensesThisMonth.reduce((sum, expense) => sum + expense.amountCents, 0);
  const expenseCategoryTotals = sumByCategory(expensesThisMonth);

  const topCustomers = [...customerRevenue.entries()]
    .filter(([, revenueCents]) => revenueCents > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, revenueCents]) => ({ name, revenueCents }));

  return {
    company: { name: company.name, form: company.form },
    customers: { count: customerCount },
    quotes: quoteStatusCounts,
    jobs: { byStatus: jobStatusCounts, upcoming: upcomingJobs },
    invoices: { outstandingCents, paidThisMonthCents, overdue: overdueInvoices },
    expenses: { thisMonthCents: expenseThisMonthCents, byCategory: expenseCategoryTotals },
    topCustomers,
  };
}

export type BusinessContextSnapshot = Awaited<ReturnType<typeof buildBusinessContextSnapshot>>;
