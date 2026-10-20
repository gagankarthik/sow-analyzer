"use client";

import { useId, useState, type ReactNode } from "react";
import { CheckCircle2, ChevronsDown, ChevronsUp, Hourglass, XCircle } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { Avatar, AvatarStack } from "@/components/ds/Avatar";
import { WAITING_ON_LABEL, personName } from "@/lib/govern/labels";
import { contractSteps, type ContractStep, type StepPerson, type StepStatus } from "@/lib/govern/steps";
import type { Contract } from "@/lib/govern/types";

/* The contract's banner: one sentence saying whose turn it is ("It's time for
   you to review", "Waiting on Legal Affairs"), the next step, who is involved
   and how far along, and one primary action. "Show details" opens every step
   with each person, their role and where they stand. */

function headline(c: Contract, me: string | null): { title: string; tone: "you" | "waiting" | "done" | "stopped" } {
  if (c.state === "rejected") return { title: "Rejected", tone: "stopped" };
  if (c.state === "signed" || c.state === "active") return { title: "Signed and active", tone: "done" };
  if (c.state === "closed") return { title: "Closed", tone: "done" };
  const mine = !!me && c.owner?.email?.toLowerCase() === me;
  if (mine && c.waitingOn.kind === "internal_reviewer") return { title: "It's time for you to review", tone: "you" };
  if (c.state === "ready_to_sign") return { title: mine ? "It's time for you to send this for signature" : "Ready to send for signature", tone: mine ? "you" : "waiting" };
  return { title: c.waitingOn.label || WAITING_ON_LABEL[c.waitingOn.kind], tone: "waiting" };
}

export function StatusBanner({
  contract: c,
  me,
  action,
  compact = false,
  children,
  className,
}: {
  contract: Contract;
  /** The signed-in user's email, lower-cased. */
  me: string | null;
  /** The one primary action for this step. */
  action?: ReactNode;
  /** Tighter type for the preview panel. */
  compact?: boolean;
  /** Detail for the next step (clauses to send back, the office it goes to). */
  children?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const steps = contractSteps(c);
  const current = steps.find((s) => s.status === "current" || s.status === "waiting") ?? null;
  const { title, tone } = headline(c, me);
  const people = (current?.people ?? []).filter((p) => p.person).map((p) => ({ name: p.person!.name, email: p.person!.email, roles: [p.role] }));
  const Icon = tone === "done" ? CheckCircle2 : tone === "stopped" ? XCircle : Hourglass;

  return (
    <section
      aria-label="Where this contract stands"
      className={cn("relative rounded-xl border border-border bg-card shadow-xs", compact ? "p-4" : "p-5 md:p-6", className)}
    >
      <div className={cn("flex flex-col gap-4", !compact && "md:flex-row md:items-start md:justify-between")}>
        <div className="min-w-0">
          <Icon size={compact ? 16 : 20} aria-hidden className={cn(tone === "done" ? "text-[var(--success)]" : tone === "stopped" ? "text-[var(--danger)]" : "text-foreground")} />
          <h2 className={cn("mt-2 font-semibold tracking-tight text-foreground", compact ? "text-base" : "text-xl")}>{title}</h2>
          {c.nextStep?.headline && tone !== "done" && (
            <p className={cn("mt-1 max-w-[62ch] leading-relaxed text-[var(--ink-700)]", compact ? "text-sm" : "text-base")}>{c.nextStep.headline}</p>
          )}
          {current && (
            <div className="mt-3 flex items-center gap-2.5 text-sm text-[var(--ink-600)]">
              {people.length > 0 && <AvatarStack people={people} size="sm" />}
              <span>{current.label}: {current.summary}</span>
            </div>
          )}
          {!compact && <StepMeter steps={steps} />}
        </div>
        {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
      </div>

      {children && <div className="mt-5">{children}</div>}

      {open && <ContractStepList id={detailsId} steps={steps} className="mt-5 border-t border-border pt-4" />}

      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailsId}
        onClick={() => setOpen((v) => !v)}
        className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-medium text-[var(--brand-primary-700)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary-600)] md:min-h-8"
      >
        {open ? <ChevronsUp size={16} aria-hidden /> : <ChevronsDown size={16} aria-hidden />}
        {open ? "Hide steps" : "Show every step"}
      </button>
    </section>
  );
}

