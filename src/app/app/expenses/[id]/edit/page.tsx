import { notFound } from "next/navigation";

import { updateExpense } from "@/app/app/expenses/actions";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";

function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { company } = await requireCompany();

  const expense = await db.expense.findFirst({ where: { id, companyId: company.id } });
  if (!expense) notFound();

  const jobs = await db.job.findMany({
    where: { companyId: company.id },
    orderBy: { startAt: "desc" },
    select: { id: true, title: true },
  });

  const updateAction = updateExpense.bind(null, expense.id);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Muokkaa kulua</h1>
      <ExpenseForm
        action={updateAction}
        jobs={jobs}
        submitLabel="Tallenna muutokset"
        defaultValues={{
          category: expense.category,
          description: expense.description,
          amountEuros: (expense.amountCents / 100).toFixed(2),
          vendor: expense.vendor ?? "",
          incurredAt: toDateInputValue(expense.incurredAt),
          jobId: expense.jobId ?? "",
          notes: expense.notes ?? "",
        }}
      />
    </div>
  );
}
