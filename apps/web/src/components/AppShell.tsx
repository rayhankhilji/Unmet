import Link from "next/link";
import type { ReactNode } from "react";
import { NavLink } from "@/components/NavLink";
import { ThemeToggle } from "@/components/ThemeToggle";

// Nav lists only pages that exist, so the shell never links to a dead end. About, Evals
// and "Run live" join as their pages ship (ROADMAP P0.T11, P5.T7, P4.T6).

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-70 rounded-md bg-surface-raised px-3 py-2 shadow-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-page items-center justify-between gap-4 px-4 md:px-6">
          <Link
            href="/"
            className="rounded-sm font-display text-title leading-none tracking-normal"
            aria-label="Unmet — home"
          >
            Unmet
          </Link>
          <nav aria-label="Main" className="flex items-center gap-4 md:gap-6">
            <NavLink href="/">Investigations</NavLink>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
    </>
  );
}
