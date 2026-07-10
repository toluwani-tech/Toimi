import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";

const typeLabel = { INDIVIDUAL: "Henkilö", ORGANIZATION: "Yritys" } as const;

export default async function CustomersPage() {
  const { company } = await requireCompany();
  const customers = await db.customer.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Asiakkaat</h1>
        <Button nativeButton={false} render={<Link href="/app/customers/new" />}>
          Uusi asiakas
        </Button>
      </div>

      {customers.length === 0 ? (
        <p className="text-muted-foreground">Ei vielä asiakkaita. Lisää ensimmäinen asiakas yllä olevasta painikkeesta.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nimi</TableHead>
              <TableHead>Tyyppi</TableHead>
              <TableHead>Yhteystiedot</TableHead>
              <TableHead>Kaupunki</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id} className="cursor-pointer">
                <TableCell className="font-medium">
                  <Link href={`/app/customers/${customer.id}`} className="hover:underline">
                    {customer.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{typeLabel[customer.type]}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {[customer.email, customer.phone].filter(Boolean).join(" · ") || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{customer.city ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
