import Link from "next/link";

import { deleteExpense } from "@/app/app/expenses/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteExpenseButton } from "@/components/expenses/delete-expense-button";
import { formatEuros } from "@/lib/money";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";

const categoryLabel = {
  MATERIAL: "Materiaali",
  FUEL: "Polttoaine",
  EQUIPMENT: "Kalusto",
  OTHER: "Muu",
} as const;

export default async function ExpensesPage() {
  const { company } = await requireCompany();
  const expenses = await db.expense.findMany({
    where: { companyId: company.id },
    include: { job: { select: { id: true, title: true } } },
    orderBy: { incurredAt: "desc" },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const totalThisMonthCents = expenses.reduce(
    (sum, expense) => (expense.incurredAt >= monthStart ? sum + expense.amountCents : sum),
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Kulut</h1>
        <Button nativeButton={false} render={<Link href="/app/expenses/new" />}>
          Uusi kulu
        </Button>
      </div>

      <Card className="max-w-xs">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            <h3>Kulut tässä kuussa</h3>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{formatEuros(totalThisMonthCents)}</CardContent>
      </Card>

      {expenses.length === 0 ? (
        <p className="text-muted-foreground">Ei vielä kuluja. Lisää ensimmäinen kulu yllä olevasta painikkeesta.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Päivämäärä</TableHead>
              <TableHead>Kategoria</TableHead>
              <TableHead>Kuvaus</TableHead>
              <TableHead>Toimittaja</TableHead>
              <TableHead>Työ</TableHead>
              <TableHead className="text-right">Summa</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => {
              const deleteAction = deleteExpense.bind(null, expense.id);
              return (
                <TableRow key={expense.id}>
                  <TableCell className="text-muted-foreground">
                    {new Intl.DateTimeFormat("fi-FI", { dateStyle: "short" }).format(expense.incurredAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{categoryLabel[expense.category]}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/app/expenses/${expense.id}/edit`} className="hover:underline">
                      {expense.description}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{expense.vendor ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {expense.job ? (
                      <Link href={`/app/jobs/${expense.job.id}`} className="hover:underline">
                        {expense.job.title}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatEuros(expense.amountCents)}</TableCell>
                  <TableCell>
                    <DeleteExpenseButton action={deleteAction} />
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
