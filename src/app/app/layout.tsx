import type { ReactNode } from "react";

import { AppNav } from "@/components/app-nav";
import { requireUser } from "@/lib/rbac";

export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireUser();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <AppNav />
      {children}
    </div>
  );
}
