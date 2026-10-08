"use client";

// The leader home (Requirement 5): one screen that answers what needs me,
// where the money is, and what is stuck and why. Layout: a compact header,
// four summary tiles, then panels in rows of matched height (8 + 4 columns).
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
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, RefreshCw } from "@/components/ui/icons";
import { plural } from "@/lib/govern/labels";
import {
  byUrgency, formatCompact, isCurrent, isUnsigned, matchesSearch, needsAttention, stageQueues, sumMoney, valueSummary, waitingQueues,
} from "@/lib/govern/metrics";
import { useContracts, useGovernMe, useObligations, useWorkflowSettings } from "@/lib/govern/queries";
import Link from "next/link";
import { findOpportunities } from "@/lib/govern/opportunities";
import { cn } from "@/lib/utils";
import { ExportButtons } from "../reports/_components/ExportButtons";
import { NoContracts, ReportError, SearchField, TEXT_LINK } from "../reports/_components/ReportKit";
import { amountIn, hasCaptureGaps, mainCurrency, useStageTargets } from "../reports/_components/report-data";
import { ContractRow } from "./_components/ContractRow";
import {
  AllClear, AttentionPanel, HomeSkeleton, OpportunitiesPanel, KpiStrip, LongestPanel, MoneyPanel, StepsPanel, WaitingPanel, type Kpi,
} from "./_components/HomeSections";
// Loaded when the Risk view opens: it carries the charts.
const RiskView = dynamic(() => import("./_components/RiskView").then((m) => m.RiskView), { loading: () => <div className="h-64 animate-pulse rounded-xl bg-[var(--ink-100)]" aria-busy="true" aria-label="Loading" /> });
import { TrendGlance } from "./_components/TrendGlance";
import { buildHomeReport } from "./_components/home-export";

const SEARCH_LIMIT = 8;
const LONGEST = 5;

function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

type View = "overview" | "risk";
const VIEWS: { id: View; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "risk", label: "Risk and documents" },
];

