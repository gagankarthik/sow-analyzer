import * as React from "react";
import { cn } from "@/lib/utils";

/** A key cap: one key of a shortcut, quiet enough to sit beside a label. */
function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-[var(--ink-200)] bg-[var(--ink-25)] px-1",
        "font-mono text-xs leading-none font-medium text-[var(--ink-600)]",
        className,
      )}
      {...props}
    />
  );
}

export { Kbd };
