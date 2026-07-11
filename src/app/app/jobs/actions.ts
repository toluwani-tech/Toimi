"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { jobFormSchema } from "@/lib/jobs/schemas";
import { canTransitionJob, isJobEditable } from "@/lib/jobs/status";
import { requireCompany } from "@/lib/rbac";

export type JobFormState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
};

function parseJobForm(formData: FormData) {
  let assigneeIds: unknown = [];
  let tasks: unknown = [];
  try {
    assigneeIds = JSON.parse(String(formData.get("assigneeIdsJson") ?? "[]"));
  } catch {
    assigneeIds = [];
  }
  try {
    tasks = JSON.parse(String(formData.get("tasksJson") ?? "[]"));
  } catch {
    tasks = [];
  }

  return jobFormSchema.safeParse({
    customerId: formData.get("customerId"),
    title: formData.get("title"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    street: formData.get("street"),
    postalCode: formData.get("postalCode"),
    city: formData.get("city"),
    notes: formData.get("notes"),
    assigneeIds,
    tasks,
  });
}

function firstFieldErrors(fieldErrors: Record<string, string[] | undefined>) {
  const result: Record<string, string> = {};
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) result[key] = messages[0];
  }
  return result;
}

async function validAssigneeIds(companyId: string, assigneeIds: string[]) {
  if (assigneeIds.length === 0) return [];
  const members = await db.companyMember.findMany({
    where: { companyId, userId: { in: assigneeIds } },
    select: { userId: true },
  });
  const validIds = new Set(members.map((m) => m.userId));
  return assigneeIds.filter((id) => validIds.has(id));
}

