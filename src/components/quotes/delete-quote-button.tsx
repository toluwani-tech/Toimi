"use client";

import { Button } from "@/components/ui/button";

export function DeleteQuoteButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm("Poistetaanko tarjous pysyvästi?")) {
          e.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="destructive">
        Poista tarjous
      </Button>
    </form>
  );
}
