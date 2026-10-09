"use client";

import { Toaster as Sonner } from "sonner";

/** Sonner styled with tokens. Error toasts are raised with `duration: Infinity` so they persist. */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "!rounded-md !border !border-border !bg-surface-raised !text-text !shadow-2 !font-sans !text-body-sm",
          description: "!text-muted",
          error: "!border-danger/50",
          success: "!border-success/50",
        },
      }}
      style={{ zIndex: 70 }}
    />
  );
}
