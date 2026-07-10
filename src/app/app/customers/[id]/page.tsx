import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteCustomer } from "@/app/app/customers/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddNoteForm } from "@/components/customers/add-note-form";
import { DeleteCustomerButton } from "@/components/customers/delete-customer-button";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";

const typeLabel = { INDIVIDUAL: "Henkilö", ORGANIZATION: "Yritys" } as const;

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { company } = await requireCompany();

  const customer = await db.customer.findFirst({
    where: { id, companyId: company.id },
    include: { notes: { orderBy: { createdAt: "desc" }, include: { author: true } } },
  });
  if (!customer) notFound();

  const deleteWithId = deleteCustomer.bind(null, customer.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{customer.name}</h1>
            <Badge variant="secondary">{typeLabel[customer.type]}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href={`/app/customers/${customer.id}/edit`} />}>
            Muokkaa
          </Button>
          <DeleteCustomerButton action={deleteWithId} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Tiedot</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Sähköposti</p>
            <p>{customer.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Puhelin</p>
            <p>{customer.phone ?? "—"}</p>
          </div>
          {customer.type === "ORGANIZATION" && (
            <div>
              <p className="text-muted-foreground">Y-tunnus</p>
              <p>{customer.businessId ?? "—"}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">Osoite</p>
            <p>
              {[customer.street, [customer.postalCode, customer.city].filter(Boolean).join(" ")]
                .filter(Boolean)
                .join(", ") || "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Muistiinpanot</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <AddNoteForm customerId={customer.id} />
          {customer.notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ei vielä muistiinpanoja.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {customer.notes.map((note) => (
                <li key={note.id} className="rounded-lg border p-3 text-sm">
                  <p className="whitespace-pre-wrap">{note.content}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {note.author.name ?? note.author.email} ·{" "}
                    {new Intl.DateTimeFormat("fi-FI", { dateStyle: "short", timeStyle: "short" }).format(
                      note.createdAt
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
