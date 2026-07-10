"use client";

import { useActionState, useEffect, useRef } from "react";

import { addCustomerNote, type NoteFormState } from "@/app/app/customers/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initialState: NoteFormState = { error: null };

export function AddNoteForm({ customerId }: { customerId: string }) {
  const addNote = addCustomerNote.bind(null, customerId);
  const [state, formAction, pending] = useActionState(addNote, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state !== initialState && state.error === null) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <Textarea name="content" placeholder="Lisää muistiinpano tai yhteydenoton yhteenveto…" rows={3} required />
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Tallennetaan…" : "Lisää muistiinpano"}
      </Button>
    </form>
  );
}
