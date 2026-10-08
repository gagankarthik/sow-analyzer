"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AlertCircle, Check, CheckCircle2, Eye, EyeOff, Loader2 } from "@/components/ui/icons";

/* Building blocks shared by sign in, sign up, confirm and reset. Every field
   keeps a fixed-height message row under it, so an error appearing never moves
   the rest of the form. */

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const authLinkClass =
  "rounded font-medium text-[var(--brand-primary-600)] underline-offset-4 transition-colors hover:text-[var(--brand-primary-700)] hover:underline";

const inputClass = "h-12 rounded-xl px-4 text-lg md:text-base";

/** Move focus to a field by id. Used to land on the first invalid field. */
export function focusField(id: string): void {
  document.getElementById(id)?.focus();
}

export function AuthHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: React.ReactNode;
}) {
  return (
    <div className="mb-6 [@media(min-height:820px)]:mb-8">
      <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-4xl">{title}</h1>
      <p className="mt-3 text-base leading-relaxed text-[var(--ink-600)]">{subtitle}</p>
    </div>
  );
}

/** Label, control and a reserved message row. The message row holds the error
    (id `<htmlFor>-error`) or, when there is none, optional help text. */
export function Field({
  label,
  htmlFor,
  error,
  help,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: React.ReactNode;
  help?: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {hint}
      </div>
      {children}
      <p
        id={`${htmlFor}-error`}
        className={cn(
          "mt-1.5 flex min-h-5 items-start gap-1.5 text-sm",
          error ? "text-[var(--danger)]" : "text-muted-foreground",
        )}
      >
        {error ? (
          <>
            <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden />
            <span>{error}</span>
          </>
        ) : (
          help
        )}
      </p>
    </div>
  );
}

type TextFieldProps = Omit<React.ComponentProps<"input">, "id"> & {
  id: string;
  label: string;
  error?: React.ReactNode;
  help?: React.ReactNode;
  hint?: React.ReactNode;
};

