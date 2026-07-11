import type { InvoiceStatus } from "@/generated/prisma/client";

const ALLOWED_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["PAID", "CANCELLED"],
  PAID: [],
  CANCELLED: [],
};

export function canTransitionInvoice(current: InvoiceStatus, next: InvoiceStatus): boolean {
  return ALLOWED_TRANSITIONS[current].includes(next);
}

/** Overdue is derived at render time, never stored — avoids needing a background job
 * to flip statuses as time passes. */
export function isInvoiceOverdue(
  invoice: { status: InvoiceStatus; dueDate: Date | null },
  paidCents: number,
  totalCents: number,
  now: Date = new Date()
): boolean {
  if (invoice.status !== "SENT") return false;
  if (!invoice.dueDate) return false;
  if (paidCents >= totalCents) return false;
  return invoice.dueDate.getTime() < now.getTime();
}
