import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Size it to the content it stands in for, so nothing shifts when data arrives. */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("skeleton-shimmer rounded-sm", className)}
      {...props}
    />
  );
}
