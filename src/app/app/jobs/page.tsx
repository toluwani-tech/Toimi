import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

export default async function JobsPage() {
  const { company } = await requireCompany();
  const jobs = await db.job.findMany({
    where: { companyId: company.id },
    include: { customer: true, assignees: { include: { user: true } } },
    orderBy: { startAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Työt</h1>
        <Button nativeButton={false} render={<Link href="/app/jobs/new" />}>
          Uusi työ
        </Button>
      </div>

      {jobs.length === 0 ? (
        <p className="text-muted-foreground">Ei vielä töitä. Lisää ensimmäinen työ yllä olevasta painikkeesta.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Otsikko</TableHead>
              <TableHead>Asiakas</TableHead>
              <TableHead>Tila</TableHead>
              <TableHead>Alkaa</TableHead>
              <TableHead>Vastuulla</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell className="font-medium">
                  <Link href={`/app/jobs/${job.id}`} className="hover:underline">
                    {job.title}
                  </Link>
                </TableCell>
                <TableCell>{job.customer.name}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[job.status]}>{statusLabel[job.status]}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Intl.DateTimeFormat("fi-FI", { dateStyle: "short", timeStyle: "short" }).format(job.startAt)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {job.assignees.map((a) => a.user.name ?? a.user.email).join(", ") || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
