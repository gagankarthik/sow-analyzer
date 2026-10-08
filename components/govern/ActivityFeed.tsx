"use client";

// Requirement 2: every assignment, action, comment and stage change, with who
// and when. Used on the contract page and the document's Audit tab.

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Ban, BadgeCheck, Building2, CheckCircle2, Clock, FileText, Loader2, MessageSquare, PenLine,
  Plug, RefreshCw, Send, ShieldAlert, Undo2, UserRound, Coins, ListChecks, Sonar,
} from "@/components/ui/icons";
import { PersonDot } from "@/components/govern/primitives";
import { useGovernErrorToast } from "@/components/govern/actions/useRunAction";
import { ACTIVITY_LABEL, STAGE_LABEL, personName } from "@/lib/govern/labels";
import { useContractAction, useGovernFeature } from "@/lib/govern/queries";
import type { ActivityAction, ActivityEntry } from "@/lib/govern/types";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "good" | "warn" | "bad" | "brand";

const META: Partial<Record<ActivityAction, { icon: typeof Clock; tone: Tone }>> = {
  intake: { icon: FileText, tone: "neutral" },
  assigned: { icon: UserRound, tone: "brand" },
  reassigned: { icon: UserRound, tone: "brand" },
  approved: { icon: CheckCircle2, tone: "good" },
  office_approved: { icon: CheckCircle2, tone: "good" },
  sent_back: { icon: Undo2, tone: "warn" },
  escalated: { icon: Building2, tone: "warn" },
  rejected: { icon: Ban, tone: "bad" },
  comment: { icon: MessageSquare, tone: "neutral" },
  stage_changed: { icon: ArrowRight, tone: "neutral" },
  blocker_added: { icon: ShieldAlert, tone: "warn" },
  blocker_closed: { icon: CheckCircle2, tone: "good" },
  blocker_edited: { icon: ShieldAlert, tone: "neutral" },
  blocker_reopened: { icon: ShieldAlert, tone: "warn" },
  rescored: { icon: RefreshCw, tone: "brand" },
  signature_sent: { icon: Send, tone: "brand" },
  signed: { icon: PenLine, tone: "good" },
  activated: { icon: BadgeCheck, tone: "good" },
  closed: { icon: CheckCircle2, tone: "neutral" },
  reopened: { icon: RefreshCw, tone: "neutral" },
  revision_received: { icon: FileText, tone: "brand" },
  field_updated: { icon: PenLine, tone: "neutral" },
  overdue: { icon: Clock, tone: "bad" },
  sync: { icon: Plug, tone: "neutral" },
  conflict: { icon: Plug, tone: "warn" },
  obligation_added: { icon: ListChecks, tone: "neutral" },
  obligation_done: { icon: Coins, tone: "good" },
  pi_requested: { icon: UserRound, tone: "neutral" },
  pi_answered: { icon: UserRound, tone: "good" },
};

const TONE: Record<Tone, string> = {
  neutral: "bg-[var(--ink-100)] text-[var(--ink-700)]",
  good: "bg-[var(--success-soft)] text-[var(--success-fg)]",
  warn: "bg-[var(--warning-soft)] text-[var(--warning-fg)]",
  bad: "bg-[var(--danger-soft)] text-[var(--danger)]",
  brand: "bg-structure-soft text-structure-soft-fg",
};

function when(iso: string): { short: string; full: string } {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { short: "—", full: "" };
  return {
    short: d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
    full: d.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" }),
  };
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "Unknown date" : d.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" });
}

