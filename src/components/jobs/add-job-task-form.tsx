"use client";

import { useActionState, useEffect, useRef } from "react";

import { addJobTask } from "@/app/app/jobs/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState = { error: null as string | null };

export function AddJobTaskForm({ jobId }: { jobId: string }) {
  const action = addJobTask.bind(null, jobId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state !== initialState && state.error === null) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex gap-2">
      <Input name="description" placeholder="Uusi tehtävä…" required />
      <Button type="submit" disabled={pending}>
        {pending ? "Lisätään…" : "Lisää"}
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
