import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCompany } from "@/lib/rbac";

const upcomingModules = ["AI Copilot", "Dokumenttien tallennus", "Ilmoitukset", "Ylläpitäjän hallintapaneeli"];

export default async function AppDashboardPage() {
  const { user, membership } = await requireCompany();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tervetuloa, {user.name ?? user.email}</h1>
        <p className="text-muted-foreground">
          {membership.company.name} · rooli: {membership.role}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Asiakkuudet (CRM)</h2>
          </CardTitle>
          <CardDescription>Hallinnoi asiakkaita ja muistiinpanoja.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/app/customers" className="text-sm underline underline-offset-4">
            Avaa asiakkaat →
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Tarjoukset</h2>
          </CardTitle>
          <CardDescription>Luo tarjouksia, seuraa tilaa ja lataa PDF.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/app/quotes" className="text-sm underline underline-offset-4">
            Avaa tarjoukset →
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Työt ja aikataulu</h2>
          </CardTitle>
          <CardDescription>Hallinnoi töitä, tehtäviä ja viikkoaikataulua.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Link href="/app/jobs" className="text-sm underline underline-offset-4">
            Avaa työt →
          </Link>
          <Link href="/app/schedule" className="text-sm underline underline-offset-4">
            Avaa aikataulu →
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Laskut</h2>
          </CardTitle>
          <CardDescription>Luo laskuja, kirjaa maksuja ja seuraa avoimia saatavia.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/app/invoices" className="text-sm underline underline-offset-4">
            Avaa laskut →
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Kulut</h2>
          </CardTitle>
          <CardDescription>Seuraa materiaali-, polttoaine- ja kalustokuluja.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/app/expenses" className="text-sm underline underline-offset-4">
            Avaa kulut →
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Raportit</h2>
          </CardTitle>
          <CardDescription>Liikevaihto, kulut, parhaat asiakkaat ja töiden kannattavuus.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/app/reports" className="text-sm underline underline-offset-4">
            Avaa raportit →
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Seuraavaksi rakennettavat moduulit</h2>
          </CardTitle>
          <CardDescription>
            Nämä ominaisuudet tulevat myöhemmissä vaiheissa. Toistaiseksi ilmainen
            AI-neuvonantaja, asiakkuudenhallinta, tarjoukset, työt/aikataulu, laskutus, kulut
            ja raportit ovat käytettävissä.
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