/** A labelled input wired to its message row. */
export function TextField({ id, label, error, help, hint, className, ...props }: TextFieldProps) {
  return (
    <Field label={label} htmlFor={id} error={error} help={help} hint={hint}>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-error`}
        className={cn(inputClass, className)}
        {...props}
      />
    </Field>
  );
}

type PasswordFieldProps = Omit<TextFieldProps, "type"> & {
  /** Extra ids to announce with the field, e.g. the requirements list. */
  describedBy?: string;
};

/** Password input with a show/hide toggle. */
export function PasswordField({
  id,
  label,
  error,
  help,
  hint,
  describedBy,
  className,
  ...props
}: PasswordFieldProps) {
  const [show, setShow] = React.useState(false);
  return (
    <Field label={label} htmlFor={id} error={error} help={help} hint={hint}>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy ? `${id}-error ${describedBy}` : `${id}-error`}
          className={cn(inputClass, "pr-12", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="absolute right-0.5 top-0.5 inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
        >
          {show ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
        </button>
      </div>
    </Field>
  );
}

/** Six-digit emailed code. One input, so paste and SMS/email autofill work. */
export function CodeField({
  id = "code",
  value,
  onChange,
  ...props
}: Omit<TextFieldProps, "id" | "label" | "value" | "onChange" | "type"> & {
  id?: string;
  value: string;
  onChange: (code: string) => void;
}) {
  return (
    <TextField
      id={id}
      label="6-digit code"
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]{6}"
      maxLength={6}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      className="font-mono tracking-[0.5em]"
      {...props}
    />
  );
}

/** Form-level message. The region is always mounted and keeps its height, so
    the error is announced when it appears and nothing below it moves. */
export function FormAlert({ message }: { message?: React.ReactNode }) {
  return (
    <div role="alert" className="min-h-16 pt-3">
      {message ? (
        <div className="flex items-start gap-2 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3.5 py-2.5 text-sm text-[var(--danger)]">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>{message}</span>
        </div>
      ) : null}
    </div>
  );
}

/** Confirmation that something worked (code sent, email verified). */
export function FormNotice({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-xl border border-[var(--success)]/25 bg-[var(--success-soft)] px-3.5 py-2.5 text-sm text-[var(--success-fg)]",
        className,
      )}
    >
      <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}

const pillBase =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-base font-semibold transition-colors disabled:pointer-events-none";

export const primaryPillClass = cn(
  pillBase,
  "w-full bg-[var(--navy)] text-white hover:bg-[var(--navy-accent)] dark:bg-[var(--brand-primary-600)] dark:hover:bg-[var(--brand-primary-700)]",
);

export const secondaryPillClass = cn(
  pillBase,
  "border border-[var(--ink-300)] text-foreground hover:bg-muted disabled:text-muted-foreground",
);

/** Primary action. While busy it stays the same size and says what is happening. */
export function SubmitButton({
  loading,
  loadingLabel,
  children,
}: {
  loading: boolean;
  loadingLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button type="submit" disabled={loading} aria-busy={loading || undefined} className={primaryPillClass}>
      {loading ? (
        <>
          <Loader2 size={16} className="animate-spin" aria-hidden />
          {loadingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

const RULES: { label: string; test: (v: string) => boolean }[] = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "An uppercase and a lowercase letter", test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { label: "A number", test: (v) => /[0-9]/.test(v) },
  { label: "A symbol", test: (v) => /[^a-zA-Z0-9]/.test(v) },
];

export function passwordIsStrong(v: string): boolean {
  return RULES.every((r) => r.test(v));
}

/** Live checklist. `flagUnmet` turns unmet rules red once the field has been
    left or the form submitted. */
export function PasswordRules({
  id,
  value,
  flagUnmet = false,
}: {
  id: string;
  value: string;
  flagUnmet?: boolean;
}) {
  return (
    <ul id={id} aria-label="Password requirements" className="grid gap-x-4 gap-y-1.5 pb-5 sm:grid-cols-2">
      {RULES.map((r) => {
        const ok = r.test(value);
        return (
          <li
            key={r.label}
            className={cn(
              "flex items-center gap-2 text-sm transition-colors",
              ok && "text-[var(--success)]",
              !ok && (flagUnmet ? "text-[var(--danger)]" : "text-muted-foreground"),
            )}
          >
            <span
              aria-hidden
              className={cn(
                "inline-flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                ok ? "border-[var(--success)] bg-[var(--success)] text-white" : "border-current",
              )}
            >
              {ok && <Check size={10} strokeWidth={3} />}
            </span>
            {r.label}
            <span className="sr-only">{ok ? " (met)" : " (not met)"}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** "Step 1 of 2" indicator for the reset flow. */
export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol aria-label="Progress" className="mb-8 flex items-center gap-3">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className={cn("flex items-center gap-2 text-sm", i > 0 && "flex-1")}
          >
            {i > 0 && (
              <span
                aria-hidden
                className={cn("h-px flex-1", done || active ? "bg-[var(--brand-primary-600)]" : "bg-border")}
              />
            )}
            <span
              className={cn(
                "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                done && "bg-[var(--brand-primary-600)] text-white",
                active && "border border-[var(--brand-primary-600)] text-[var(--brand-primary-700)]",
                !done && !active && "border border-border text-muted-foreground",
              )}
            >
              {done ? <Check size={12} strokeWidth={3} aria-hidden /> : i + 1}
            </span>
            <span className={active ? "font-medium text-foreground" : "text-muted-foreground"}>
              {label}
              {done && <span className="sr-only"> (done)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Seconds-remaining countdown for "send again" buttons. */
export function useCooldown(seconds: number, startActive = false) {
  const [left, setLeft] = React.useState(startActive ? seconds : 0);
  const active = left > 0;

  React.useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [active]);

  const start = React.useCallback(() => setLeft(seconds), [seconds]);
  return { left, start };
}

/** Stable error code from the auth layer, or "" for anything else. */
export function authErrorCode(err: unknown): string {
  return err && typeof err === "object" && "code" in err && typeof err.code === "string" ? err.code : "";
}

const RATE_LIMIT_CODES = new Set(["LimitExceededException", "TooManyRequestsException"]);

/** Plain message for the errors every screen can hit. */
export function commonAuthMessage(err: unknown, fallback: string): string {
  const code = authErrorCode(err);
  if (RATE_LIMIT_CODES.has(code)) return "Too many attempts. Wait a few minutes, then try again.";
  if (code === "NetworkError") return "We could not reach the sign-in service. Check your connection and try again.";
  if (code === "NotConfigured") return "Sign-in is not set up for this environment.";
  return fallback;
}
