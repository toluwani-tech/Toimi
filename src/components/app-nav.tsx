"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links = [
  { href: "/app", label: "Yleiskatsaus" },
  { href: "/app/customers", label: "Asiakkaat" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-4 border-b pb-2">
      {links.map((link) => {
        const active = link.href === "/app" ? pathname === "/app" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "text-sm font-medium text-muted-foreground hover:text-foreground",
              active && "text-foreground underline underline-offset-4"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
