"use client";

// Profile: the signed-in person's own account (who they are, their password,
// their sessions). Workspace configuration lives in Settings; the two are
// kept apart so personal and organisation-wide changes never mix.

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/components/auth/AuthProvider";
import { PasswordField, PasswordRules, passwordIsStrong } from "@/components/auth/fields";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, CheckCircle2, Loader2, LogOut } from "@/components/ui/icons";
import { AuthError, changePassword } from "@/lib/auth/cognito";

function initialsOf(name: string): string {
  return name.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Profile" subtitle="Your own account. Workspace rules, team and integrations are in Settings." />
      <div className="app-container app-page max-w-3xl">
        <AccountSection />
        <PasswordSection />
        <SessionsSection />
      </div>
    </>
  );
}

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-border bg-card shadow-xs">
      <header className="border-b border-border px-5 py-4">
        <h2 id={`${id}-title`} className="text-lg font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-[var(--ink-600)]">{description}</p>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function AccountSection() {
  const { user, status } = useAuth();
  if (status === "loading" || !user) {
    return (
      <Section id="account" title="Account">
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-full" />
          <div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3.5 w-56" /></div>
        </div>
      </Section>
    );
  }
  const name = user.name || user.email.split("@")[0];
  const role = user.groups[0];
  return (
    <Section id="account" title="Account" description="Your name and email come from your sign-in. Ask an admin to change them.">
      <div className="flex items-center gap-4">
        <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--navy-900)] text-lg font-semibold text-white" aria-hidden>
          {initialsOf(name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-foreground">{name}</p>
          <p className="truncate text-sm text-[var(--ink-600)]">{user.email}</p>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-border pt-5 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-[var(--ink-600)]">Email</dt>
          <dd className="mt-1 flex items-center gap-1.5 text-sm text-foreground">
            {user.emailVerified ? (
              <><CheckCircle2 size={14} className="text-[var(--success)]" aria-hidden />Verified</>
            ) : (
              "Not verified"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-[var(--ink-600)]">Role</dt>
          <dd className="mt-1 text-sm capitalize text-foreground">{role ? role.replace(/[-_]/g, " ") : "Member"}</dd>
        </div>
      </dl>
    </Section>
  );
}

function errorText(e: unknown): string {
  if (e instanceof AuthError) {
    // Cognito uses the same code for a wrong password and an expired session.
    if (e.code === "NotAuthorizedException" && /access token/i.test(e.message)) return "Your session has expired. Sign in again, then change your password.";
    if (e.code === "NotAuthorizedException") return "Your current password isn't right.";
    if (e.code === "LimitExceededException") return "Too many attempts. Wait a few minutes and try again.";
    if (e.code === "InvalidPasswordException") return "The new password doesn't meet the requirements.";
    return e.message;
  }
  return "Couldn't change your password. Check your connection and try again.";
}

function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mismatch = confirm.length > 0 && confirm !== next;
  const errors = {
    current: submitted && !current ? "Enter your current password." : undefined,
    next: submitted && !passwordIsStrong(next) ? "Choose a password that meets every requirement." : undefined,
    confirm: (submitted || mismatch) && confirm !== next ? "The passwords don't match." : undefined,
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setError(null);
    setDone(false);
    if (!current || !passwordIsStrong(next) || confirm !== next) return;
    setBusy(true);
    try {
      await changePassword(current, next);
      setCurrent(""); setNext(""); setConfirm(""); setSubmitted(false);
      setDone(true);
      toast.success("Password changed");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section id="password" title="Password" description="Use at least 8 characters with upper and lower case, a number and a symbol.">
      <form onSubmit={submit} noValidate className="flex max-w-md flex-col gap-1">
        {error && (
          <p role="alert" className="mb-3 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]">{error}</p>
        )}
        {done && (
          <p role="status" className="mb-3 flex items-center gap-2 rounded-lg border border-[var(--success-border)] bg-[var(--success-soft)] px-3 py-2.5 text-sm text-foreground">
            <CheckCircle2 size={16} className="text-[var(--success)]" aria-hidden />Your password has been changed. Other devices stay signed in until you use Sign out everywhere below.
          </p>
        )}
        <PasswordField id="current-password" label="Current password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} error={errors.current} />
        <PasswordField id="new-password" label="New password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} error={errors.next} describedBy="new-password-rules" />
        <PasswordRules id="new-password-rules" value={next} flagUnmet={submitted} />
        <PasswordField id="confirm-password" label="Confirm new password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
        <div className="mt-2">
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 size={15} className="animate-spin motion-reduce:animate-none" aria-hidden />}
            {busy ? "Changing password…" : "Change password"}
          </Button>
        </div>
      </form>
    </Section>
  );
}

function SessionsSection() {
  const { signOut } = useAuth();
  return (
    <Section id="sessions" title="Sign-in and sessions">
      <ul className="flex flex-col gap-4">
        <li className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">Automatic sign-out</p>
          <p className="text-sm text-[var(--ink-600)]">After 30 minutes without activity you are signed out, with a warning two minutes before.</p>
        </li>
        <li className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Sign out everywhere</p>
            <p className="text-sm text-[var(--ink-600)]">Ends your session on every device and browser, including this one.</p>
          </div>
          <Button variant="outline" onClick={() => signOut({ everywhere: true })} className="shrink-0">
            <LogOut size={15} aria-hidden />Sign out everywhere
          </Button>
        </li>
        <li className="border-t border-border pt-4">
          <Link href="/notifications" className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)]">
            Your notifications <ArrowRight size={14} aria-hidden />
          </Link>
        </li>
      </ul>
    </Section>
  );
}
