import type { ReactNode } from "react";
import { LineDrawing } from "@/components/LineDrawing";
import { cn } from "@/lib/cn";

export function EmptyState({
  title,
  children,
  action,
  className,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-4 py-12 text-center", className)}>
      <LineDrawing className="text-muted" />
      <h2 className="text-heading">{title}</h2>
      {children ? <div className="max-w-measure text-body text-muted">{children}</div> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
