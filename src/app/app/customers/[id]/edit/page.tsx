import { notFound } from "next/navigation";

import { updateCustomer } from "@/app/app/customers/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerForm } from "@/components/customers/customer-form";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { company } = await requireCompany();

  const customer = await db.customer.findFirst({ where: { id, companyId: company.id } });
  if (!customer) notFound();

  const updateWithId = updateCustomer.bind(null, customer.id);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>Muokkaa asiakasta</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm
            action={updateWithId}
            submitLabel="Tallenna muutokset"
            defaultValues={{
              type: customer.type,
              name: customer.name,
              email: customer.email ?? "",
              phone: customer.phone ?? "",
              businessId: customer.businessId ?? "",
              street: customer.street ?? "",
              postalCode: customer.postalCode ?? "",
              city: customer.city ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
