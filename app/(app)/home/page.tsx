"use client";

// The home (Requirement 5): one screen with what needs you, the value and
// what is waiting. Layout (UI_SPEC section 3): title row, four summary
// tiles, then panels in two columns (8 + 4).
// Technical detail sits in the Risk and documents view and in Reports.
// Every contract row opens the contract page, where its blockers are listed.
//
// States: loading mirrors the layout (no jump when data lands); a failed
// first load shows a retry; a failed refresh keeps the last figures and
// says so; an empty workspace says what to do; a manual refresh confirms.

import dynamic from "next/dynamic";
import { LeaderHome } from "./_components/LeaderHome";
import { ViewsCard } from "./_components/ViewsCard";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ViewTabs } from "@/components/ui/view-tabs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, RefreshCw } from "@/components/ui/icons";
import { plural } from "@/lib/govern/labels";
import { PageHeader } from "@/components/PageHeader";
import { ListPanel } from "@/components/ds/Panel";
import { Toolbar } from "@/components/ds/Toolbar";
import {
  byUrgency, formatCompact, isCurrent, isUnsigned, matchesSearch, needsAttention, stageQueues, sumMoney, valueSummary, waitingQueues,
} from "@/lib/govern/metrics";
import { useContracts, useGovernMe, useObligations, useWorkflowSettings } from "@/lib/govern/queries";
import Link from "next/link";
import { findOpportunities } from "@/lib/govern/opportunities";
import { cn } from "@/lib/utils";
import { ExportButtons } from "../reports/_components/ExportButtons";
import { NoContracts, ReportError, TEXT_LINK } from "../reports/_components/ReportKit";
import { amountIn, hasCaptureGaps, mainCurrency, useStageTargets } from "../reports/_components/report-data";
import { ContractRow } from "./_components/ContractRow";
import {
  AllClear, AttentionPanel, HomeActionsSkeleton, HomePageSkeleton, HomeSkeleton, OpportunitiesPanel, KpiStrip, LongestPanel, MoneyPanel, StepsPanel, WaitingPanel, type Kpi,
} from "./_components/HomeSections";
// Loaded when the Risk view opens: it carries the charts.
const RiskView = dynamic(() => import("./_components/RiskView").then((m) => m.RiskView), { loading: () => <RiskViewSkeleton label="risk and documents" /> });
import { buildHomeReport } from "./_components/home-export";
import { RiskViewSkeleton } from "./_components/RiskViewSkeleton";

const SEARCH_LIMIT = 8;
const LONGEST = 5;

type View = "overview" | "risk";
const VIEWS: { id: View; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "risk", label: "Risk and documents" },
];

// useSearchParams needs a Suspense boundary so the page can still prerender.
export default function HomePage() {
  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <Home />
    </Suspense>
  );
}

