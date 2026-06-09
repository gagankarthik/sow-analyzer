"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "@/components/ui/icons";

export function AuthHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: React.ReactNode;
}) {
  return (
    <div className="mb-7">
      <h1 className="text-[24px] font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-1.5 text-[13.5px] text-muted-foreground leading-relaxed">{subtitle}</p>
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  children,
  hint,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={htmlFor} className="text-[12.5px] font-medium text-foreground">
          {label}
        </label>
        {hint}
      </div>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-[11.5px] text-[var(--danger)]">
          <AlertCircle size={11} />
          {error}
        </p>
      )}
    </div>
  );
}

export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  placeholder?: string;
  invalid?: boolean;
}) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        className="h-10 pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded text-muted-foreground transition-colors hover:text-foreground"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2.5 text-[12.5px] text-[var(--danger)]"
    >
      <AlertCircle size={14} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

const RULES: { label: string; test: (v: string) => boolean }[] = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "An uppercase & lowercase letter", test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { label: "A number", test: (v) => /[0-9]/.test(v) },
  { label: "A symbol", test: (v) => /[^a-zA-Z0-9]/.test(v) },
];

export function passwordIsStrong(v: string): boolean {
  return RULES.every((r) => r.test(v));
}

export function PasswordRules({ value }: { value: string }) {
  return (
    <ul className="grid grid-cols-1 gap-1 pt-0.5">
      {RULES.map((r) => {
        const ok = r.test(value);
        return (
          <li
            key={r.label}
            className={cn(
              "flex items-center gap-1.5 text-[11.5px] transition-colors",
              ok ? "text-[var(--success)]" : "text-muted-foreground",
            )}
          >
            <CheckCircle2 size={12} className={ok ? "opacity-100" : "opacity-30"} />
            {r.label}
          </li>
        );
      })}
    </ul>
  );
}
