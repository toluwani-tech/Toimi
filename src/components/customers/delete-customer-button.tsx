"use client";

import { Button } from "@/components/ui/button";

export function DeleteCustomerButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm("Poistetaanko asiakas pysyvästi?")) {
          e.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="destructive">
        Poista asiakas
      </Button>
    </form>
  );
}
