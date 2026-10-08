"use client";

// The contract page (Requirement 3). Above the fold it answers, in one look:
// who has it, how long it has waited, what blocks signature, and the one
// thing to do next. The sections below hold the detail behind each answer.

import { useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatePanel } from "@/components/ui/StatePanel";
import { LastUpdated } from "@/components/ui/LastUpdated";
import { ExternalLink, Loader2 } from "@/components/ui/icons";
import { ActivityFeed, CommentBox } from "@/components/govern/ActivityFeed";
import { BLOCKING_TIERS, AGREEMENT_TYPE_LABEL, STATE_LABEL } from "@/lib/govern/labels";
import { useContract, useGovernFeature } from "@/lib/govern/queries";
import { isForbidden, isNotFound } from "@/lib/api";
import type { ContractDetail } from "@/lib/govern/types";
import { BlockersPreview, BlockersSection } from "./_components/BlockersSection";
import { ContractTabList, useHashTab, type ContractTab } from "./_components/ContractTabs";
import { DetailsSection } from "./_components/DetailsSection";
import { MatrixSection } from "./_components/MatrixSection";
import { MoneySection } from "./_components/MoneySection";
import { NextStepPanel } from "./_components/NextStepPanel";
import { RoundsSection } from "./_components/RoundsSection";
import { Section } from "./_components/SectionParts";
import { StatusPanel } from "./_components/StatusPanel";

/** Route params may arrive still percent-encoded; a stray "%" must not crash the page. */
function safeDecode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export default function ContractPage() {
  const params = useParams<{ id: string }>();
  const id = safeDecode(params?.id ?? "");
  const { data: contract, isLoading, isError, error, isFetching, dataUpdatedAt, refetch } = useContract(id);

  if (isLoading) return <ContractSkeleton />;

  if (!contract) {
    const forbidden = isForbidden(error);
    const missing = isNotFound(error);
    return (
      <StatePanel
        art={missing ? "missing" : "error"}
        title={missing ? "This contract isn't here" : forbidden ? "You don't have access to this contract" : "We couldn't load this contract"}
        description={missing ? "It may have been removed, or the link is out of date." : forbidden ? "Ask a Govern admin to give you access." : "Check your connection and try again. Nothing has been lost."}
        detail={!missing && !forbidden && error instanceof Error ? error.message : undefined}
      >
        {!missing && !forbidden && isError && <Button size="lg" onClick={() => refetch()}>Try again</Button>}
        <Button asChild size="lg" variant="outline"><Link href="/workflow">Back to the workflow</Link></Button>
      </StatePanel>
    );
  }

  return <ContractView contract={contract} isError={isError} isFetching={isFetching} dataUpdatedAt={dataUpdatedAt} onRefresh={() => refetch()} />;
}

