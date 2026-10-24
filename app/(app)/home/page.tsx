"use client";

// The home (Requirement 5): one screen with what needs you, where the
// pipeline stands and what Sonar found. Layout, top to bottom on a 12-column
// grid: title and date, four key figures in one strip, "Needs your action"
// (5) beside "Pipeline" (7), then "Sonar found" across the full width.
// Technical detail sits in the Risk and documents view and in Reports
// (value, waiting queues, time in step and the export live there).
// Every contract row opens the contract page, where its blockers are listed.
//
// States: loading mirrors the layout (no jump when data lands); a failed
// first load shows a retry; a failed refresh keeps the last figures and
// says so; an empty workspace says what to do.

import dynamic from "next/dynamic";
import { LeaderHome } from "./_components/LeaderHome";
import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ViewTabs } from "@/components/ui/view-tabs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, RefreshCw } from "@/components/ui/icons";
import { plural } from "@/lib/govern/labels";
import {
  byUrgency, formatCompact, isUnsigned, needsAttention, stageQueues, valueSummary,
} from "@/lib/govern/metrics";
import { useContracts, useGovernMe, useObligations, useWorkflowSettings } from "@/lib/govern/queries";
import Link from "next/link";
import { findOpportunities } from "@/lib/govern/opportunities";
import { cn } from "@/lib/utils";
import { NoContracts, ReportError, TEXT_LINK } from "../reports/_components/ReportKit";
import { amountIn, mainCurrency } from "../reports/_components/report-data";
import {
  HomeHeader, HomePageSkeleton, HomeSkeleton, KpiStrip, NeedsActionPanel, PipelinePanel, SonarPanel, type Kpi,
} from "./_components/HomeSections";
// Loaded when the Risk view opens: it carries the charts.
const RiskView = dynamic(() => import("./_components/RiskView").then((m) => m.RiskView), { loading: () => <RiskViewSkeleton label="risk and documents" /> });
import { RiskViewSkeleton } from "./_components/RiskViewSkeleton";

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

  const view = useMemo(() => {
    const attention = contracts.filter(needsAttention).sort(byUrgency);
    const unsigned = contracts.filter(isUnsigned);
    const summary = valueSummary(contracts);
    return {
      attention,
      unsigned,
      stages: stageQueues(contracts),
      summary,
      primary: mainCurrency(summary.current, summary.potential),
    };
  }, [contracts]);
  // Obligations feed the money findings; if they fail to load, the time
  // findings still show.
  const obligationsQuery = useObligations();
  // Admins see a reminder until organization setup is finished.
  const workflowSettings = useWorkflowSettings();
  const setupPending = (me.data?.isAdmin ?? me.data?.role === "admin") && !!workflowSettings.data && !workflowSettings.data.organization?.setupCompletedAt;
  const opportunities = useMemo(
    () => findOpportunities(contracts, obligationsQuery.data?.obligations ?? []),
    [contracts, obligationsQuery.data],
  );

  const refresh = async () => {
    const r = await refetch();
    if (r.isError) toast.error("Couldn't refresh", { description: "Showing the figures loaded earlier." });
    else toast.success("Home is up to date");
  };

  const hasData = contracts.length > 0;
  const staleError = isError && !!data;

  let body: React.ReactNode;
  if (isLoading) body = <HomeSkeleton />;
  else if (isError && !data) body = <ReportError error={error} onRetry={() => void refetch()} what="your contracts" />;
  else if (!hasData) body = <NoContracts />;
  else {
    const current = amountIn(view.summary.current, view.primary);
    const potential = amountIn(view.summary.potential, view.primary);
    const heldUp = amountIn(view.summary.heldUp, view.primary);
    const pastTarget = view.unsigned.filter((c) => c.slaStatus === "red").length;
    const late = view.unsigned.filter((c) => c.slaStatus === "amber").length;
    const longestDays = view.unsigned.reduce((m, c) => Math.max(m, c.daysInStage), 0);
    const kpis: Kpi[] = [
      {
        label: "Open contracts",
        value: String(view.unsigned.length),
        sub: view.unsigned.length > 0 ? `Longest wait ${plural(longestDays, "day")}` : "Nothing in progress",
        href: "/contracts?view=in-progress",
      },
      {
        label: "Past their target",
        value: String(pastTarget),
        sub: late > 0 ? `${late} more running late` : pastTarget > 0 ? "See which ones" : "All on track",
        tone: pastTarget > 0 ? "danger" : "neutral",
        href: "/contracts?view=overdue",
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

        {isLeader ? (
          <LeaderHome contracts={contracts} attention={view.attention} summary={view.summary} currency={view.primary} />
        ) : (
          <>
            <KpiStrip items={kpis} />
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
              <NeedsActionPanel contracts={view.attention} href="/workflow" className="lg:col-span-5" />
              <PipelinePanel stages={view.stages} className="lg:col-span-7" />
            </div>
            <SonarPanel items={opportunities} />
          </>
        )}
      </>
    );
  }

  return (
    <>
      <HomeHeader title="Home" />
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
