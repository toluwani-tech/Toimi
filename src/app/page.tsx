import Link from "next/link";
import { Hammer, MessageCircleQuestion, Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    title: "AI-neuvonantaja",
    description:
      "Kysy yrityksen perustamisesta: toiminimi vai oy, ALV, YEL, vakuutukset, luvat ja hinnoittelu — selkokielisenä keskusteluna.",
    icon: MessageCircleQuestion,
  },
  {
    title: "Tarjoukset ja ajanvaraus",
    description:
      "Luo ammattimaisia tarjouksia puhelimella minuuteissa ja pidä työt aikataulussa yhdellä kalenterilla.",
    icon: Hammer,
  },
  {
    title: "Laskutus",
    description:
      "Muunna valmis työ verkkolaskuksi yhdellä napautuksella — käänteinen ALV ja maksumuistutukset hoituvat automaattisesti.",
    icon: Receipt,
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute top-[-12rem] left-1/2 h-[28rem] w-[44rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
        />
        <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-6 px-4 py-24 text-center sm:py-32">
          <span className="rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            AI-avusteinen työkalu suomalaisille käsityöläisyrityksille
          </span>
          <h1 className="max-w-2xl text-5xl font-semibold tracking-tight text-balance sm:text-6xl">
            Perusta ja pyöritä käsityöläisyritystäsi
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Toimi yhdistää AI-liiketoimintaneuvojan sekä tarjous-, ajanvaraus- ja
            laskutustyökalut yhteen suomenkieliseen sovellukseen.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" nativeButton={false} render={<Link href="/starter" />}>
              Aloita ilmaiseksi
            </Button>
            <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/signup" />}>
              Luo tili
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-4 px-4 pb-24 sm:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <feature.icon className="size-5" />
              </div>
              <CardTitle className="text-base">
                <h2>{feature.title}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
