import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerForm } from "@/components/customers/customer-form";
import { createCustomer } from "@/app/app/customers/actions";

export default function NewCustomerPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>Uusi asiakas</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm action={createCustomer} submitLabel="Lisää asiakas" />
        </CardContent>
      </Card>
    </div>
  );
}
