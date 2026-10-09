"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { applyTheme } from "@/lib/theme";

export function ThemeToggle() {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Toggle dark mode"
      onClick={() => {
        const dark = document.documentElement.classList.contains("dark");
        applyTheme(dark ? "light" : "dark");
      }}
    >
      <Moon className="dark:hidden" aria-hidden />
      <Sun className="hidden dark:block" aria-hidden />
    </Button>
  );
}
