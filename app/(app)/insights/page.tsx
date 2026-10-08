"use client";

// Insights, two views: Leadership (the business view of the contract
// portfolio: speed, value, workload, risk, commitments, savings) and
// Documents (what the analysis found across the uploaded documents). The view
// lives in the URL so links and reloads keep it.

import { PageSkeleton } from "@/components/govern/admin/shared";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ViewTabs } from "@/components/ui/view-tabs";
import { DocumentInsights } from "./_components/DocumentInsights";
import { LeadershipView } from "./_components/LeadershipView";

type View = "leadership" | "documents";
const VIEWS: { id: View; label: string }[] = [
  { id: "leadership", label: "Leadership" },
  { id: "documents", label: "Documents" },
];

export default function InsightsPage() {
  return (
    <Suspense fallback={<div className="app-container py-8"><PageSkeleton label="Loading insights" /></div>}>
      <Insights />
    </Suspense>
  );
}

function Insights() {
  const router = useRouter();
  const params = useSearchParams();
  const view: View = params.get("view") === "documents" ? "documents" : "leadership";
  const setView = (v: View) => router.replace(v === "leadership" ? "/insights" : `/insights?view=${v}`, { scroll: false });
  return (
    <>
      <PageHeader title="Insights" subtitle="How the contract portfolio is performing, and what the analysis found." />
      <div className="app-container app-page">
        <ViewTabs id="insights" label="Insights views" views={VIEWS} value={view} onChange={setView} />
        <div role="tabpanel" id={`insights-panel-${view}`} aria-labelledby={`insights-tab-${view}`}>
          {view === "documents" ? <DocumentInsights /> : <LeadershipView />}
        </div>
      </div>
    </>
  );
}
