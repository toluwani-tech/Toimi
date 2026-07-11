"use client";

import { useActionState, useEffect, useRef } from "react";

import { recordPayment, type PaymentFormState } from "@/app/app/invoices/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: PaymentFormState = { error: null };

function today(): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function RecordPaymentForm({ invoiceId }: { invoiceId: string }) {
  const action = recordPayment.bind(null, invoiceId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state !== initialState && state.error === null) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="amountEuros">Summa (€)</Label>
          <Input id="amountEuros" name="amountEuros" type="number" min="0.01" step="0.01" required />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="paidAt">Päivämäärä</Label>
          <Input id="paidAt" name="paidAt" type="date" defaultValue={today()} required />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="method">Maksutapa</Label>
          <Input id="method" name="method" placeholder="Tilisiirto" />
        </div>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Kirjataan…" : "Kirjaa maksu"}
      </Button>
    </form>
  );
}
