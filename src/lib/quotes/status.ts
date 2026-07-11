import type { QuoteStatus } from "@/generated/prisma/client";

const ALLOWED_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  DRAFT: ["SENT"],
  SENT: ["ACCEPTED", "REJECTED"],
  ACCEPTED: [],
  REJECTED: [],
};

export function canTransition(current: QuoteStatus, next: QuoteStatus): boolean {
  return ALLOWED_TRANSITIONS[current].includes(next);
}
