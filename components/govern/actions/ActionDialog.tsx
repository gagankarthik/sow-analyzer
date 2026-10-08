"use client";

// The frame every reviewer action shares: a plain title, one sentence on what
// will happen, the few inputs it needs, then Cancel and one confirm button.

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export function ActionDialog({
  open, onOpenChange, title, description, confirmLabel, onConfirm, pending, disabled,
  tone = "primary", wide = false, children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  pending?: boolean;
  disabled?: boolean;
  tone?: "primary" | "danger";
  wide?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className={cn("gap-5 p-5 sm:max-w-lg", wide && "sm:max-w-2xl")}>
        <form
          className="contents"
          onSubmit={(e) => {
            e.preventDefault();
            if (!pending && !disabled) onConfirm();
          }}
        >
          <DialogHeader className="pr-8">
            <DialogTitle className="text-lg font-semibold tracking-tight">{title}</DialogTitle>
            {description && <DialogDescription className="text-sm leading-relaxed text-[var(--ink-600)]">{description}</DialogDescription>}
          </DialogHeader>
          {children && <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">{children}</div>}
          <DialogFooter className="-mx-5 -mb-5 p-4">
            <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={pending || disabled}
              className={tone === "danger" ? "bg-[var(--danger)] text-white hover:bg-[var(--danger)]/90" : undefined}
            >
              {pending && <Loader2 size={14} className="animate-spin" />}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** A labelled field inside an action dialog. */
export function Field({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-foreground">{label}</label>
      {children}
      {hint && <p className="text-xs leading-relaxed text-[var(--ink-600)]">{hint}</p>}
    </div>
  );
}

/** Optional note, the same on every action. */
export function NoteField({ id, value, onChange, label = "Note (optional)", placeholder }: {
  id: string; value: string; onChange: (v: string) => void; label?: string; placeholder?: string;
}) {
  return (
    <Field label={label} htmlFor={id}>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Anything the next person should know"}
        rows={3}
        className="min-h-20 w-full rounded-lg border border-input bg-card px-3 py-2 text-base leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
      />
    </Field>
  );
}
