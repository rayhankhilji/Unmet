import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Card({
  className,
  interactive = false,
  ...props
}: ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-md border border-border bg-surface",
        interactive &&
          "transition-shadow duration-fast ease-standard hover:shadow-1 focus-within:shadow-1",
        className,
      )}
      {...props}
    />
  );
}
