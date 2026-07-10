import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";

const upcomingModules = [
  "Asiakkuudet (CRM)",
  "Tarjoukset",
  "Työt ja ajanvaraus",
  "Laskutus",
  "Kulut",
  "Raportit",
];

export default async function AppDashboardPage() {
  const user = await requireUser();
  const membership = await db.companyMember.findFirst({
    where: { userId: user.id },
    include: { company: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tervetuloa, {user.name ?? user.email}</h1>
        {membership && (
          <p className="text-muted-foreground">
            {membership.company.name} · rooli: {membership.role}
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seuraavaksi rakennettavat moduulit</CardTitle>
          <CardDescription>
            Nämä ominaisuudet tulevat myöhemmissä vaiheissa. Toistaiseksi ilmainen
            AI-neuvonantaja on käytettävissä.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc text-sm text-muted-foreground">
            {upcomingModules.map((mod) => (
              <li key={mod}>{mod}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
