"use client";

import { useActionState, useState } from "react";

import type { CreditNoteFormState } from "@/app/app/invoices/credit-notes/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  newLineItem,
  QuoteLineItemsEditor,
  type EditableLineItem,
} from "@/components/quotes/quote-line-items-editor";

const initialState: CreditNoteFormState = { error: null };

export function CreditNoteForm({
  action,
  submitLabel,
}: {
  action: (prevState: CreditNoteFormState, formData: FormData) => Promise<CreditNoteFormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [items, setItems] = useState<EditableLineItem[]>([newLineItem()]);

  const itemsJson = JSON.stringify(
    items.map((item) => ({
      type: item.type,
      description: item.description,
      quantity: Number(item.quantity) || 0,
      unitPriceCents: Math.round((Number(item.unitPrice) || 0) * 100),
    }))
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="itemsJson" value={itemsJson} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="reason">Syy (valinnainen)</Label>
        <Textarea id="reason" name="reason" rows={3} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Rivit</Label>
        <QuoteLineItemsEditor items={items} onChange={setItems} />
        {state.fieldErrors?.items && <p className="text-sm text-destructive">{state.fieldErrors.items}</p>}
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Tallennetaan…" : submitLabel}
      </Button>
    </form>
  );
}
