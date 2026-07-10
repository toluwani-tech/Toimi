"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function Nav() {
  const { status } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Toimi
        </Link>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" nativeButton={false} render={<Link href="/starter" />}>
            Aloita yrittäjänä
          </Button>
          <ThemeToggle />
          {status === "authenticated" ? (
            <>
              <Button variant="ghost" nativeButton={false} render={<Link href="/app" />}>
                Sovellus
              </Button>
              <Button variant="outline" onClick={() => signOut({ callbackUrl: "/" })}>
                Kirjaudu ulos
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" nativeButton={false} render={<Link href="/login" />}>
                Kirjaudu
              </Button>
              <Button nativeButton={false} render={<Link href="/signup" />}>
                Luo tili
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