/** Newest first, grouped by day. */
export function ActivityFeed({ entries, limit, className }: { entries: ActivityEntry[]; limit?: number; className?: string }) {
  const [showAll, setShowAll] = useState(false);
  // Sync and sync-conflict entries imply a live Huron/Workday connection, which
  // is a "Later" feature: they stay in the log but are not shown while it is off.
  const isIntegrationsOn = useGovernFeature("integrations");
  const sorted = entries
    .filter((e) => isIntegrationsOn || (e.action !== "sync" && e.action !== "conflict"))
    .sort((a, b) => b.at.localeCompare(a.at));
  const shown = limit && !showAll ? sorted.slice(0, limit) : sorted;

  if (sorted.length === 0) {
    return <p className="rounded-lg border border-dashed border-[var(--ink-300)] px-4 py-8 text-center text-sm text-[var(--ink-600)]">Nothing has happened yet. Actions, comments and stage changes appear here.</p>;
  }

  const groups: { day: string; items: ActivityEntry[] }[] = [];
  for (const e of shown) {
    const day = dayKey(e.at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(e);
    else groups.push({ day, items: [e] });
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {groups.map((g) => (
        <section key={g.day} aria-label={g.day}>
          <h4 className="mb-3 text-sm font-semibold text-[var(--ink-800)]">{g.day}</h4>
          <ol className="relative flex flex-col gap-4 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-border">
            {g.items.map((e) => <ActivityRow key={e.id} entry={e} />)}
          </ol>
        </section>
      ))}
      {limit && sorted.length > limit && (
        <Button type="button" variant="outline" className="self-start" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show fewer" : `Show all ${sorted.length} entries`}
        </Button>
      )}
    </div>
  );
}

function ActivityRow({ entry: e }: { entry: ActivityEntry }) {
  const meta = META[e.action] ?? { icon: Clock, tone: "neutral" as Tone };
  const Icon = meta.icon;
  const t = when(e.at);
  const isComment = e.action === "comment";
  return (
    <li className="relative flex gap-3">
      <span className={cn("relative z-10 inline-flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-card", TONE[meta.tone])}>
        <Icon size={14} aria-hidden />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-semibold text-foreground">{ACTIVITY_LABEL[e.action] ?? e.action}</span>
          {e.fromStage && e.toStage && e.fromStage !== e.toStage && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--ink-600)]">
              {STAGE_LABEL[e.fromStage]}<ArrowRight size={11} aria-label="to" />{STAGE_LABEL[e.toStage]}
            </span>
          )}
          <time dateTime={e.at} title={t.full} className="ml-auto text-xs tabular-nums text-[var(--ink-500)]">{t.short}</time>
        </div>
        {e.summary && (
          <p className={cn("mt-1 break-words text-sm leading-relaxed text-[var(--ink-700)]", isComment && "rounded-lg border border-border bg-[var(--panel)] px-3 py-2")}>
            {e.summary}
          </p>
        )}
        <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-[var(--ink-600)]">
          {e.actor ? <><PersonDot name={e.actor.name} email={e.actor.email} className="size-5" />{personName(e.actor)}</> : <><Sonar size={12} />Sonar</>}
        </p>
      </div>
    </li>
  );
}

/** A comment box (leaders can comment; it never changes the status). */
export function CommentBox({ contractId, className }: { contractId: string; className?: string }) {
  const action = useContractAction(contractId);
  const onError = useGovernErrorToast();
  const [text, setText] = useState("");

  async function post() {
    const t = text.trim();
    if (!t) return;
    try {
      await action.mutateAsync({ action: "comment", text: t });
      setText("");
      toast.success("Comment added");
    } catch (e) {
      onError(e, "add your comment", contractId);
    }
  }

  return (
    <form
      className={cn("flex flex-col gap-2 rounded-xl border border-border bg-card p-3 focus-within:border-[var(--brand-primary-300)]", className)}
      onSubmit={(e) => { e.preventDefault(); void post(); }}
    >
      <label htmlFor={`comment-${contractId}`} className="sr-only">Add a comment</label>
      <textarea
        id={`comment-${contractId}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void post(); } }}
        rows={2}
        placeholder="Add a comment for everyone working on this contract…"
        className="min-h-14 w-full resize-y bg-transparent text-base leading-relaxed outline-none placeholder:text-muted-foreground md:text-sm"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="hidden text-xs text-[var(--ink-500)] sm:inline">Comments do not change the status.</span>
        <Button type="submit" size="sm" disabled={!text.trim() || action.isPending} className="ml-auto">
          {action.isPending ? <Loader2 size={13} className="animate-spin" /> : <MessageSquare size={13} />}Post comment
        </Button>
      </div>
    </form>
  );
}
