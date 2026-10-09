"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function NavLink({ href, children }: { href: Route; children: ReactNode }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-sm px-1 py-1 text-body-sm transition-colors duration-fast ease-standard",
        "underline-offset-6 decoration-1 hover:text-text",
        active ? "text-text underline" : "text-muted",
      )}
    >
      {children}
    </Link>
  );
}
