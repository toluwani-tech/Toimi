"use client";

import { Button } from "@/components/ui/button";

export function DeleteInvoiceButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm("Poistetaanko lasku pysyvästi?")) {
          e.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="destructive">
        Poista lasku
      </Button>
    </form>
  );
}
