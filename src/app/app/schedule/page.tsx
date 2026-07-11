import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";

const statusLabel = {
  SCHEDULED: "Ajoitettu",
  IN_PROGRESS: "Käynnissä",
  COMPLETED: "Valmis",
  CANCELLED: "Peruttu",
} as const;

const statusVariant = {
  SCHEDULED: "secondary",
  IN_PROGRESS: "default",
  COMPLETED: "default",
  CANCELLED: "destructive",
} as const;

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // shift Sunday(0) to end of week, Monday(1) stays start
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function toDateParam(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const { company } = await requireCompany();

  const requestedDate = week ? new Date(week) : new Date();
  const weekStart = startOfWeek(Number.isNaN(requestedDate.getTime()) ? new Date() : requestedDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const prevWeek = new Date(weekStart);
  prevWeek.setDate(prevWeek.getDate() - 7);
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const jobs = await db.job.findMany({
    where: { companyId: company.id, startAt: { gte: weekStart, lt: weekEnd } },
    include: { customer: true },
    orderBy: { startAt: "asc" },
  });

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return { date, jobs: jobs.filter((job) => isSameDay(job.startAt, date)) };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Aikataulu</h1>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href={`/app/schedule?week=${toDateParam(prevWeek)}`} />}>
            Edellinen viikko
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href={`/app/schedule?week=${toDateParam(nextWeek)}`} />}>
            Seuraava viikko
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
        {days.map(({ date, jobs: dayJobs }) => (
          <div key={date.toISOString()} className="flex flex-col gap-2 rounded-lg border p-2">
            <p className="text-sm font-medium">
              {new Intl.DateTimeFormat("fi-FI", { weekday: "short", day: "numeric", month: "numeric" }).format(date)}
            </p>
            {dayJobs.length === 0 ? (
              <p className="text-xs text-muted-foreground">Ei töitä</p>
            ) : (
              dayJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/app/jobs/${job.id}`}
                  className="flex flex-col gap-1 rounded-md border bg-card p-2 text-xs hover:bg-muted"
                >
                  <span className="font-medium">
                    {new Intl.DateTimeFormat("fi-FI", { timeStyle: "short" }).format(job.startAt)} {job.title}
                  </span>
                  <span className="text-muted-foreground">{job.customer.name}</span>
                  <Badge variant={statusVariant[job.status]} className="w-fit">
                    {statusLabel[job.status]}
                  </Badge>
                </Link>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
