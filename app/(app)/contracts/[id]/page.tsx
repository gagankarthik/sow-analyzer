"use client";

// The contract page, built around its main job: getting the contract to
// signature by resolving its clause issues. A header band (title, the one next
// action, five key facts, the stage bar, the section tabs), then the open tab
// beside a right rail of sign-offs, the latest activity and the documents.

import { useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/ui/StatePanel";
import { EnvelopesPanel } from "@/components/govern/esign/EnvelopesPanel";
import { BLOCKING_TIERS } from "@/lib/govern/labels";
import { contractIssues } from "@/lib/govern/contract-issues";
import { activityTotal } from "@/lib/govern/activity";
import { useContract, useGovernFeature } from "@/lib/govern/queries";
import { isForbidden, isNotFound } from "@/lib/api";
import type { ContractDetail } from "@/lib/govern/types";
import { ContractHeader } from "./_components/ContractHeader";
import { ContractRecordSkeleton, SectionSkeleton } from "./_components/ContractRecordSkeleton";
import { ContractSidebar } from "./_components/ContractSidebar";
import { ContractTabList, defaultTabFor, useHashTab, type ContractTab } from "./_components/ContractTabs";
import { OverviewTab } from "./_components/OverviewTab";
import { BlockersSection } from "./_components/BlockersSection";

// Issues and Overview load with the page; the other tabs are 200-540 lines
// each and only one shows at a time: each loads when its tab opens.
const sectionLoading = () => <SectionSkeleton />;
const ActivityTab = dynamic(() => import("./_components/ActivityTab").then((m) => m.ActivityTab), { loading: sectionLoading });
const MatrixSection = dynamic(() => import("./_components/MatrixSection").then((m) => m.MatrixSection), { loading: sectionLoading });
const RoundsSection = dynamic(() => import("./_components/RoundsSection").then((m) => m.RoundsSection), { loading: sectionLoading });
const MoneySection = dynamic(() => import("./_components/MoneySection").then((m) => m.MoneySection), { loading: sectionLoading });
const DetailsSection = dynamic(() => import("./_components/DetailsSection").then((m) => m.DetailsSection), { loading: sectionLoading });

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
  const { data: contract, isLoading, isError, error, refetch } = useContract(id);

  if (isLoading) return <ContractRecordSkeleton />;

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
        <Button asChild size="lg" variant="outline"><Link href="/contracts">Back to contracts</Link></Button>
      </StatePanel>
    );
  }

  return <ContractView contract={contract} isError={isError} onRefresh={() => refetch()} />;
}

function ContractView({ contract: c, isError, onRefresh }: {
  contract: ContractDetail; isError: boolean; onRefresh: () => void;
}) {
  const issues = contractIssues(c).length;
  const [tab, setTab] = useHashTab(defaultTabFor(c, issues));
  const isObligationsOn = useGovernFeature("obligations");
  const tabsRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLButtonElement>(null);

  /** Opens a tab and brings it into view; optionally focuses something in it
   *  once the (lazily loaded) section is on screen. */
  function goTo(next: ContractTab, focus?: () => HTMLElement | null) {
    setTab(next);
    let tries = 0;
    const settle = () => {
      const target = focus?.();
      if (focus && !target && tries++ < 40) {
        window.requestAnimationFrame(settle);
        return;
      }
      (target ?? tabsRef.current)?.scrollIntoView({ behavior: "smooth", block: target ? "center" : "start" });
      target?.focus({ preventScroll: true });
    };
    window.requestAnimationFrame(settle);
  }

  const toLook = c.review?.clauses.filter((cl) => BLOCKING_TIERS.has(cl.tier) || cl.tier === "review").length ?? 0;
  const gaps = c.captureGaps?.length ?? 0;
  const activity = activityTotal(c);

  return (
    <>
      <ContractHeader contract={c} openIssues={issues} onUploadRevision={() => goTo("rounds", () => uploadRef.current)}>
        <div ref={tabsRef} className="scroll-mt-4">
          <ContractTabList
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "blockers", label: "Issues", badge: issues, tone: "warn" },
              { id: "overview", label: "Overview" },
              { id: "matrix", label: "Matrix", badge: toLook },
              { id: "activity", label: "Activity", badge: activity.count ? activity.label : null },
              { id: "rounds", label: "Rounds", badge: c.versions.length },
              { id: "money", label: "Money", badge: isObligationsOn ? c.obligationsDue || null : null, tone: "warn" },
              { id: "details", label: "Details", badge: gaps, tone: "warn" },
            ]}
          />
        </div>
      </ContractHeader>

      <div className="flex-1 bg-[var(--ink-50)]">
        <div className="app-container grid grid-cols-1 items-start gap-6 py-6 lg:grid-cols-12">
          <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
            {isError && (
              <p role="alert" className="rounded-lg border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
                Couldn&rsquo;t refresh. This page may be out of date.{" "}
                <button type="button" onClick={onRefresh} className="font-semibold underline underline-offset-2">Try again</button>
              </p>
            )}
            <EnvelopesPanel contract={c} />
            <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={-1} className="min-w-0 focus-visible:outline-none">
              {tab === "blockers" && <BlockersSection contract={c} />}
              {tab === "overview" && <OverviewTab contract={c} onOpen={(t) => goTo(t)} />}
              {tab === "matrix" && <MatrixSection contract={c} />}
              {tab === "activity" && <ActivityTab contract={c} />}
              {tab === "rounds" && <RoundsSection contract={c} uploadRef={uploadRef} />}
              {tab === "money" && <MoneySection contract={c} />}
              {tab === "details" && <DetailsSection contract={c} />}
            </div>
          </div>
          <ContractSidebar contract={c} onAllActivity={() => goTo("activity")} />
        </div>
      </div>
    </>
  );
}
