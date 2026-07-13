import { NextResponse } from "next/server";

import { expenseCategoryLabel } from "@/lib/expenses/labels";
import { toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";

function toDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export async function GET() {
  const { company } = await requireCompany();

  const expenses = await db.expense.findMany({
    where: { companyId: company.id },
    include: { job: { select: { title: true } } },
    orderBy: { incurredAt: "desc" },
  });

  const rows = [
    ["Päivämäärä", "Kategoria", "Kuvaus", "Toimittaja", "Työ", "Summa (€)"],
    ...expenses.map((expense) => [
      toDateString(expense.incurredAt),
      expenseCategoryLabel[expense.category],
      expense.description,
      expense.vendor ?? "",
      expense.job?.title ?? "",
      (expense.amountCents / 100).toFixed(2),
    ]),
  ];

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kulut.csv"`,
    },
  });
}
