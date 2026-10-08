"use client";

import { byEdition } from "@/lib/edition-runtime";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Check, X } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────
   Getting started — a new workspace's first three jobs, ticked off
   from real data (projects, uploads, finished analyses). It leads
   the dashboard until all three are done or the user dismisses it.
   ────────────────────────────────────────────────────────────── */

const DISMISS_KEY = "blueiq:getting-started-dismissed";
const listeners = new Set<() => void>();

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}
function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function dismiss() {
  try {
    window.localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* private mode: it will show again next visit */
  }
  listeners.forEach((fn) => fn());
}

export function GettingStarted({
  projectCount,
  documentCount,
  firstReadyDocId,
  resumeSetup = false,
}: {
  projectCount: number;
  documentCount: number;
  /** A document whose analysis has finished, if any. */
  firstReadyDocId?: string;
  /** The setup guide was started but not finished: offer the way back in. */
  resumeSetup?: boolean;
}) {
  // Server render and first client paint both assume "dismissed", so nothing flashes.
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => true);

  const steps = [
    {
      title: byEdition("Create your first project", "Create your first engagement"),
      body: byEdition("A project groups a contract with its amendments, so value and risk roll up in one place.", "An engagement groups an MSA with its SOWs and change orders, so value and risk roll up in one place."),
      done: projectCount > 0,
      action: { label: "New project", href: "/projects/new" },
    },
    {
      title: "Upload a contract",
      body: "PDF, DOCX or TXT, up to 50 MB. Analysis starts when the upload finishes.",
      done: documentCount > 0,
      action: { label: "Upload", href: "/projects/upload" },
    },
    {
      title: "Read the analysis",
      body:
        documentCount > 0 && !firstReadyDocId
          ? "Your contract is still being analyzed. It appears here when it is ready."
          : "See how many clauses were found and review the ones rated high or critical.",
      done: false,
      action: firstReadyDocId ? { label: "Open the clause analysis", href: `/projects/${firstReadyDocId}/sow` } : undefined,
    },
  ];
  const next = steps.findIndex((s) => !s.done);
  const doneCount = steps.filter((s) => s.done).length;

  if (dismissed) return null;

  return (
    <section aria-labelledby="getting-started-title" className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 md:px-6">
        <div>
          <h2 id="getting-started-title" className="text-lg font-semibold text-foreground">
            Get your first contract reviewed
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {doneCount} of {steps.length} steps done
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {resumeSetup && (
            <Button variant="outline" className="h-10" asChild>
              <Link href="/onboarding">Resume setup</Link>
            </Button>
          )}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss getting started"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <ol className="grid divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
        {steps.map((step, i) => {
          const current = i === next;
          return (
            <li key={step.title} className={cn("flex flex-col gap-3 p-5 md:p-6", current && "bg-structure-soft")}>
              <span
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                  step.done
                    ? "bg-[var(--success)] text-white"
                    : current
                      ? "bg-[var(--brand-primary-600)] text-white"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {step.done ? <Check size={14} strokeWidth={3} aria-label="Done" /> : i + 1}
              </span>
              <div>
                <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                <p className="mt-1 text-sm text-[var(--ink-600)]">{step.body}</p>
              </div>
              {!step.done && step.action && (
                <Button variant={current ? "default" : "outline"} className="mt-auto h-10 w-fit" asChild>
                  <Link href={step.action.href}>{step.action.label}</Link>
                </Button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
