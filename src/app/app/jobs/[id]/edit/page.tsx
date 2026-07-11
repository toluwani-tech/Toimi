import { notFound, redirect } from "next/navigation";

import { updateJob } from "@/app/app/jobs/actions";
import { JobForm } from "@/components/jobs/job-form";
import { isJobEditable } from "@/lib/jobs/status";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { company } = await requireCompany();

  const job = await db.job.findFirst({
    where: { id, companyId: company.id },
    include: { assignees: true },
  });
  if (!job) notFound();
  if (!isJobEditable(job.status)) redirect(`/app/jobs/${job.id}`);

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
  const updateAction = updateJob.bind(null, job.id);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Muokkaa työtä</h1>
      <JobForm
        action={updateAction}
        customers={customers}
        companyMembers={companyMembers}
        submitLabel="Tallenna muutokset"
        defaultValues={{
          customerId: job.customerId,
          title: job.title,
          startAt: toDatetimeLocalValue(job.startAt),
          endAt: job.endAt ? toDatetimeLocalValue(job.endAt) : "",
          street: job.street ?? "",
          postalCode: job.postalCode ?? "",
          city: job.city ?? "",
          notes: job.notes ?? "",
          assigneeIds: job.assignees.map((a) => a.userId),
        }}
      />
    </div>
  );
}
