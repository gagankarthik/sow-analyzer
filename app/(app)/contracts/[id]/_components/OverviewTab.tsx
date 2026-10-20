"use client";

// The Overview tab (UI_SPEC section 8.3): Sonar's summary when there is one,
// the matrix result, and the top open blockers, each with a way into its tab.

import { ArrowRight, Blocker, Sonar } from "@/components/ui/icons";
import { ListPanel, Panel, PanelEmpty, PanelRow } from "@/components/ds/Panel";
import { OFFICE_LABEL } from "@/lib/govern/labels";
import { useDocument } from "@/lib/queries/documents";
import type { ContractDetail } from "@/lib/govern/types";
import type { ContractTab } from "./ContractTabs";
import { TierBar, TierLegend, blockingCount, totalClauses } from "./TierBar";

const TOP_BLOCKERS = 3;
const NUMBER = new Intl.NumberFormat("en-US");

function TabLink({ to, onOpen, children }: { to: ContractTab; onOpen: (tab: ContractTab) => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(to)}
      className="inline-flex min-h-8 items-center gap-1 rounded-control text-caption font-medium text-fg-link hover:underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary-600)] max-md:min-h-11"
    >
      {children}<ArrowRight size={12} aria-hidden />
    </button>
  );
}

/** Sonar's summary of the current version, read from its document. */
function SonarSummary({ contract: c }: { contract: ContractDetail }) {
  const ready = c.analysisStatus === "READY";
  const doc = useDocument(ready ? c.currentDocId : "");
  const summary = doc.data?.document.summary?.trim();
  if (!ready || !summary) return null;
  return (
    <Panel title={<span className="inline-flex items-center gap-1.5"><Sonar size={16} aria-hidden className="text-[var(--ai-ink)]" />Summary</span>}>
      <p className="max-w-[72ch] whitespace-pre-line text-body leading-relaxed text-fg-primary">{summary}</p>
    </Panel>
  );
}

function MatrixResult({ contract: c, onOpen }: { contract: ContractDetail; onOpen: (tab: ContractTab) => void }) {
  const review = c.review;
  const analyzing = c.analysisStatus !== "READY" && c.analysisStatus !== "FAILED";
  if (!review) {
    return (
      <Panel title="Matrix result" actions={<TabLink to="matrix" onOpen={onOpen}>Matrix</TabLink>}>
        <p className="text-body text-fg-tertiary">{analyzing ? "Sonar is reading" : "Not checked yet"}</p>
      </Panel>
    );
  }
  const total = totalClauses(review.counts);
  const fine = review.counts.within + review.counts.fallback;
  const blocking = blockingCount(review.counts);
  return (
    <Panel
      title="Matrix result"
      meta={`Version ${review.matrixVersion}`}
      actions={<TabLink to="matrix" onOpen={onOpen}>All clauses</TabLink>}
    >
      <div className="flex flex-col gap-3">
        <dl className="flex flex-wrap gap-x-8 gap-y-2">
          <div>
            <dt className="text-caption text-fg-tertiary">Within</dt>
            <dd className="text-2xl font-semibold tabular-nums text-fg-primary">
              {NUMBER.format(fine)}<span className="text-base font-medium text-fg-tertiary"> / {NUMBER.format(total)}</span>
            </dd>
          </div>
          <div>
            <dt className="text-caption text-fg-tertiary">To resolve</dt>
            <dd className={blocking > 0 ? "text-2xl font-semibold tabular-nums text-[var(--warning-fg)]" : "text-2xl font-semibold tabular-nums text-fg-primary"}>
              {NUMBER.format(blocking)}
            </dd>
          </div>
        </dl>
        <TierBar counts={review.counts} />
        <TierLegend counts={review.counts} compact />
      </div>
    </Panel>
  );
}

function OpenBlockers({ contract: c, onOpen }: { contract: ContractDetail; onOpen: (tab: ContractTab) => void }) {
  const open = c.blockers.filter((b) => b.status === "open");
  return (
    <ListPanel
      title="Open blockers"
      meta={open.length > 0 ? NUMBER.format(open.length) : undefined}
      actions={<TabLink to="blockers" onOpen={onOpen}>{open.length > TOP_BLOCKERS ? `All ${NUMBER.format(open.length)}` : "Blockers"}</TabLink>}
    >
      {open.length === 0 ? (
        <PanelEmpty>None open</PanelEmpty>
      ) : (
        <ul>
          {open.slice(0, TOP_BLOCKERS).map((b) => (
            <PanelRow key={b.id} className="flex items-start gap-2.5">
              <Blocker size={16} aria-hidden className="mt-0.5 shrink-0 text-[var(--warning-fg)]" />
              <span className="min-w-0 text-body text-fg-primary">
                <span className="line-clamp-2">{b.text}</span>
                {b.office && <span className="block text-caption text-fg-tertiary">{OFFICE_LABEL[b.office]}</span>}
              </span>
            </PanelRow>
          ))}
        </ul>
      )}
    </ListPanel>
  );
}

export function OverviewTab({ contract: c, onOpen }: { contract: ContractDetail; onOpen: (tab: ContractTab) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <SonarSummary contract={c} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <MatrixResult contract={c} onOpen={onOpen} />
        <OpenBlockers contract={c} onOpen={onOpen} />
      </div>
    </div>
  );
}