function Home() {
  // One overview page, two views: the contract workflow (Overview) and the
  // document analysis (Risk and documents, formerly the Dashboard). The view
  // lives in the URL so links, reloads and the back button keep it.
  const router = useRouter();
  const params = useSearchParams();
  const tab: View = params.get("view") === "risk" ? "risk" : "overview";
  const isLeader = useGovernMe().data?.role === "leader";
  const setView = (v: View) => router.replace(v === "overview" ? "/home" : `/home?view=${v}`, { scroll: false });

  const me = useGovernMe();
  const { data, isLoading, isError, error, isFetching, refetch } = useContracts();
  const contracts = useMemo(() => data?.contracts ?? [], [data?.contracts]);
  const [q, setQ] = useState("");
  const [showAllResults, setShowAllResults] = useState(false);

  const view = useMemo(() => {
    const attention = contracts.filter(needsAttention).sort(byUrgency);
    const unsigned = contracts.filter(isUnsigned);
    const longest = [...unsigned].sort((a, b) => b.daysInStage - a.daysInStage).slice(0, LONGEST);
    const summary = valueSummary(contracts);
    // "No value yet" counts the contracts whose value matters: open or in force.
    const unvalued = sumMoney(contracts.filter((c) => isUnsigned(c) || isCurrent(c))).unvalued;
    return {
      attention,
      longest,
      unsignedCount: unsigned.length,
      waiting: waitingQueues(contracts),
      stages: stageQueues(contracts),
      summary,
      unvalued,
      primary: mainCurrency(summary.current, summary.potential),
      captureGaps: contracts.filter(hasCaptureGaps).length,
    };
  }, [contracts]);
  const { targets, redAfter } = useStageTargets(contracts);
  // Obligations feed the money opportunities; if they fail to load, the
  // time opportunities still show.
  const obligationsQuery = useObligations();
  // Admins see a reminder until organization setup is finished.
  const workflowSettings = useWorkflowSettings();
  const setupPending = (me.data?.isAdmin ?? me.data?.role === "admin") &&!!workflowSettings.data && !workflowSettings.data.organization?.setupCompletedAt;
  const opportunities = useMemo(
    () => findOpportunities(contracts, obligationsQuery.data?.obligations ?? []),
    [contracts, obligationsQuery.data],
  );

  const results = useMemo(() => (q.trim() ? contracts.filter((c) => matchesSearch(c, q)) : []), [contracts, q]);

  const refresh = async () => {
    const r = await refetch();
    if (r.isError) toast.error("Couldn't refresh", { description: "Showing the figures loaded earlier." });
    else toast.success("Home is up to date");
  };

  const hasData = contracts.length > 0;
  const staleError = isError && !!data;

  const actions = tab === "overview" && hasData ? (
    <>
      <Toolbar.Search
        label="Search contracts"
        placeholder="Search contracts"
        value={q}
        onChange={(v) => { setQ(v); setShowAllResults(false); }}
      />
      <ExportButtons compact build={() => buildHomeReport({ ...view, targets })} />
    </>
  ) : tab === "overview" && isLoading ? <HomeActionsSkeleton /> : undefined;

  let body: React.ReactNode;
  if (isLoading) body = <HomeSkeleton />;
  else if (isError && !data) body = <ReportError error={error} onRetry={() => void refetch()} what="your contracts" />;
  else if (!hasData) body = <NoContracts />;
  else {
    const shownResults = showAllResults ? results : results.slice(0, SEARCH_LIMIT);
    const current = amountIn(view.summary.current, view.primary);
    const potential = amountIn(view.summary.potential, view.primary);
    const heldUp = amountIn(view.summary.heldUp, view.primary);
    const overdue = view.attention.filter((c) => c.slaStatus === "red").length;
    const longestDays = view.longest[0]?.daysInStage ?? 0;
    const kpis: Kpi[] = [
      {
        label: "Needs you",
        value: String(view.attention.length),
        sub: overdue > 0 ? `${overdue} overdue` : view.attention.length === 0 ? "All caught up" : "None overdue",
        tone: overdue > 0 ? "danger" : "neutral",
        href: "#attention",
      },
      {
        label: "Open contracts",
        value: String(view.unsignedCount),
        sub: view.unsignedCount > 0 ? `Longest wait ${plural(longestDays, "day")}` : "Nothing in progress",
        href: "/contracts?view=in-progress",
      },
      {
        label: "Signed and active",
        value: formatCompact(current, view.primary),
        sub: plural(view.summary.current.valued, "contract"),
        href: "/reports/value",
      },
      {
        label: "Held up",
        value: formatCompact(heldUp, view.primary),
        sub: heldUp > 0 ? `of ${formatCompact(potential, view.primary)} in the pipeline` : "Nothing past its target",
        tone: heldUp > 0 ? "warning" : "neutral",
        href: "/reports/value",
      },
    ];

    body = (
      <>
        {staleError && (
          <div role="alert" className="flex flex-col gap-3 rounded-md border border-[var(--warning-border)] bg-[var(--warning-soft)] px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-sm text-foreground">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--warning-fg)]" aria-hidden />
              Couldn&apos;t refresh. These are the figures loaded earlier.
            </p>
            <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={isFetching}>
              <RefreshCw size={16} aria-hidden className={cn(isFetching && "animate-spin motion-reduce:animate-none")} />
              Try again
            </Button>
          </div>
        )}

        {q.trim() && (
          <ListPanel
            id="results"
            as="h2"
            title={results.length === 0 ? "No matches" : "Search results"}
            meta={results.length || undefined}
            aria-live="polite"
            actions={<button type="button" onClick={() => setQ("")} className={TEXT_LINK}>Clear search</button>}
            footer={results.length > SEARCH_LIMIT ? (
              <button type="button" className={TEXT_LINK} onClick={() => setShowAllResults((v) => !v)} aria-expanded={showAllResults}>
                {showAllResults ? "Show fewer" : `Show all ${results.length}`}
              </button>
            ) : undefined}
          >
            {results.length === 0 ? (
              <p className="px-4 py-5 text-sm text-[var(--ink-600)]">
                Nothing matches &ldquo;{q.trim()}&rdquo;. Try part of a name, such as a surname or a department.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {shownResults.map((c) => <ContractRow key={c.contractId} c={c} showValue />)}
              </ul>
            )}
          </ListPanel>
        )}

        {isLeader ? (
          <LeaderHome contracts={contracts} attention={view.attention} summary={view.summary} currency={view.primary} />
        ) : (
          <>
        <KpiStrip items={kpis} />

        {setupPending && (
          <div role="status" className="flex flex-col gap-2 rounded-md border border-[var(--warning-border)] bg-[var(--warning-soft)] px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex min-w-0 items-center gap-2 text-sm text-foreground">
              <AlertTriangle size={16} className="shrink-0 text-[var(--warning-fg)]" aria-hidden />
              Organization setup isn&apos;t finished.
            </p>
            <Link
              href="/settings/organization"
              className="inline-flex min-h-10 shrink-0 items-center gap-1 self-start rounded-sm text-sm font-semibold text-[var(--brand-primary-700)] hover:underline underline-offset-4 sm:min-h-0 sm:self-auto"
            >
              Continue setup
              <ArrowRight size={12} aria-hidden />
            </Link>
          </div>
        )}
        {/* The overview reads in bands, top to bottom: your work, then where
            things stand, then where the queue waits, then the steps. Every
            section in a band shares its row height, so columns never end
            ragged. */}
        {view.attention.length > 0 ? <AttentionPanel contracts={view.attention} /> : <AllClear />}
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
          <ViewsCard />
          <MoneyPanel
            summary={view.summary}
            unvalued={view.unvalued}
            primary={view.primary}
            captureGaps={view.captureGaps}
          />
          <OpportunitiesPanel items={opportunities} className="md:col-span-2 xl:col-span-1" />
        </div>
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2">
          <WaitingPanel waiting={view.waiting} contracts={contracts} />
          <LongestPanel longest={view.longest} />
        </div>
        <StepsPanel stages={view.stages} targets={targets} redAfter={redAfter} />
          </>
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader title="Home" actions={actions} />
      <div className="app-container app-page">
      {/* Leaders see the plain overview; clause risk, the risk index and
          processing detail sit behind a Details link (Requirement 5.1). */}
      {isLeader ? (
        tab === "risk" && (
          <button type="button" onClick={() => setView("overview")} className={cn(TEXT_LINK, "w-fit")}>
            Back to the overview
          </button>
        )
      ) : (
        <ViewTabs id="home" label="Home views" views={VIEWS} value={tab} onChange={setView} />
      )}
      <div role="tabpanel" id={`home-panel-${tab}`} aria-labelledby={`home-tab-${tab}`} className="-mt-2 flex flex-col gap-6">
        {tab === "risk" ? <RiskView /> : body}
      </div>
      {isLeader && tab === "overview" && (
        <button type="button" onClick={() => setView("risk")} className={cn(TEXT_LINK, "w-fit")}>
          Details: clause risk, risk scores and document processing
        </button>
      )}
      </div>
    </>
  );
}
