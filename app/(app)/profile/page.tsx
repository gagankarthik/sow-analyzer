"use client";

// Profile: the signed-in person's own account (who they are, what they can
// do, their password and sessions). Workspace configuration lives in
// Settings; the two are kept apart so personal and organization-wide changes
// never mix. Layout: a header card, then settings rows (heading and why on
// the left, the controls on the right).

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/components/auth/AuthProvider";
import { PasswordField, PasswordRules, passwordIsStrong } from "@/components/auth/fields";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonLine, SkeletonRegion } from "@/components/ds/skeletons";
import { avatarTone } from "@/components/ds/Avatar";
import { ConfirmDialog } from "@/components/ds/ConfirmDialog";
import { ArrowRight, Bell, CheckCircle2, Clock, Loader2, LogOut } from "@/components/ui/icons";
import { AuthError, changePassword } from "@/lib/auth/cognito";
import { byEdition, noun } from "@/lib/edition-runtime";
import { GOVERN_ROLE_LABEL, GOVERN_ROLE_SUMMARY } from "@/lib/govern/permissions";
import { useGovernMe, useGovernOrg } from "@/lib/govern/queries";
import { useProjects } from "@/lib/projects-store";
import { ROLE_META } from "@/components/team/roles";

const PROJECT_ROWS = 6;

function initialsOf(name: string): string {
  return name.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Profile" />
      <div className="app-container app-page max-w-4xl">
        <ProfileCard />
        <div className="divide-y divide-[var(--ink-200)] rounded-lg border border-[var(--ink-200)] bg-card">
          <RoleRow />
          <ProjectsRow />
          <PasswordRow />
          <SessionsRow />
          <NotificationsRow />
        </div>
      </div>
    </>
  );
}

/** A settings row: what it is and why on the left, the controls on the right. */
function Row({ id, title, description, children }: { id: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="grid grid-cols-1 gap-4 px-5 py-6 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8 sm:px-6">
      <div>
        <h2 id={`${id}-h`} className="text-[14px] font-semibold text-[var(--ink-900)]">{title}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink-600)]">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/* ── Who you are ─────────────────────────────────────────────────────────── */

function ProfileCard() {
  const { user, status } = useAuth();
  const me = useGovernMe().data;
  const org = useGovernOrg().data?.name;
  if (status === "loading" || !user) {
    return (
      <SkeletonRegion label="your account" className="rounded-lg border border-[var(--ink-200)] bg-card p-6">
        <div aria-hidden className="flex items-center gap-4">
          <Skeleton className="size-14 shrink-0 rounded-full" />
          <div className="min-w-0">
            <SkeletonLine text="text-lg font-semibold" width="w-48" />
            <SkeletonLine text="text-sm" width="w-64" />
          </div>
        </div>
      </SkeletonRegion>
    );
  }
  const name = user.name || user.email.split("@")[0];
  return (
    <section aria-label="Your account" className="overflow-hidden rounded-lg border border-[var(--ink-200)] bg-card">
      {/* A quiet band in the person's own tint, the same one their avatar uses everywhere. */}
      <div aria-hidden data-tone={avatarTone(user.name, user.email)} className="ds-avatar h-16 rounded-none opacity-70" />
      <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-end gap-4">
          <span
            aria-hidden
            data-tone={avatarTone(user.name, user.email)}
            className="ds-avatar -mt-8 inline-flex size-16 shrink-0 items-center justify-center rounded-full text-[20px] font-semibold ring-4 ring-card"
          >
            {initialsOf(name)}
          </span>
          <div className="min-w-0 pb-0.5">
            <p className="truncate text-[20px] font-semibold text-[var(--ink-900)]">{name}</p>
            <p className="flex min-w-0 flex-wrap items-center gap-x-2 text-[13px] text-[var(--ink-600)]">
              <span className="truncate">{user.email}</span>
              {user.emailVerified && (
                <span className="inline-flex items-center gap-1 text-[var(--success-fg)]"><CheckCircle2 size={14} aria-hidden />Verified</span>
              )}
            </p>
          </div>
        </div>
        <dl className="flex flex-wrap gap-2 text-[12px]">
          {me && (
            <div className="inline-flex items-center gap-1.5 rounded-md border border-[var(--ink-200)] bg-[var(--panel)] px-2 py-1">
              <dt className="text-[var(--ink-600)]">Role</dt>
              <dd className="font-medium text-[var(--ink-900)]">{GOVERN_ROLE_LABEL[me.role]}</dd>
            </div>
          )}
          {org && (
            <div className="inline-flex items-center gap-1.5 rounded-md border border-[var(--ink-200)] bg-[var(--panel)] px-2 py-1">
              <dt className="text-[var(--ink-600)]">Organization</dt>
              <dd className="max-w-[14rem] truncate font-medium text-[var(--ink-900)]">{org}</dd>
            </div>
          )}
        </dl>
      </div>
      <p className="border-t border-[var(--ink-200)] bg-[var(--panel)] px-6 py-2.5 text-[12px] text-[var(--ink-600)]">
        Your name and email come from your sign-in. An admin changes them.
      </p>
    </section>
  );
}

