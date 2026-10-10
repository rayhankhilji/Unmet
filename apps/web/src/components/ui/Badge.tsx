import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-label uppercase [&_svg]:size-3.5",
  {
    variants: {
      variant: {
        neutral: "border-border-strong/40 text-muted",
        info: "border-info/40 text-info",
        warning: "border-warning/40 text-warning",
        danger: "border-danger/40 text-danger",
        success: "border-success/40 text-success",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
