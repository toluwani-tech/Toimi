"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { customerFormSchema, customerNoteSchema } from "@/lib/customers/schemas";
import { requireCompany } from "@/lib/rbac";

export type CustomerFormState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
};

function parseCustomerForm(formData: FormData) {
  return customerFormSchema.safeParse({
    type: formData.get("type"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    businessId: formData.get("businessId"),
    street: formData.get("street"),
    postalCode: formData.get("postalCode"),
    city: formData.get("city"),
  });
}

function firstFieldErrors(fieldErrors: Record<string, string[] | undefined>) {
  const result: Record<string, string> = {};
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) result[key] = messages[0];
  }
  return result;
}

export async function createCustomer(
  _prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const { company } = await requireCompany();
  const parsed = parseCustomerForm(formData);
  if (!parsed.success) {
    return { error: "Tarkista lomakkeen tiedot.", fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const customer = await db.customer.create({
    data: { ...parsed.data, companyId: company.id },
  });

  revalidatePath("/app/customers");
  redirect(`/app/customers/${customer.id}`);
}

export async function updateCustomer(
  customerId: string,
  _prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const { company } = await requireCompany();
  const parsed = parseCustomerForm(formData);
  if (!parsed.success) {
    return { error: "Tarkista lomakkeen tiedot.", fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const result = await db.customer.updateMany({
    where: { id: customerId, companyId: company.id },
    data: parsed.data,
  });
  if (result.count === 0) {
    return { error: "Asiakasta ei löytynyt." };
  }

  revalidatePath("/app/customers");
  revalidatePath(`/app/customers/${customerId}`);
  redirect(`/app/customers/${customerId}`);
}

export async function deleteCustomer(customerId: string) {
  const { company } = await requireCompany();
  await db.customer.deleteMany({ where: { id: customerId, companyId: company.id } });
  revalidatePath("/app/customers");
  redirect("/app/customers");
}

export type NoteFormState = { error: string | null };

export async function addCustomerNote(
  customerId: string,
  _prevState: NoteFormState,
  formData: FormData
): Promise<NoteFormState> {
  const { user, company } = await requireCompany();

  const parsed = customerNoteSchema.safeParse({ content: formData.get("content") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Virheellinen muistiinpano." };
  }

  const customer = await db.customer.findFirst({ where: { id: customerId, companyId: company.id } });
  if (!customer) {
    return { error: "Asiakasta ei löytynyt." };
  }

  await db.customerNote.create({
    data: { customerId, authorId: user.id, content: parsed.data.content },
  });

  revalidatePath(`/app/customers/${customerId}`);
  return { error: null };
}