export async function createJob(
  _prevState: JobFormState,
  formData: FormData
): Promise<JobFormState> {
  const { company } = await requireCompany();
  const parsed = parseJobForm(formData);
  if (!parsed.success) {
    return { error: "Tarkista lomakkeen tiedot.", fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const customer = await db.customer.findFirst({
    where: { id: parsed.data.customerId, companyId: company.id },
  });
  if (!customer) return { error: "Valittua asiakasta ei löytynyt." };

  const assigneeIds = await validAssigneeIds(company.id, parsed.data.assigneeIds);

  const job = await db.job.create({
    data: {
      companyId: company.id,
      customerId: parsed.data.customerId,
      title: parsed.data.title,
      startAt: parsed.data.startAt,
      endAt: parsed.data.endAt,
      street: parsed.data.street,
      postalCode: parsed.data.postalCode,
      city: parsed.data.city,
      notes: parsed.data.notes,
      assignees: { create: assigneeIds.map((userId) => ({ userId })) },
      tasks: {
        create: parsed.data.tasks.map((task, index) => ({ description: task.description, position: index })),
      },
    },
  });

  revalidatePath("/app/jobs");
  redirect(`/app/jobs/${job.id}`);
}

// Deliberately does not touch tasks: tasks carry `done` state that a wholesale
// delete+recreate on every edit would silently wipe. Task CRUD lives in the dedicated
// add/toggle/removeJobTask actions below; the edit form only covers job-level fields
// and assignees (which have no state to lose).
export async function updateJob(
  jobId: string,
  _prevState: JobFormState,
  formData: FormData
): Promise<JobFormState> {
  const { company } = await requireCompany();
  const existing = await db.job.findFirst({ where: { id: jobId, companyId: company.id } });
  if (!existing) return { error: "Työtä ei löytynyt." };
  if (!isJobEditable(existing.status)) {
    return { error: "Valmista tai peruttua työtä ei voi enää muokata." };
  }

  const parsed = parseJobForm(formData);
  if (!parsed.success) {
    return { error: "Tarkista lomakkeen tiedot.", fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const customer = await db.customer.findFirst({
    where: { id: parsed.data.customerId, companyId: company.id },
  });
  if (!customer) return { error: "Valittua asiakasta ei löytynyt." };

  const assigneeIds = await validAssigneeIds(company.id, parsed.data.assigneeIds);

  await db.$transaction(async (tx) => {
    await tx.jobAssignee.deleteMany({ where: { jobId } });
    await tx.job.update({
      where: { id: jobId },
      data: {
        customerId: parsed.data.customerId,
        title: parsed.data.title,
        startAt: parsed.data.startAt,
        endAt: parsed.data.endAt,
        street: parsed.data.street,
        postalCode: parsed.data.postalCode,
        city: parsed.data.city,
        notes: parsed.data.notes,
        assignees: { create: assigneeIds.map((userId) => ({ userId })) },
      },
    });
  });

  revalidatePath("/app/jobs");
  redirect(`/app/jobs/${jobId}`);
}

export async function deleteJob(jobId: string) {
  const { company } = await requireCompany();
  const existing = await db.job.findFirst({ where: { id: jobId, companyId: company.id } });
  if (existing && existing.status === "SCHEDULED") {
    await db.job.delete({ where: { id: jobId } });
  }
  revalidatePath("/app/jobs");
  redirect("/app/jobs");
}

export async function updateJobStatus(jobId: string, next: "IN_PROGRESS" | "COMPLETED" | "CANCELLED") {
  const { company } = await requireCompany();
  const existing = await db.job.findFirst({ where: { id: jobId, companyId: company.id } });
  if (!existing) redirect("/app/jobs");

  if (canTransitionJob(existing.status, next)) {
    await db.job.update({ where: { id: jobId }, data: { status: next } });
    revalidatePath("/app/jobs");
  }
  redirect(`/app/jobs/${jobId}`);
}

export async function addJobTask(jobId: string, _prevState: { error: string | null }, formData: FormData) {
  const { company } = await requireCompany();
  const job = await db.job.findFirst({ where: { id: jobId, companyId: company.id } });
  if (!job || !isJobEditable(job.status)) {
    return { error: "Tehtävää ei voitu lisätä." };
  }

  const description = String(formData.get("description") ?? "").trim();
  if (!description) return { error: "Tehtävän kuvaus vaaditaan." };

  const lastTask = await db.jobTask.findFirst({ where: { jobId }, orderBy: { position: "desc" } });
  await db.jobTask.create({
    data: { jobId, description, position: (lastTask?.position ?? -1) + 1 },
  });

  revalidatePath(`/app/jobs/${jobId}`);
  return { error: null };
}

export async function toggleJobTask(taskId: string) {
  const { company } = await requireCompany();
  const task = await db.jobTask.findFirst({
    where: { id: taskId, job: { companyId: company.id } },
    include: { job: true },
  });
  if (!task || !isJobEditable(task.job.status)) redirect("/app/jobs");

  await db.jobTask.update({ where: { id: taskId }, data: { done: !task.done } });
  revalidatePath(`/app/jobs/${task.jobId}`);
  redirect(`/app/jobs/${task.jobId}`);
}

export async function removeJobTask(taskId: string) {
  const { company } = await requireCompany();
  const task = await db.jobTask.findFirst({
    where: { id: taskId, job: { companyId: company.id } },
    include: { job: true },
  });
  if (!task) redirect("/app/jobs");

  if (isJobEditable(task.job.status)) {
    await db.jobTask.delete({ where: { id: taskId } });
    revalidatePath(`/app/jobs/${task.jobId}`);
  }
  redirect(`/app/jobs/${task.jobId}`);
}

export async function convertQuoteToJob(quoteId: string) {
  const { company } = await requireCompany();
  const quote = await db.quote.findFirst({ where: { id: quoteId, companyId: company.id } });
  if (!quote || quote.status !== "ACCEPTED") {
    redirect(`/app/quotes/${quoteId}`);
  }

  const existingJob = await db.job.findFirst({ where: { quoteId } });
  if (existingJob) {
    redirect(`/app/jobs/${existingJob.id}`);
  }

  const job = await db.job.create({
    data: {
      companyId: company.id,
      customerId: quote.customerId,
      quoteId: quote.id,
      title: quote.title ?? `Tarjous #${quote.number}`,
      startAt: new Date(),
      notes: quote.notes,
    },
  });

  revalidatePath("/app/jobs");
  redirect(`/app/jobs/${job.id}/edit`);
}
