"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar,
  FileText,
  Hammer,
  LayoutDashboard,
  Receipt,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils";

const links = [
  { href: "/app", label: "Yleiskatsaus", icon: LayoutDashboard },
  { href: "/app/customers", label: "Asiakkaat", icon: Users },
  { href: "/app/quotes", label: "Tarjoukset", icon: FileText },
  { href: "/app/jobs", label: "Työt", icon: Hammer },
  { href: "/app/schedule", label: "Aikataulu", icon: Calendar },
  { href: "/app/invoices", label: "Laskut", icon: Receipt },
  { href: "/app/expenses", label: "Kulut", icon: Wallet },
  { href: "/app/reports", label: "Raportit", icon: BarChart3 },
  { href: "/app/copilot", label: "Copilot", icon: Sparkles },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto border-b px-1 pb-3">
      {links.map((link) => {
        const active = link.href === "/app" ? pathname === "/app" : pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