/** "Step 3 of 5" with one segment per step: how far along the contract is. */
function StepMeter({ steps }: { steps: ContractStep[] }) {
  const at = steps.findIndex((s) => s.status === "current" || s.status === "waiting" || s.status === "stopped");
  const done = steps.filter((s) => s.status === "done").length;
  if (steps.length < 2) return null;
  const label = at >= 0 ? `Step ${at + 1} of ${steps.length}` : done === steps.length ? "Every step done" : `${done} of ${steps.length} steps done`;
  return (
    <div className="mt-4 flex max-w-sm items-center gap-3">
      <ol className="flex flex-1 gap-1" aria-label={label}>
        {steps.map((s, i) => (
          <li key={i} aria-hidden className={cn("h-1.5 flex-1 rounded-full",
            s.status === "done" ? "bg-[var(--success)]"
              : s.status === "stopped" ? "bg-[var(--danger)]"
              : i === at ? "bg-[var(--brand-primary-600)]" : "bg-[var(--ink-200)]")} />
        ))}
      </ol>
      <span className="shrink-0 text-xs font-medium tabular-nums text-[var(--ink-600)]">{label}</span>
    </div>
  );
}

const STATUS_TONE: Record<StepStatus, string> = {
  done: "text-[var(--ink-700)]",
  current: "font-semibold text-foreground",
  waiting: "font-semibold text-foreground",
  upcoming: "text-[var(--ink-500)]",
  stopped: "text-[var(--danger)]",
};

function StatusMark({ status }: { status: StepStatus }) {
  if (status === "done") return <CheckCircle2 size={16} aria-hidden className="text-[var(--ink-600)]" />;
  if (status === "current" || status === "waiting") return <span aria-hidden className="size-4 rounded-full border-[5px] border-foreground" />;
  if (status === "stopped") return <XCircle size={16} aria-hidden className="text-[var(--danger)]" />;
  return <span aria-hidden className="size-4 rounded-full border-[1.5px] border-dashed border-[var(--ink-400)]" />;
}

/** Every step with its side, where it stands and the people on it (the
 *  banner's "Show every step", and the record page's path guidance). */
export function ContractStepList({ id, steps, className }: { id?: string; steps: ContractStep[]; className?: string }) {
  return (
    <ol id={id} className={cn("flex flex-col gap-1", className)}>
      {steps.map((s) => (
        <li key={s.id} className="py-2">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-sm">
              <span className="font-semibold text-foreground">{s.label}</span>
              <span className="ms-2 text-[var(--ink-500)]">{s.side}</span>
            </p>
            <span className={cn("text-sm", STATUS_TONE[s.status])}>{s.summary}</span>
          </div>
          {s.people.length > 0 && (s.status === "current" || s.status === "waiting" || s.people.length > 1) && (
            <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
              {s.people.map((p, i) => <PersonRow key={`${s.id}-${i}`} p={p} />)}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}

function PersonRow({ p }: { p: StepPerson }) {
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <Avatar name={p.person?.name} email={p.person?.email} size="md" decorative />
      <p className="flex min-w-0 flex-1 items-baseline gap-2 text-sm">
        <span className="truncate font-semibold text-foreground">{p.person ? personName(p.person) : "Not assigned yet"}</span>
        <span className="shrink-0 text-[var(--ink-500)]">{p.role}</span>
      </p>
      <span className={cn("inline-flex shrink-0 items-center gap-2 text-sm", STATUS_TONE[p.status])}>
        {p.statusLabel}
        <StatusMark status={p.status} />
      </span>
    </li>
  );
}
