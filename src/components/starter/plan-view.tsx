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

// CardTitle renders a <div>, not a semantic heading (shadcn/Base UI default here) — wrap
// its text in an actual heading so the plan sections are navigable via screen readers
// and testable via getByRole("heading").
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <CardTitle>
      <h3>{children}</h3>
    </CardTitle>
  );
}

export function StarterPlanView({ plan }: { plan: StarterPlanData }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <SectionTitle>Suositeltu yritysmuoto</SectionTitle>
            <Badge>{companyFormLabel[plan.companyFormRecommendation]}</Badge>
          </div>
          <CardDescription>{plan.companyFormReasoning}</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle>Rekisteröintilista</SectionTitle>
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
          <SectionTitle>ALV ja YEL</SectionTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{plan.vatYelSummary}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle>Vakuutukset ja luvat</SectionTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{plan.insurancePermitNotes}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle>Hinnoittelu</SectionTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{plan.pricingGuidance}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle>Seuraavat askeleet</SectionTitle>
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
