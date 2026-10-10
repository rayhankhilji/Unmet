import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function ErrorState({
  title,
  code,
  message,
  action,
  className,
}: {
  title: string;
  code?: string;
  message: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-2 rounded-md border border-danger/40 bg-surface p-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-heading text-danger">{title}</h2>
        {code ? <code className="text-mono text-muted">{code}</code> : null}
      </div>
      <p className="text-body">{message}</p>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
