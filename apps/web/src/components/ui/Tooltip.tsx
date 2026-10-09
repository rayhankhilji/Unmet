"use client";

import { Tooltip as TooltipPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function TooltipProvider(props: ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider delayDuration={400} {...props} />;
}

export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-80 max-w-xs rounded-sm bg-primary px-2 py-1 text-body-sm text-primary-foreground shadow-2",
          className,
        )}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}
