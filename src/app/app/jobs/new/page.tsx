import { createJob } from "@/app/app/jobs/actions";
import { JobForm } from "@/components/jobs/job-form";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";

export default async function NewJobPage() {
  const { company } = await requireCompany();
  const [customers, members] = await Promise.all([
    db.customer.findMany({
      where: { companyId: company.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, street: true, postalCode: true, city: true },
    }),
    db.companyMember.findMany({
      where: { companyId: company.id },
      include: { user: true },
    }),
  ]);

  const companyMembers = members.map((m) => ({ userId: m.userId, name: m.user.name ?? m.user.email }));

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Uusi työ</h1>
      <JobForm action={createJob} customers={customers} companyMembers={companyMembers} submitLabel="Luo työ" showTasks />
    </div>
  );
}
