import type { ReactNode } from "react";

import { requireUser } from "@/lib/rbac";

export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireUser();

  return <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">{children}</div>;
}
