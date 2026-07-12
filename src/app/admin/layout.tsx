import type { ReactNode } from "react";
import Link from "next/link";

import { requirePlatformAdmin } from "@/lib/rbac";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requirePlatformAdmin();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between border-b pb-2">
        <span className="text-sm font-medium text-muted-foreground">Toimi-ylläpito</span>
        <Link href="/app" className="text-sm underline underline-offset-4">
          Takaisin sovellukseen
        </Link>
      </div>
      {children}
    </div>
  );
}
