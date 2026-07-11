"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import type { QuoteFormState } from "@/app/app/quotes/actions";
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
import { newLineItem, QuoteLineItemsEditor, type EditableLineItem } from "./quote-line-items-editor";

export type QuoteFormValues = {
  customerId: string;
  title: string;
  vatRatePercent: string;
  discountPercent: string;
  reverseVatApplies: boolean;
  notes: string;
  items: EditableLineItem[];
};

const initialState: QuoteFormState = { error: null };

export function QuoteForm({
  action,
  customers,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: QuoteFormState, formData: FormData) => Promise<QuoteFormState>;
  customers: { id: string; name: string }[];
  defaultValues?: Partial<QuoteFormValues>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [items, setItems] = useState<EditableLineItem[]>(defaultValues?.items ?? [newLineItem()]);

  const itemsJson = JSON.stringify(
    items.map((item) => ({
      type: item.type,
      description: item.description,
      quantity: Number(item.quantity) || 0,
      unitPriceCents: Math.round((Number(item.unitPrice) || 0) * 100),
    }))
  );

  if (customers.length === 0) {
    return (
      <p className="text-muted-foreground">
        Sinulla ei ole vielä asiakkaita.{" "}
        <Link href="/app/customers/new" className="underline underline-offset-4">
          Lisää ensin asiakas
        </Link>{" "}
        voidaksesi tehdä tarjouksen.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="itemsJson" value={itemsJson} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="customerId">Asiakas</Label>
        <Select name="customerId" defaultValue={defaultValues?.customerId}>
          <SelectTrigger id="customerId" className="w-full">
            <SelectValue placeholder="Valitse asiakas" />
          </SelectTrigger>
          <SelectContent>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.fieldErrors?.customerId && (
          <p className="text-sm text-destructive">{state.fieldErrors.customerId}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Otsikko (valinnainen)</Label>
        <Input id="title" name="title" defaultValue={defaultValues?.title} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Rivit</Label>
        <QuoteLineItemsEditor items={items} onChange={setItems} />
        {state.fieldErrors?.items && <p className="text-sm text-destructive">{state.fieldErrors.items}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="vatRatePercent">ALV %</Label>
          <Input
            id="vatRatePercent"
            name="vatRatePercent"
            type="number"
            min="0"
            max="100"
            defaultValue={defaultValues?.vatRatePercent ?? "25"}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="discountPercent">Alennus %</Label>
          <Input
            id="discountPercent"
            name="discountPercent"
            type="number"
            min="0"
            max="100"
            defaultValue={defaultValues?.discountPercent ?? "0"}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="reverseVatApplies"
          value="true"
          defaultChecked={defaultValues?.reverseVatApplies}
          className="size-4 rounded border-input"
        />
        Käännetty arvonlisävero (rakennusalan aliurakointi)
      </label>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Muistiinpanot (valinnainen, näkyy tarjouksella)</Label>
        <Textarea id="notes" name="notes" defaultValue={defaultValues?.notes} rows={3} />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Tallennetaan…" : submitLabel}
      </Button>
    </form>
  );
}