function RoleRow() {
  const me = useGovernMe().data;
  return (
    <Row id="role" title="Your role" description="What you can do across the organization. Admins assign roles.">
      {me ? (
        <div className="flex flex-col gap-2">
          <p className="text-[14px] font-medium text-[var(--ink-900)]">{GOVERN_ROLE_LABEL[me.role]}{me.isCreator ? " · created this organization" : ""}</p>
          <p className="text-[13px] leading-relaxed text-[var(--ink-700)]">{GOVERN_ROLE_SUMMARY[me.role]}</p>
        </div>
      ) : (
        <SkeletonLine text="text-sm" width="w-64" />
      )}
    </Row>
  );
}

function ProjectsRow() {
  const projects = useProjects();
  const shown = [...projects].sort((a, b) => a.name.localeCompare(b.name)).slice(0, PROJECT_ROWS);
  return (
    <Row
      id="projects"
      title={byEdition("Your projects", "Your engagements")}
      description={`Where you work, and your role in each ${noun("project")}. Owners change roles from its Team tab.`}
    >
      {projects.length === 0 ? (
        <p className="text-[13px] text-[var(--ink-600)]">You aren&apos;t on any {noun("projects")} yet.</p>
      ) : (
        <>
          <ul className="divide-y divide-[var(--ink-200)] rounded-md border border-[var(--ink-200)]">
            {shown.map((p) => {
              const role = ROLE_META[p.role ?? "viewer"];
              return (
                <li key={p.id}>
                  <Link href={`/projects/${p.id}`} className="flex items-center gap-3 px-3 py-2.5 text-[13px] hover:bg-[var(--hover)]">
                    <span aria-hidden data-tone={avatarTone(p.name, p.id)} className="ds-avatar inline-flex size-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold">
                      {(p.name.trim()[0] ?? "?").toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium text-[var(--ink-900)]">{p.name || "Untitled"}</span>
                    <span className="shrink-0 text-[var(--ink-600)]">{role.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {projects.length > PROJECT_ROWS && (
            <Link href="/projects" className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--brand-primary-700)] hover:underline">
              All {projects.length} {noun("projects")} <ArrowRight size={12} aria-hidden />
            </Link>
          )}
        </>
      )}
    </Row>
  );
}

/* ── Password ────────────────────────────────────────────────────────────── */

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

function PasswordRow() {
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
    <Row id="password" title="Password" description="Change the password you sign in with. Other devices stay signed in until you sign out everywhere.">
      <form onSubmit={submit} noValidate className="flex max-w-md flex-col gap-1">
        {error && (
          <p role="alert" className="mb-3 rounded-md border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">{error}</p>
        )}
        {done && (
          <p role="status" className="mb-3 flex items-start gap-2 rounded-md border border-[var(--success-border)] bg-[var(--success-soft)] px-3 py-2 text-sm text-foreground">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--success-fg)]" aria-hidden />Your password has been changed.
          </p>
        )}
        <PasswordField id="current-password" label="Current password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} error={errors.current} />
        <PasswordField id="new-password" label="New password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} error={errors.next} describedBy="new-password-rules" />
        <PasswordRules id="new-password-rules" value={next} flagUnmet={submitted} />
        <PasswordField id="confirm-password" label="Confirm new password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
        <div className="mt-2">
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden />}
            {busy ? "Changing password…" : "Change password"}
          </Button>
        </div>
      </form>
    </Row>
  );
}

/* ── Sessions and notifications ──────────────────────────────────────────── */

function SessionsRow() {
  const { signOut } = useAuth();
  return (
    <Row id="sessions" title="Sign-in and sessions" description="How long you stay signed in, and ending every session at once.">
      <ul className="flex flex-col gap-4">
        <li className="flex items-start gap-3">
          <Clock size={16} aria-hidden className="mt-0.5 shrink-0 text-[var(--ink-500)]" />
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[var(--ink-900)]">Automatic sign-out</p>
            <p className="text-[13px] text-[var(--ink-600)]">After 30 minutes without activity, with a warning two minutes before.</p>
          </div>
        </li>
        <li className="flex flex-col gap-3 border-t border-[var(--ink-200)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <LogOut size={16} aria-hidden className="mt-0.5 shrink-0 text-[var(--ink-500)]" />
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-[var(--ink-900)]">Sign out everywhere</p>
              <p className="text-[13px] text-[var(--ink-600)]">Ends your session on every device and browser, including this one.</p>
            </div>
          </div>
          <ConfirmDialog
            title="Sign out on every device?"
            description="Every browser and device signed in to your account is signed out, including this one."
            confirmLabel="Sign out everywhere"
            tone="danger"
            onConfirm={() => signOut({ everywhere: true })}
            trigger={
              <Button variant="outline" className="shrink-0">
                <LogOut size={16} aria-hidden />Sign out everywhere
              </Button>
            }
          />
        </li>
      </ul>
    </Row>
  );
}

function NotificationsRow() {
  return (
    <Row id="notifications" title="Notifications" description="Alerts about contracts you own or review.">
      <Link href="/notifications" className="inline-flex items-center gap-2 rounded-md border border-[var(--ink-200)] px-3 py-2 text-[13px] font-medium text-[var(--ink-900)] hover:bg-[var(--hover)]">
        <Bell size={16} aria-hidden className="text-[var(--ink-500)]" />Open your notifications<ArrowRight size={12} aria-hidden />
      </Link>
    </Row>
  );
}
