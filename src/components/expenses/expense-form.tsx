"use client";

import { useActionState } from "react";

import type { ExpenseFormState } from "@/app/app/expenses/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const categoryLabel = {
  MATERIAL: "Materiaali",
  FUEL: "Polttoaine",
  EQUIPMENT: "Kalusto",
  OTHER: "Muu",
} as const;

const NO_JOB = "none";

export type ExpenseFormValues = {
  category: keyof typeof categoryLabel;
  description: string;
  amountEuros: string;
  vendor: string;
  incurredAt: string;
  jobId: string;
  notes: string;
};

const initialState: ExpenseFormState = { error: null };

export function ExpenseForm({
  action,
  jobs,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: ExpenseFormState, formData: FormData) => Promise<ExpenseFormState>;
  jobs: { id: string; title: string }[];
  defaultValues?: Partial<ExpenseFormValues>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const categoryItems = categoryLabel;
  const jobItems = { [NO_JOB]: "Ei liitettyä työtä", ...Object.fromEntries(jobs.map((j) => [j.id, j.title])) };

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="category">Kategoria</Label>
        <Select name="category" items={categoryItems} defaultValue={defaultValues?.category ?? "OTHER"}>
          <SelectTrigger id="category" className="w-full">
            <SelectValue placeholder="Valitse kategoria" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(categoryLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.fieldErrors?.category && <p className="text-sm text-destructive">{state.fieldErrors.category}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Kuvaus</Label>
        <Input id="description" name="description" defaultValue={defaultValues?.description} />
        {state.fieldErrors?.description && (
          <p className="text-sm text-destructive">{state.fieldErrors.description}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="amountEuros">Summa (€)</Label>
          <Input
            id="amountEuros"
            name="amountEuros"
            type="number"
            min="0"
            step="0.01"
            defaultValue={defaultValues?.amountEuros}
          />
          {state.fieldErrors?.amountCents && (
            <p className="text-sm text-destructive">{state.fieldErrors.amountCents}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="incurredAt">Päivämäärä</Label>
          <Input
            id="incurredAt"
            name="incurredAt"
            type="date"
            defaultValue={defaultValues?.incurredAt}
          />
          {state.fieldErrors?.incurredAt && (
            <p className="text-sm text-destructive">{state.fieldErrors.incurredAt}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="vendor">Toimittaja (valinnainen)</Label>
        <Input id="vendor" name="vendor" defaultValue={defaultValues?.vendor} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="jobId">Liitetty työ (valinnainen)</Label>
        <Select name="jobId" items={jobItems} defaultValue={defaultValues?.jobId || NO_JOB}>
          <SelectTrigger id="jobId" className="w-full">
            <SelectValue placeholder="Ei liitettyä työtä" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_JOB}>Ei liitettyä työtä</SelectItem>
            {jobs.map((job) => (
              <SelectItem key={job.id} value={job.id}>
                {job.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Muistiinpanot (valinnainen)</Label>
        <Textarea id="notes" name="notes" defaultValue={defaultValues?.notes} rows={3} />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Tallennetaan…" : submitLabel}
      </Button>
    </form>
  );
}