function ContractView({ contract: c, isError, isFetching, dataUpdatedAt, onRefresh }: {
  contract: ContractDetail; isError: boolean; isFetching: boolean; dataUpdatedAt: number; onRefresh: () => void;
}) {
  const [tab, setTab] = useHashTab();
  const isObligationsOn = useGovernFeature("obligations");
  const tabsRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLButtonElement>(null);

  /** Opens a section and brings it into view; optionally focuses something in it. */
  function goTo(next: ContractTab, focus?: () => HTMLElement | null) {
    setTab(next);
    window.setTimeout(() => {
      const target = focus?.() ?? tabsRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: focus ? "center" : "start" });
      if (focus) target?.focus({ preventScroll: true });
    }, 30);
  }

  const party = c.sponsor || c.counterparty;
  const openBlockers = c.blockers.filter((b) => b.status === "open").length;
  const toLook = c.review?.clauses.filter((cl) => BLOCKING_TIERS.has(cl.tier) || cl.tier === "review").length ?? 0;
  const gaps = c.captureGaps?.length ?? 0;
  const analysing = c.analysisStatus !== "READY" && c.analysisStatus !== "FAILED";

  return (
    <>
      <PageHeader
        back={{ href: "/workflow", label: "Workflow" }}
        title={c.title || "Untitled agreement"}
        subtitle={[AGREEMENT_TYPE_LABEL[c.agreementType], party, c.piName ? `PI ${c.piName}` : null, c.department].filter(Boolean).join(" · ")}
        actions={
          <>
            <LastUpdated updatedAt={dataUpdatedAt} isFetching={isFetching} onRefresh={onRefresh} failed={isError} />
            <Button asChild variant="outline" size="lg" className="md:h-9">
              <Link href={`/projects/${encodeURIComponent(c.currentDocId)}`}><ExternalLink size={14} />Open document analysis</Link>
            </Button>
          </>
        }
        meta={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--ink-600)]">
            <span className="rounded-md bg-[var(--ink-100)] px-2 py-0.5 text-xs font-semibold text-[var(--ink-800)]">{STATE_LABEL[c.state]}</span>
            {analysing && (
              <span className="inline-flex items-center gap-1.5 text-[var(--ai-ink)]"><Loader2 size={13} className="animate-spin motion-reduce:animate-none" />Sonar is reading the latest version</span>
            )}
            {c.huronRecordId && <span>Huron <span className="font-mono text-xs text-foreground">{c.huronRecordId}</span></span>}
            {c.workdayRef && <span>Workday <span className="font-mono text-xs text-foreground">{c.workdayRef}</span></span>}
          </div>
        }
      />

      <div className="app-container flex flex-col gap-8 py-6 md:py-8">
        {isError && (
          <p role="alert" className="rounded-xl border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
            Couldn&rsquo;t refresh, so this page may be out of date.{" "}
            <button type="button" onClick={onRefresh} className="font-semibold underline underline-offset-2">Try again</button>
          </p>
        )}

        {/* Above the fold: next step + blockers on the left, where it is on the right. */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="flex min-w-0 flex-col gap-5 lg:col-span-7">
            <NextStepPanel contract={c} onUploadRevision={() => goTo("rounds", () => uploadRef.current)} />
            <BlockersPreview contract={c} onSeeAll={() => goTo("blockers")} />
          </div>
          <div className="min-w-0 lg:col-span-5">
            <StatusPanel contract={c} onShowMissing={() => goTo("details", () => document.getElementById("missing-details"))} />
          </div>
        </div>

        <div ref={tabsRef} className="flex scroll-mt-4 flex-col gap-6">
          <ContractTabList
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "blockers", label: "Blockers", badge: openBlockers, tone: "warn" },
              { id: "matrix", label: "Matrix review", badge: toLook, tone: "warn" },
              { id: "rounds", label: "Rounds & versions", badge: c.versions.length },
              { id: "details", label: "Details", badge: gaps, tone: "warn" },
              { id: "money", label: "Money", badge: isObligationsOn ? c.obligationsDue || null : null, tone: "warn" },
              { id: "activity", label: "Activity", badge: c.activity.length },
            ]}
          />
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={-1} className="focus-visible:outline-none">
            {tab === "blockers" && <BlockersSection contract={c} />}
            {tab === "matrix" && <MatrixSection contract={c} />}
            {tab === "rounds" && <RoundsSection contract={c} uploadRef={uploadRef} />}
            {tab === "details" && <DetailsSection contract={c} />}
            {tab === "money" && <MoneySection contract={c} />}
            {tab === "activity" && (
              <Section title="Activity" description="Every assignment, action, comment and stage change, with who and when.">
                <CommentBox contractId={c.contractId} />
                <ActivityFeed entries={c.activity} />
              </Section>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function ContractSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading contract">
      <div>
        <div className="app-container flex flex-col gap-3 pb-7 pt-8">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-2/3 max-w-xl" />
          <Skeleton className="h-4 w-1/3 max-w-xs" />
        </div>
      </div>
      <div className="app-container grid grid-cols-1 gap-5 py-8 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-7">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <Skeleton className="h-[26rem] rounded-xl lg:col-span-5" />
      </div>
    </div>
  );
}
