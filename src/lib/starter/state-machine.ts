import type { StarterSessionStatus } from "@/generated/prisma/client";

const STATUS_ORDER: readonly StarterSessionStatus[] = [
  "GATHERING_INFO",
  "ADVISING",
  "PLAN_READY",
];

function rank(status: StarterSessionStatus): number {
  return STATUS_ORDER.indexOf(status);
}

/**
 * The model proposes a status on every turn, but the session's actual status
 * only ever moves forward. This guards against a model hallucinating a
 * regression (e.g. proposing GATHERING_INFO again after reaching PLAN_READY),
 * which would otherwise let a finished plan get silently reopened.
 */
export function advanceStatus(
  current: StarterSessionStatus,
  proposed: StarterSessionStatus
): StarterSessionStatus {
  return rank(proposed) > rank(current) ? proposed : current;
}
