import type { JobStatus } from "@/generated/prisma/client";

const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionJob(current: JobStatus, next: JobStatus): boolean {
  return ALLOWED_TRANSITIONS[current].includes(next);
}

export function isJobEditable(status: JobStatus): boolean {
  return status === "SCHEDULED" || status === "IN_PROGRESS";
}
