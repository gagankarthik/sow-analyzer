"use client";

// The right rail: who signs off and where each one stands, the latest three
// activity entries, the agreements this one belongs with, and the documents
// (each version opens in its workspace or downloads as uploaded).

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Check, Download, FileText, Loader2, X } from "@/components/ui/icons";
import { ListPanel, PanelEmpty } from "@/components/ds/Panel";
import { ContractFamily } from "@/components/govern/ContractFamily";
import { shortDate } from "@/components/govern/ContractFacts";
import { getDocFile } from "@/lib/api";
import { ACTIVITY_LABEL, OFFICE_LABEL, personName } from "@/lib/govern/labels";
import { contractSteps, type StepPerson } from "@/lib/govern/steps";
import type { ActivityEntry, ContractDetail, ContractVersion } from "@/lib/govern/types";
import { cn } from "@/lib/utils";

import { SonarName, withSonar } from "@/components/ui/SonarText";
const LATEST = 3;

/* ─── Sign-offs ──────────────────────────────────────────────────── */

function SignOffMark({ status }: { status: StepPerson["status"] }) {
  if (status === "done") {
    return <span aria-hidden className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--success)] text-white"><Check size={12} strokeWidth={3} /></span>;
  }
  if (status === "stopped") {
    return <span aria-hidden className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--danger)] text-white"><X size={12} strokeWidth={3} /></span>;
  }
  return (
    <span
      aria-hidden
      className={cn("size-5 shrink-0 rounded-full border-[1.5px] bg-card", status === "current" || status === "waiting" ? "border-[var(--brand-primary-800)]" : "border-[var(--ink-300)]")}
    />
  );
}

/** The reviewer, each office the matrix routes to, and the signatory. */
function SignOffs({ contract: c }: { contract: ContractDetail }) {
  const approvals = c.routing?.approvals ?? [];
  const rows = contractSteps(c)
    .filter((s) => s.id === "review" || s.id === "approvals" || s.id === "signature")
    .flatMap((s) => s.people);
  if (rows.length === 0) return null;
  return (
    <ListPanel title="Sign-offs" as="h2">
      <ul className="py-1.5">
        {rows.map((p, i) => {
          const at = p.status === "done"
            ? approvals.find((a) => (a.office === "reviewer" ? p.role === "Reviewer" : OFFICE_LABEL[a.office] === p.role))?.at
            : undefined;
          const note = [p.person ? personName(p.person) : null, p.statusLabel.toLowerCase(), at ? shortDate(at) : null].filter(Boolean).join(" · ");
          return (
            <li key={`${p.role}-${i}`} className="flex items-center gap-3 px-4 py-2">
              <SignOffMark status={p.status} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-body font-semibold text-fg-primary">{p.role}</span>
                <span className="truncate text-caption text-[var(--ink-600)]">{note.charAt(0).toUpperCase() + note.slice(1)}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </ListPanel>
  );
}

/* ─── Latest activity ────────────────────────────────────────────── */

function when(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function ActivityLine({ entry: e }: { entry: ActivityEntry }) {
  const name = e.actor ? personName(e.actor) : "Sonar";
  // Summaries are full sentences that usually start with the actor's name;
  // bold that name rather than printing it twice.
  const rest = e.summary
    ? (e.summary.startsWith(name) ? e.summary.slice(name.length) : null)
    : " " + (ACTIVITY_LABEL[e.action] ?? e.action).toLowerCase();
  return (
    <li className="flex flex-col px-4 py-2">
      <span className="line-clamp-2 text-body text-fg-primary">
        {rest === null ? withSonar(e.summary) : <>{e.actor ? <span className="font-semibold">{name}</span> : <SonarName />}{rest}</>}
      </span>
      <time dateTime={e.at} className="text-caption tabular-nums text-[var(--ink-600)]">{when(e.at)}</time>
    </li>
  );
}

function LatestActivity({ contract: c, onAll }: { contract: ContractDetail; onAll: () => void }) {
  const latest = [...c.activity].sort((a, b) => b.at.localeCompare(a.at)).slice(0, LATEST);
  return (
    <ListPanel
      title="Latest activity"
      as="h2"
      footer={
        <button
          type="button"
          onClick={onAll}
          className="inline-flex min-h-8 items-center rounded-control text-body font-semibold text-[var(--brand-primary-700)] hover:underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary-600)] max-md:min-h-11"
        >
          All activity
        </button>
      }
    >
      {latest.length === 0 ? <PanelEmpty>Nothing yet</PanelEmpty> : <ol className="py-1.5">{latest.map((e) => <ActivityLine key={e.id} entry={e} />)}</ol>}
    </ListPanel>
  );
}

/* ─── Documents ──────────────────────────────────────────────────── */

function DocumentRow({ version: v, latest }: { version: ContractVersion; latest: boolean }) {
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    try {
      const f = await getDocFile(v.docId);
      window.open(f.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error("Couldn't open the file", { description: e instanceof Error ? e.message : "Try again." });
    } finally {
      setBusy(false);
    }
  }
  return (
    <li className="flex min-w-0 items-center gap-2 border-b border-border-subtle px-4 py-2.5 last:border-b-0">
      <FileText size={16} aria-hidden className="shrink-0 text-[var(--ink-500)]" />
      <Link href={`/projects/${encodeURIComponent(v.docId)}`} className="min-w-0 flex-1 rounded-sm hover:underline underline-offset-2">
        <span className="block truncate text-body font-medium text-fg-primary" title={v.title}>{v.title || "Untitled"}</span>
        <span className="block text-caption text-[var(--ink-600)]">
          {[latest ? "Latest" : null, `Round ${v.round}`, shortDate(v.createdAt)].filter(Boolean).join(" · ")}
        </span>
      </Link>
      <Button type="button" variant="ghost" size="icon-sm" onClick={download} disabled={busy} aria-label={`Download ${v.title || "file"}`}>
        {busy ? <Loader2 size={16} aria-hidden className="animate-spin motion-reduce:animate-none" /> : <Download size={16} aria-hidden />}
      </Button>
    </li>
  );
}

function Documents({ contract: c }: { contract: ContractDetail }) {
  const ordered = [...c.versions].reverse();
  return (
    <ListPanel title="Documents" as="h2" meta={ordered.length > 1 ? ordered.length : undefined}>
      {ordered.length === 0 ? (
        <PanelEmpty>
          <Link href={`/projects/${encodeURIComponent(c.currentDocId)}`} className="font-medium text-[var(--brand-primary-700)] hover:underline">Open the current version</Link>
        </PanelEmpty>
      ) : (
        <ul>{ordered.map((v, i) => <DocumentRow key={v.docId} version={v} latest={i === 0} />)}</ul>
      )}
    </ListPanel>
  );
}

export function ContractSidebar({ contract: c, onAllActivity }: { contract: ContractDetail; onAllActivity: () => void }) {
  const hasFamily = !!c.parentContractId || (c.amendmentIds?.length ?? 0) > 0;
  return (
    <aside aria-label="Sign-offs and activity" className="flex min-w-0 flex-col gap-4 lg:col-span-4">
      <SignOffs contract={c} />
      <LatestActivity contract={c} onAll={onAllActivity} />
      {hasFamily && (
        <div className="rounded-lg border border-[var(--ink-200)] bg-card p-4">
          <ContractFamily contract={c} />
        </div>
      )}
      <Documents contract={c} />
    </aside>
  );
}
