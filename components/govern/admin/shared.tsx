"use client";

// Pieces every Govern admin page (review matrix, workflow & routing,
// integrations) shares: who may edit, the read-only note, load/forbidden
// states, a labelled field, a chip-list editor, the unsaved-changes guard and
// the sticky "changes not saved" bar.

import { useEffect, useId, useState } from "react";
import { isForbidden } from "@/lib/api";
import { useGovernMe } from "@/lib/govern/queries";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Loader2, Lock, Plus, RefreshCw, X } from "@/components/ui/icons";

/** Edit rights on admin pages. While `/govern/me` loads (or fails) nobody
 *  edits: the API checks again, but the UI never offers what will be refused. */
export function useAdminAccess(): { isAdmin: boolean; loading: boolean } {
  const me = useGovernMe();
  return { isAdmin: me.data?.role === "admin", loading: me.isLoading };
}

/** Shown on admin pages to anyone who is not an admin. */
export function ReadOnlyNote({ what }: { what?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-[var(--panel)] px-4 py-3">
      <Lock size={16} className="mt-0.5 shrink-0 text-[var(--ink-500)]" aria-hidden />
      <p className="text-sm leading-relaxed text-[var(--ink-700)]">
        <span className="font-semibold text-foreground">Only admins change this.</span>{" "}
        {what ?? "You can see the settings; ask an admin if something needs to change."}
      </p>
    </div>
  );
}

/** Error panel with retry; says "no permission" in plain words on a 403. */
export function LoadError({
  what, error, onRetry, retrying,
}: { what: string; error: unknown; onRetry: () => void; retrying?: boolean }) {
  const forbidden = isForbidden(error);
  return (
    <div role="alert" className="flex flex-col items-center rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-5 py-12 text-center">
      <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-card text-[var(--danger)]">
        {forbidden ? <Lock size={18} /> : <AlertTriangle size={18} />}
      </span>
      <h2 className="text-lg font-semibold text-foreground">
        {forbidden ? `You don't have access to ${what}` : `Couldn't load ${what}`}
      </h2>
      <p className="mt-1 max-w-md break-words text-sm leading-relaxed text-[var(--ink-700)]">
        {forbidden
          ? "Your role doesn't include this page. Ask an admin if you need it."
          : `${error instanceof Error ? error.message : "The request failed."} Nothing is shown because nothing was received.`}
      </p>
      {!forbidden && (
        <Button variant="outline" size="lg" className="mt-5" onClick={onRetry} disabled={retrying}>
          <RefreshCw size={14} className={retrying ? "animate-spin motion-reduce:animate-none" : undefined} />
          Try again
        </Button>
      )}
    </div>
  );
}

export function PageSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label={label}>
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

export function ErrorText({ id, children }: { id?: string; children: React.ReactNode }) {
  return <p id={id} role="alert" className="text-sm text-[var(--danger)] [overflow-wrap:anywhere]">{children}</p>;
}

/** Label + control + hint + error, stacked. */
export function Field({
  label, htmlFor, hint, error, errorId, required, children, className,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string | null;
  errorId?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid min-w-0 gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="font-normal text-muted-foreground"> (required)</span>}
      </label>
      {children}
      {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
      {error && <ErrorText id={errorId}>{error}</ErrorText>}
    </div>
  );
}

/** Editable list of short phrases shown as chips. Enter or "Add" adds one. */
export function ChipListEditor({
  label, values, onChange, placeholder, tone = "neutral", hint, disabled,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  tone?: "danger" | "success" | "neutral";
  hint?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const add = () => {
    const parts = text.split(";").map((s) => s.trim()).filter(Boolean);
    const next = [...values];
    for (const p of parts) if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p);
    if (parts.length) onChange(next);
    setText("");
  };
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={label}>
          {values.map((v) => (
            <li key={v}>
              <Chip tone={tone}>
                <span className="[overflow-wrap:anywhere]">{v}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => onChange(values.filter((x) => x !== v))}
                    aria-label={`Remove “${v}”`}
                    className="-mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded text-current opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <X size={12} />
                  </button>
                )}
              </Chip>
            </li>
          ))}
        </ul>
      )}
      {!disabled && (
        <div className="flex gap-2">
          <input
            id={id}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            placeholder={placeholder}
            className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--ink-300)] bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9 md:text-sm"
          />
          <Button type="button" variant="outline" className="h-10 md:h-9" onClick={add} disabled={!text.trim()}>
            <Plus size={14} />Add
          </Button>
        </div>
      )}
      {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );
}

const CHIP_TONE = {
  danger: "border-[color-mix(in_srgb,var(--danger)_22%,transparent)] bg-[var(--danger-soft)] text-[var(--danger)]",
  success: "border-[color-mix(in_srgb,var(--success)_22%,transparent)] bg-[var(--success-soft)] text-[var(--success-fg)]",
  neutral: "border-[var(--ink-200)] bg-[var(--panel)] text-[var(--ink-700)]",
  info: "border-[color-mix(in_srgb,var(--info)_22%,transparent)] bg-[var(--info-soft)] text-[var(--info)]",
  warning: "border-[color-mix(in_srgb,var(--warning)_25%,transparent)] bg-[var(--warning-soft)] text-[var(--warning-fg)]",
} as const;

export function Chip({ tone = "neutral", children, className }: { tone?: keyof typeof CHIP_TONE; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 text-sm font-medium", CHIP_TONE[tone], className)}>
      {children}
    </span>
  );
}

/**
 * Warns before unsaved edits are lost: on tab close/reload (the browser's own
 * prompt) and on clicks on in-app links (a confirm). The App Router has no
 * navigation-blocking API, so links are intercepted in the capture phase.
 */
export function useUnsavedChangesGuard(dirty: boolean, message = "You have changes that are not saved. Leave this page and lose them?") {
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!window.confirm(message)) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty, message]);
}

/** Sticky bottom bar while there are unsaved edits. */
export function UnsavedBar({
  summary, onDiscard, onSave, saving, saveLabel = "Save changes", disabled,
}: {
  summary: string;
  onDiscard: () => void;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-xl border border-[var(--brand-primary-600)] bg-card px-4 py-3 shadow-md sm:flex-row sm:items-center sm:justify-between" role="region" aria-label="Unsaved changes">
      <p className="text-sm font-medium text-foreground" aria-live="polite">
        <span aria-hidden className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--warning)] align-middle" />
        {summary}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="lg" className="flex-1 sm:flex-none md:h-9" onClick={onDiscard} disabled={saving}>Discard</Button>
        <Button size="lg" className="flex-1 sm:flex-none md:h-9" onClick={onSave} disabled={saving || disabled}>
          {saving ? <><Loader2 size={13} className="animate-spin motion-reduce:animate-none" />Saving…</> : saveLabel}
        </Button>
      </div>
    </div>
  );
}

/** "8 Oct 2026, 14:05" — or "—" when unknown. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** A calendar day ("2026-10-08") read in local time, so it never shifts a day
 *  as lib/format's formatDate does for date-only strings west of UTC. */
export function formatDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
