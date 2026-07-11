"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import type { JobFormState } from "@/app/app/jobs/actions";
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

export type JobCustomerOption = {
  id: string;
  name: string;
  street: string | null;
  postalCode: string | null;
  city: string | null;
};

export type JobFormValues = {
  customerId: string;
  title: string;
  startAt: string; // "YYYY-MM-DDTHH:mm"
  endAt: string;
  street: string;
  postalCode: string;
  city: string;
  notes: string;
  assigneeIds: string[];
};

const initialState: JobFormState = { error: null };

export function JobForm({
  action,
  customers,
  companyMembers,
  defaultValues,
  submitLabel,
  showTasks = false,
}: {
  action: (prevState: JobFormState, formData: FormData) => Promise<JobFormState>;
  customers: JobCustomerOption[];
  companyMembers: { userId: string; name: string }[];
  defaultValues?: Partial<JobFormValues>;
  submitLabel: string;
  showTasks?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [location, setLocation] = useState({
    street: defaultValues?.street ?? "",
    postalCode: defaultValues?.postalCode ?? "",
    city: defaultValues?.city ?? "",
  });
  const [assigneeIds, setAssigneeIds] = useState<string[]>(defaultValues?.assigneeIds ?? []);
  const [tasks, setTasks] = useState<string[]>([]);
  // Select.Value only resolves an item's label from a value without opening the popup
  // once if Select.Root is given an explicit items map.
  const customerItems = Object.fromEntries(customers.map((c) => [c.id, c.name]));

  function handleCustomerChange(customerId: string | null) {
    // Prefill location from the customer's address, but only on create (no defaultValues
    // yet) and only into fields the user hasn't already typed something into.
    if (defaultValues || !customerId) return;
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;
    setLocation((prev) => ({
      street: prev.street || customer.street || "",
      postalCode: prev.postalCode || customer.postalCode || "",
      city: prev.city || customer.city || "",
    }));
  }

  if (customers.length === 0) {
    return (
      <p className="text-muted-foreground">
        Sinulla ei ole vielä asiakkaita.{" "}
        <Link href="/app/customers/new" className="underline underline-offset-4">
          Lisää ensin asiakas
        </Link>{" "}
        voidaksesi luoda työn.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="assigneeIdsJson" value={JSON.stringify(assigneeIds)} />
      <input
        type="hidden"
        name="tasksJson"
        value={JSON.stringify(tasks.filter((t) => t.trim()).map((description) => ({ description })))}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="customerId">Asiakas</Label>
        <Select
          name="customerId"
          items={customerItems}
          defaultValue={defaultValues?.customerId}
          onValueChange={handleCustomerChange}
        >
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
        <Label htmlFor="title">Otsikko</Label>
        <Input id="title" name="title" defaultValue={defaultValues?.title} required />
        {state.fieldErrors?.title && <p className="text-sm text-destructive">{state.fieldErrors.title}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="startAt">Alkaa</Label>
          <Input
            id="startAt"
            name="startAt"
            type="datetime-local"
            defaultValue={defaultValues?.startAt}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="endAt">Päättyy (valinnainen)</Label>
          <Input id="endAt" name="endAt" type="datetime-local" defaultValue={defaultValues?.endAt} />
          {state.fieldErrors?.endAt && <p className="text-sm text-destructive">{state.fieldErrors.endAt}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="street">Katuosoite</Label>
        <Input
          id="street"
          name="street"
          value={location.street}
          onChange={(e) => setLocation((prev) => ({ ...prev, street: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="postalCode">Postinumero</Label>
          <Input
            id="postalCode"
            name="postalCode"
            value={location.postalCode}
            onChange={(e) => setLocation((prev) => ({ ...prev, postalCode: e.target.value }))}
          />
          {state.fieldErrors?.postalCode && (
            <p className="text-sm text-destructive">{state.fieldErrors.postalCode}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="city">Kaupunki</Label>
          <Input
            id="city"
            name="city"
            value={location.city}
            onChange={(e) => setLocation((prev) => ({ ...prev, city: e.target.value }))}
          />
        </div>
      </div>

      {companyMembers.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label>Vastuulla</Label>
          <div className="flex flex-col gap-1">
            {companyMembers.map((member) => (
              <label key={member.userId} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border-input"
                  checked={assigneeIds.includes(member.userId)}
                  onChange={(e) =>
                    setAssigneeIds((prev) =>
                      e.target.checked ? [...prev, member.userId] : prev.filter((id) => id !== member.userId)
                    )
                  }
                />
                {member.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {showTasks && (
        <div className="flex flex-col gap-2">
          <Label>Tehtävät (valinnainen)</Label>
          <div className="flex flex-col gap-2">
            {tasks.map((task, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={task}
                  placeholder="Tehtävän kuvaus"
                  onChange={(e) =>
                    setTasks((prev) => prev.map((t, i) => (i === index ? e.target.value : t)))
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setTasks((prev) => prev.filter((_, i) => i !== index))}
                >
                  Poista
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => setTasks((prev) => [...prev, ""])}>
              Lisää tehtävä
            </Button>
          </div>
        </div>
      )}

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
