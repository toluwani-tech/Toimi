import { Check, X } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteJob, removeJobTask, toggleJobTask, updateJobStatus } from "@/app/app/jobs/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddJobTaskForm } from "@/components/jobs/add-job-task-form";
import { DeleteJobButton } from "@/components/jobs/delete-job-button";
import { cn } from "@/lib/utils";
import { isJobEditable } from "@/lib/jobs/status";
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

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { company } = await requireCompany();

  const job = await db.job.findFirst({
    where: { id, companyId: company.id },
    include: {
      customer: true,
      quote: true,
      assignees: { include: { user: true } },
      tasks: { orderBy: { position: "asc" } },
    },
  });
  if (!job) notFound();

  const address = [job.street, [job.postalCode, job.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");

  const startInProgress = updateJobStatus.bind(null, job.id, "IN_PROGRESS");
  const complete = updateJobStatus.bind(null, job.id, "COMPLETED");
  const cancel = updateJobStatus.bind(null, job.id, "CANCELLED");
  const deleteAction = deleteJob.bind(null, job.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
            <Badge variant={statusVariant[job.status]}>{statusLabel[job.status]}</Badge>
          </div>
          <p className="text-muted-foreground">{job.customer.name}</p>
          {job.quote && (
            <Link href={`/app/quotes/${job.quote.id}`} className="text-sm underline underline-offset-4">
              Tarjous #{job.quote.number} →
            </Link>
          )}
        </div>
        {isJobEditable(job.status) && (
          <div className="flex gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href={`/app/jobs/${job.id}/edit`} />}>
              Muokkaa
            </Button>
            {job.status === "SCHEDULED" && <DeleteJobButton action={deleteAction} />}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Tiedot</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Alkaa</p>
            <p>{new Intl.DateTimeFormat("fi-FI", { dateStyle: "long", timeStyle: "short" }).format(job.startAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Päättyy</p>
            <p>
              {job.endAt
                ? new Intl.DateTimeFormat("fi-FI", { dateStyle: "long", timeStyle: "short" }).format(job.endAt)
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Sijainti</p>
            <p>{address || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Vastuulla</p>
            <p>{job.assignees.map((a) => a.user.name ?? a.user.email).join(", ") || "—"}</p>
          </div>
          {job.notes && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Muistiinpanot</p>
              <p className="whitespace-pre-wrap">{job.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Tehtävät</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {job.tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ei vielä tehtäviä.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {job.tasks.map((task) => {
                const toggleAction = toggleJobTask.bind(null, task.id);
                const removeAction = removeJobTask.bind(null, task.id);
                return (
                  <li key={task.id} className="flex items-center gap-2">
                    <form action={toggleAction}>
                      <button
                        type="submit"
                        aria-label={task.done ? "Merkitse tekemättömäksi" : "Merkitse tehdyksi"}
                        className={cn(
                          "flex size-5 items-center justify-center rounded border",
                          task.done ? "border-primary bg-primary" : "border-input"
                        )}
                        disabled={!isJobEditable(job.status)}
                      >
                        {task.done && <Check className="size-3 text-primary-foreground" />}
                      </button>
                    </form>
                    <span className={cn("flex-1 text-sm", task.done && "text-muted-foreground line-through")}>
                      {task.description}
                    </span>
                    {isJobEditable(job.status) && (
                      <form action={removeAction}>
                        <Button type="submit" variant="ghost" size="icon" aria-label="Poista tehtävä">
                          <X className="size-4" />
                        </Button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {isJobEditable(job.status) && <AddJobTaskForm jobId={job.id} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Tila</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          {job.status === "SCHEDULED" && (
            <>
              <form action={startInProgress}>
                <Button type="submit">Aloita työ</Button>
              </form>
              <form action={cancel}>
                <Button type="submit" variant="outline">
                  Peru
                </Button>
              </form>
            </>
          )}
          {job.status === "IN_PROGRESS" && (
            <>
              <form action={complete}>
                <Button type="submit">Merkitse valmiiksi</Button>
              </form>
              <form action={cancel}>
                <Button type="submit" variant="outline">
                  Peru
                </Button>
              </form>
            </>
          )}
          {(job.status === "COMPLETED" || job.status === "CANCELLED") && (
            <p className="text-sm text-muted-foreground">Ei enää tilamuutoksia saatavilla.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
