import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    title: "AI-neuvonantaja",
    description:
      "Kysy yrityksen perustamisesta: toiminimi vai oy, ALV, YEL, vakuutukset, luvat ja hinnoittelu — selkokielisenä keskusteluna.",
  },
  {
    title: "Tarjoukset ja ajanvaraus",
    description:
      "Luo ammattimaisia tarjouksia puhelimella minuuteissa ja pidä työt aikataulussa yhdellä kalenterilla.",
  },
  {
    title: "Laskutus",
    description:
      "Muunna valmis työ verkkolaskuksi yhdellä napautuksella — käänteinen ALV ja maksumuistutukset hoituvat automaattisesti.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-6 px-4 py-24 text-center sm:py-32">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
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
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-4 px-4 pb-24 sm:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <CardTitle className="text-base">{feature.title}</CardTitle>
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