// useSearchParams needs a Suspense boundary so the page can still prerender.
export default function HomePage() {
  return (
    <Suspense fallback={<div className="app-container py-6 md:py-8"><HomeSkeleton /></div>}>
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

  const { user, status } = useAuth();
  const me = useGovernMe();
  const { data, isLoading, isError, error, isFetching, refetch } = useContracts();
  const contracts = useMemo(() => data?.contracts ?? [], [data]);
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
  const setupPending = me.data?.role === "admin" && !!workflowSettings.data && !workflowSettings.data.organization?.setupCompletedAt;
  const opportunities = useMemo(
    () => findOpportunities(contracts, obligationsQuery.data?.obligations ?? []),
    [contracts, obligationsQuery.data],
  );

  const results = useMemo(() => (q.trim() ? contracts.filter((c) => matchesSearch(c, q)) : []), [contracts, q]);

  // Names and the time of day are only known in the browser, after sign-in is read.
  const ready = status === "authenticated";
  const firstName = (user?.name || me.data?.name || "").trim().split(/\s+/)[0];
  const now = ready ? new Date() : null;

  const refresh = async () => {
    const r = await refetch();
    if (r.isError) toast.error("Couldn't refresh", { description: "Showing the figures loaded earlier." });
    else toast.success("Home is up to date");
  };

  const hasData = contracts.length > 0;
  const staleError = isError && !!data;

  const header = (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-foreground">
          {now ? `${greetingFor(now.getHours())}${firstName ? `, ${firstName}` : ""}` : "Home"}
        </h1>
        <p className="mt-1 text-sm text-[var(--ink-600)]">
          {now ? now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }) : "Your contracts today"}
          {hasData && (
            <>
              {" · "}
              <span className="font-semibold text-foreground">{view.attention.length === 0 ? "nothing" : plural(view.attention.length, "contract")}</span>
              {view.attention.length <= 1 ? " needs" : " need"} you
            </>
          )}
        </p>
      </div>
      {tab === "overview" && <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {hasData && (
          <SearchField
            id="home-search"
            label="Search contracts"
            placeholder="Search contracts"
            className="sm:w-72"
            value={q}
            onChange={(v) => { setQ(v); setShowAllResults(false); }}
          />
        )}
        <div className="flex items-center gap-3">
          {hasData && <ExportButtons compact build={() => buildHomeReport({ ...view, targets })} />}
        </div>
      </div>}
    </header>
  );

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
          <div role="alert" className="flex flex-col gap-3 rounded-xl border border-[var(--warning-border)] bg-[var(--warning-soft)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-sm text-foreground">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--warning-fg)]" aria-hidden />
              Couldn&apos;t refresh. These are the figures loaded earlier.
            </p>
            <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={isFetching}>
              <RefreshCw size={14} className={cn(isFetching && "animate-spin motion-reduce:animate-none")} />
              Try again
            </Button>
          </div>
        )}

        {q.trim() && (
          <section aria-labelledby="results-title" className="rounded-xl border border-border bg-card shadow-xs" aria-live="polite">
            <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
              <h2 id="results-title" className="text-lg font-semibold text-foreground">
                {results.length === 0 ? "No matches" : `${plural(results.length, "contract")} found`}
              </h2>
              <button type="button" onClick={() => setQ("")} className={TEXT_LINK}>Clear search</button>
            </header>
            {results.length === 0 ? (
              <p className="px-5 py-6 text-sm text-[var(--ink-600)]">
                Nothing matches &ldquo;{q.trim()}&rdquo;. Try part of a name, such as a surname or a department.
              </p>
            ) : (
              <>
                <ul className="divide-y divide-border">
                  {shownResults.map((c) => <ContractRow key={c.contractId} c={c} showValue />)}
                </ul>
                {results.length > SEARCH_LIMIT && (
                  <div className="border-t border-border px-5 py-3">
                    <button type="button" className={TEXT_LINK} onClick={() => setShowAllResults((v) => !v)} aria-expanded={showAllResults}>
                      {showAllResults ? "Show fewer" : `Show all ${results.length}`}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {isLeader ? (
          <LeaderHome contracts={contracts} attention={view.attention} summary={view.summary} currency={view.primary} />
        ) : (
          <>
        <KpiStrip items={kpis} />

        {/* Two independent columns: the work on the left, the figures on
            the right. Every card is exactly as tall as its content, so sparse
            data never leaves an empty box, and a busy list never stretches
            its neighbour. */}
        {setupPending && (
          <div role="status" className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--warning)]" aria-hidden />
              <p className="text-sm">
                <span className="font-semibold text-foreground">Your organization isn&apos;t fully set up.</span>{" "}
                <span className="text-[var(--ink-600)]">Name, currency, governing law, targets and team, in six short steps.</span>
              </p>
            </div>
            <Link
              href="/settings/organization"
              className="ml-7 inline-flex shrink-0 items-center gap-1.5 self-start rounded-md text-sm font-semibold text-[var(--brand-primary-700)] hover:underline sm:ml-0 sm:self-auto"
            >
              Continue setup
              <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        )}
        {view.attention.length === 0 && <AllClear />}
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-8 lg:gap-5">
            {view.attention.length > 0 && <AttentionPanel contracts={view.attention} />}
            <OpportunitiesPanel items={opportunities} />
            <WaitingPanel waiting={view.waiting} contracts={contracts} />
            <StepsPanel stages={view.stages} targets={targets} redAfter={redAfter} />
          </div>
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-4 lg:gap-5">
            <ViewsCard />
            <MoneyPanel
              summary={view.summary}
              unvalued={view.unvalued}
              primary={view.primary}
              captureGaps={view.captureGaps}
            />
            <LongestPanel longest={view.longest} />
            <TrendGlance kind="throughput" />
            <TrendGlance kind="cycle" />
          </div>
        </div>
          </>
        )}
      </>
    );
  }

  return (
    <div className="app-container flex flex-col gap-4 py-6 md:py-8 lg:gap-5">
      {header}
      {/* Leaders see the plain overview; clause risk, the risk index and
          processing detail sit behind a Details link (Requirement 5.1). */}
      {isLeader ? (
        tab === "risk" && (
          <button type="button" onClick={() => setView("overview")} className="w-fit text-sm font-medium text-[var(--brand-primary-700)] hover:underline">
            Back to the overview
          </button>
        )
      ) : (
        <ViewTabs id="home" label="Home views" views={VIEWS} value={tab} onChange={setView} />
      )}
      <div role="tabpanel" id={`home-panel-${tab}`} aria-labelledby={`home-tab-${tab}`} className="flex flex-col gap-4 lg:gap-5">
        {tab === "risk" ? <RiskView /> : body}
      </div>
      {isLeader && tab === "overview" && (
        <button type="button" onClick={() => setView("risk")} className="w-fit text-sm font-medium text-[var(--brand-primary-700)] hover:underline">
          Details: clause risk, risk scores and document processing
        </button>
      )}
    </div>
  );
}
