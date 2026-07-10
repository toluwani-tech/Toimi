"use client";

import { useActionState } from "react";

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
import type { CustomerFormState } from "@/app/app/customers/actions";

type CustomerFormValues = {
  type: "INDIVIDUAL" | "ORGANIZATION";
  name: string;
  email: string;
  phone: string;
  businessId: string;
  street: string;
  postalCode: string;
  city: string;
};

const initialState: CustomerFormState = { error: null };

export function CustomerForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: CustomerFormState, formData: FormData) => Promise<CustomerFormState>;
  defaultValues?: Partial<CustomerFormValues>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="type">Tyyppi</Label>
        <Select name="type" defaultValue={defaultValues?.type ?? "INDIVIDUAL"}>
          <SelectTrigger id="type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="INDIVIDUAL">Henkilö</SelectItem>
            <SelectItem value="ORGANIZATION">Yritys</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nimi</Label>
        <Input id="name" name="name" defaultValue={defaultValues?.name} required />
        {state.fieldErrors?.name && <p className="text-sm text-destructive">{state.fieldErrors.name}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Sähköposti</Label>
          <Input id="email" name="email" type="email" defaultValue={defaultValues?.email} />
          {state.fieldErrors?.email && <p className="text-sm text-destructive">{state.fieldErrors.email}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Puhelin</Label>
          <Input id="phone" name="phone" defaultValue={defaultValues?.phone} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="businessId">Y-tunnus (yrityksille)</Label>
        <Input id="businessId" name="businessId" placeholder="1234567-8" defaultValue={defaultValues?.businessId} />
        {state.fieldErrors?.businessId && (
          <p className="text-sm text-destructive">{state.fieldErrors.businessId}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="street">Katuosoite</Label>
        <Input id="street" name="street" defaultValue={defaultValues?.street} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="postalCode">Postinumero</Label>
          <Input id="postalCode" name="postalCode" placeholder="00100" defaultValue={defaultValues?.postalCode} />
          {state.fieldErrors?.postalCode && (
            <p className="text-sm text-destructive">{state.fieldErrors.postalCode}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="city">Kaupunki</Label>
          <Input id="city" name="city" defaultValue={defaultValues?.city} />
        </div>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Tallennetaan…" : submitLabel}
      </Button>
    </form>
  );
}
