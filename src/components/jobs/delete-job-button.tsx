"use client";

import { Button } from "@/components/ui/button";

export function DeleteJobButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm("Poistetaanko työ pysyvästi?")) {
          e.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="destructive">
        Poista työ
      </Button>
    </form>
  );
}
