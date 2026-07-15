import Link from "next/link";
import {
  BarChart3,
  FileText,
  Hammer,
  Receipt,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCompany } from "@/lib/rbac";

const upcomingModules = ["Dokumenttien tallennus", "Ilmoitukset", "Ylläpitäjän hallintapaneeli"];

const modules = [
  {
    title: "Asiakkuudet (CRM)",
    description: "Hallinnoi asiakkaita ja muistiinpanoja.",
    icon: Users,
    links: [{ href: "/app/customers", label: "Avaa asiakkaat" }],
  },
  {
    title: "Tarjoukset",
    description: "Luo tarjouksia, seuraa tilaa ja lataa PDF.",
    icon: FileText,
    links: [{ href: "/app/quotes", label: "Avaa tarjoukset" }],
  },
  {
    title: "Työt ja aikataulu",
    description: "Hallinnoi töitä, tehtäviä ja viikkoaikataulua.",
    icon: Hammer,
    links: [
      { href: "/app/jobs", label: "Avaa työt" },
      { href: "/app/schedule", label: "Avaa aikataulu" },
    ],
  },
  {
    title: "Laskut",
    description: "Luo laskuja, kirjaa maksuja ja seuraa avoimia saatavia.",
    icon: Receipt,
    links: [{ href: "/app/invoices", label: "Avaa laskut" }],
  },
  {
    title: "Kulut",
    description: "Seuraa materiaali-, polttoaine- ja kalustokuluja.",
    icon: Wallet,
    links: [{ href: "/app/expenses", label: "Avaa kulut" }],
  },
  {
    title: "Raportit",
    description: "Liikevaihto, kulut, parhaat asiakkaat ja töiden kannattavuus.",
    icon: BarChart3,
    links: [{ href: "/app/reports", label: "Avaa raportit" }],
  },
  {
    title: "AI-copilot",
    description: "Kysy yrityksesi tiedoista ja saa toimialaneuvontaa.",
    icon: Sparkles,
    links: [{ href: "/app/copilot", label: "Avaa copilot" }],
  },
] satisfies {
  title: string;
  description: string;
  icon: typeof Users;
  links: { href: string; label: string }[];
}[];

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((mod) => (
          <Card key={mod.title}>
            <CardHeader>
              <div className="mb-2 flex size-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <mod.icon className="size-4" />
              </div>
              <CardTitle>
                <h2>{mod.title}</h2>
              </CardTitle>
              <CardDescription>{mod.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-x-4 gap-y-1">
              {mod.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  {link.label} →
                </Link>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Seuraavaksi rakennettavat moduulit</h2>
          </CardTitle>
          <CardDescription>
            Nämä ominaisuudet tulevat myöhemmissä vaiheissa. Toistaiseksi ilmainen
            AI-neuvonantaja, asiakkuudenhallinta, tarjoukset, työt/aikataulu, laskutus, kulut,
            raportit ja AI-copilot ovat käytettävissä.
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
