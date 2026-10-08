"use client";

import { cn } from "@/lib/utils";
import { Check } from "@/components/ui/icons";

/** Multi-select as a row of pressable chips (wraps; never scrolls sideways). */
export function ToggleChips<T extends string>({
  label, options, values, onChange, disabled, hint,
}: {
  label: string;
  options: { value: T; label: string }[];
  values: T[];
  onChange: (next: T[]) => void;
  disabled?: boolean;
  hint?: string;
}) {
  const toggle = (v: T) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  return (
    <div role="group" aria-label={label} className="grid gap-1.5">
      <div className="text-sm font-medium text-foreground">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = values.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              disabled={disabled}
              onClick={() => toggle(o.value)}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors sm:min-h-8",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60",
                on
                  ? "border-[var(--brand-primary-600)] bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)]"
                  : "border-[var(--ink-300)] bg-card text-[var(--ink-600)] hover:border-[var(--ink-400)] hover:text-foreground",
              )}
            >
              {on && <Check size={13} aria-hidden />}
              {o.label}
            </button>
          );
        })}
      </div>
      {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );
}
