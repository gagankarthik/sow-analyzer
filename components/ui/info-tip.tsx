"use client";

// A small "i" button that shows an explanation: on hover, on keyboard focus,
// and on tap (touch has no hover). Escape or clicking away closes it. Built
// on Radix Popover, so the panel is focus-safe and announced to assistive
// tech, unlike a hover-only tooltip.

import { useRef, useState, type ReactNode } from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { Info } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const CLOSE_DELAY_MS = 120;

export function InfoTip({
  label,
  title,
  children,
  side = "bottom",
  align = "center",
  className,
  iconSize = 16,
}: {
  /** Accessible name of the button, e.g. "How the risk index is calculated". */
  label: string;
  /** Bold first line inside the panel. */
  title?: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
  iconSize?: number;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = () => {
    clearTimeout(timer.current);
    setOpen(true);
  };
  const hideSoon = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
        type="button"
        aria-label={label}
        onPointerEnter={(e) => e.pointerType === "mouse" && show()}
        onPointerLeave={(e) => e.pointerType === "mouse" && hideSoon()}
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[var(--ink-500)]",
          "transition-colors hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)]",
          className,
        )}
      >
        <Info size={iconSize} strokeWidth={1.75} />
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={12}
          onPointerEnter={show}
          onPointerLeave={hideSoon}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={cn(
            "z-50 w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-[var(--ink-700)] shadow-lg",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          )}
        >
          {title && <p className="mb-1.5 font-semibold text-foreground">{title}</p>}
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
