import { createExpense } from "@/app/app/expenses/actions";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";

function todayDateInputValue(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export default async function NewExpensePage() {
  const { company } = await requireCompany();
  const jobs = await db.job.findMany({
    where: { companyId: company.id },
    orderBy: { startAt: "desc" },
    select: { id: true, title: true },
  });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Uusi kulu</h1>
      <ExpenseForm
        action={createExpense}
        jobs={jobs}
        submitLabel="Lisää kulu"
        defaultValues={{ incurredAt: todayDateInputValue() }}
      />
    </div>
  );
}
