import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type StarterPlanData = {
  companyFormRecommendation: "TOIMINIMI" | "OY" | "UNDECIDED";
  companyFormReasoning: string;
  registrationChecklist: { step: string; description: string }[];
  vatYelSummary: string;
  insurancePermitNotes: string;
  pricingGuidance: string;
  nextSteps: string[];
};

const companyFormLabel: Record<StarterPlanData["companyFormRecommendation"], string> = {
  TOIMINIMI: "Toiminimi",
  OY: "Osakeyhtiö (Oy)",
  UNDECIDED: "Ei vielä päätetty",
};

export function StarterPlanView({ plan }: { plan: StarterPlanData }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Suositeltu yritysmuoto</CardTitle>
            <Badge>{companyFormLabel[plan.companyFormRecommendation]}</Badge>
          </div>
          <CardDescription>{plan.companyFormReasoning}</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rekisteröintilista</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-3">
            {plan.registrationChecklist.map((item, index) => (
              <li key={item.step} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium">{item.step}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ALV ja YEL</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{plan.vatYelSummary}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vakuutukset ja luvat</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{plan.insurancePermitNotes}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hinnoittelu</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{plan.pricingGuidance}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seuraavat askeleet</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc text-sm text-muted-foreground">
            {plan.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
