"use client";

import { Button } from "@/components/ui/button";

export function DeleteExpenseButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm("Poistetaanko kulu pysyvästi?")) {
          e.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="destructive" size="sm">
        Poista
      </Button>
    </form>
  );
}
