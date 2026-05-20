"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ConfidenceDots } from "@/components/ui/ConfidenceDots";
import { BluelyMark } from "@/components/ui/BluelyMark";
import { MotionReveal } from "@/components/MotionReveal";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  ShieldAlert,
  XCircle,
} from "@/components/ui/icons";
import { listDocuments } from "@/lib/api";
import type { ApiDocument, DocType, Lifecycle } from "@/lib/types";

export default function InsightsPage() {
  const [docs, setDocs] = useState<ApiDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDocuments()
      .then(setDocs)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load documents")
      )
      .finally(() => setLoading(false));
  }, []);

  const totalCount = docs.length;
  const readyCount = docs.filter((d) => d.status === "READY").length;
  const failedCount = docs.filter((d) => d.status === "FAILED").length;
  const inProgressCount = docs.filter(
    (d) => d.status !== "READY" && d.status !== "FAILED"
  ).length;

  // Docs by docType
  const byType = docs.reduce<Partial<Record<DocType, number>>>((acc, d) => {
    acc[d.docType] = (acc[d.docType] ?? 0) + 1;
    return acc;
  }, {});

  // Docs by lifecycle
  const byLifecycle = docs.reduce<Partial<Record<Lifecycle, number>>>(
    (acc, d) => {
      acc[d.lifecycle] = (acc[d.lifecycle] ?? 0) + 1;
      return acc;
    },
    {}
  );

  // Documents that need attention: FAILED or recently updated
  const attentionDocs = docs
    .filter((d) => d.status === "FAILED" || d.status !== "READY")
    .slice(0, 3);

  return (
    <>
      <PageHeader
        eyebrow="Blue-IQ Intelligence · portfolio overview"
        title="Portfolio insights"
        subtitle="Processing status and document breakdown across your active portfolio."
        actions={
          <>
            <Button variant="outline" size="md">
              Configure thresholds
            </Button>
            <Button variant="ai" size="md" className="gap-1.5 pl-2">
              <BluelyMark size="sm" />
              Ask Bluely
            </Button>
          </>
        }
      />

      <div className="app-container py-6 md:py-8 space-y-6">
        {/* Bluely brief */}
        <MotionReveal>
        <Card ai inset="lg" className="relative overflow-hidden rounded-2xl">
          <div className="ai-rule absolute top-0 left-0 right-0" />
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-8">
              <div className="flex items-center gap-3 mb-4">
                <BluelyMark size="lg" tile pulse />
                <div>
                  <div className="eyebrow text-[var(--ai-ink)]">
                    Portfolio read · Bluely
                  </div>
                  <div className="font-mono text-[10.5px] text-muted-foreground">
                    blue-iq · contract intelligence
                  </div>
                </div>
                <ConfidenceDots level={loading ? 1 : readyCount > 0 ? 3 : 1} showLabel className="ml-auto" />
              </div>
              <p className="text-[15px] leading-relaxed text-foreground max-w-[68ch]">
                {loading ? (
                  "Loading your portfolio…"
                ) : totalCount === 0 ? (
                  "No documents have been uploaded yet. Upload a SOW or MSA to start generating AI-powered portfolio insights."
                ) : (
                  <>
                    AI-powered portfolio insights require document processing to
                    complete.{" "}
                    <span className="font-semibold text-[var(--success)]">
                      {readyCount}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold">{totalCount}</span>{" "}
                    documents are ready.{" "}
                    {inProgressCount > 0 && (
                      <>
                        <span className="text-[var(--warning)] font-semibold">
                          {inProgressCount}
                        </span>{" "}
                        {inProgressCount === 1 ? "document is" : "documents are"}{" "}
                        still processing.{" "}
                      </>
                    )}
                    {failedCount > 0 && (
                      <>
                        <span className="text-[var(--danger)] font-semibold">
                          {failedCount}
                        </span>{" "}
                        {failedCount === 1 ? "document" : "documents"} failed
                        processing.
                      </>
                    )}
                  </>
                )}
              </p>
            </div>
            <div className="md:col-span-4 flex items-center justify-end">
              <Button variant="ai" size="md" className="gap-1.5 pl-2">
                <BluelyMark size="sm" />
                Ask Bluely
              </Button>
            </div>
          </div>
        </Card>
        </MotionReveal>

        {/* KPI row */}
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-[13px]">Loading documents…</span>
          </div>
        ) : error ? (
          <MotionReveal>
            <div className="rounded-2xl border border-border bg-card shadow-xs flex flex-col items-center justify-center py-12 text-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--danger)]/10">
                <XCircle size={20} className="text-[var(--danger)]" />
              </span>
              <p className="text-[13px] text-muted-foreground">{error}</p>
            </div>
          </MotionReveal>
        ) : (
          <>
            <MotionReveal>
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Total documents"
                value={totalCount}
                hint="across all document types"
                icon={<FileText size={14} />}
              />
              <MetricCard
                label="Ready"
                value={readyCount}
                hint="fully processed"
                tone="success"
                icon={<CheckCircle2 size={14} />}
              />
              <MetricCard
                label="In progress"
                value={inProgressCount}
                hint="currently processing"
                tone="warning"
                icon={<Clock size={14} />}
              />
              <MetricCard
                label="Failed"
                value={failedCount}
                hint="require attention"
                tone={failedCount > 0 ? "danger" : "neutral"}
                icon={<ShieldAlert size={14} />}
              />
            </section>
            </MotionReveal>

            {/* Documents needing attention */}
            {attentionDocs.length > 0 && (
              <MotionReveal>
              <section>
                <div className="mb-4">
                  <h2 className="text-[16px] font-semibold text-foreground tracking-tight">
                    Documents needing attention
                  </h2>
                  <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                    Failed or currently processing documents
                  </p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {attentionDocs.map((doc, i) => (
                    <MotionReveal key={doc.docId} delay={Math.min(i * 0.04, 0.2)}>
                      <DocumentAttentionCard doc={doc} />
                    </MotionReveal>
                  ))}
                </div>
              </section>
              </MotionReveal>
            )}

            {/* Breakdown tables */}
            <MotionReveal>
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* By document type */}
              <Card inset="lg" className="rounded-2xl">
                <CardHeader
                  title="Documents by type"
                  eyebrow="Breakdown across your portfolio"
                  action={
                    <Badge variant="neutral" size="sm">
                      {totalCount} total
                    </Badge>
                  }
                />
                {totalCount === 0 ? (
                  <div className="mt-5 text-[13px] text-muted-foreground">
                    No documents uploaded yet.
                  </div>
                ) : (
                  <ul className="mt-5 flex flex-col">
                    {(Object.entries(byType) as [DocType, number][]).map(
                      ([type, count]) => (
                        <li
                          key={type}
                          className="py-3 border-b border-border last:border-0 flex items-center justify-between"
                        >
                          <span className="text-[13px] text-foreground font-medium">
                            {type}
                          </span>
                          <span className="numeric text-[13px] font-semibold text-foreground tabular-nums">
                            {count}
                          </span>
                        </li>
                      )
                    )}
                  </ul>
                )}
              </Card>

              {/* By lifecycle */}
              <Card inset="lg" className="rounded-2xl">
                <CardHeader
                  title="Documents by lifecycle"
                  eyebrow="Current stage distribution"
                  action={
                    <Badge variant="neutral" size="sm">
                      {totalCount} total
                    </Badge>
                  }
                />
                {totalCount === 0 ? (
                  <div className="mt-5 text-[13px] text-muted-foreground">
                    No documents uploaded yet.
                  </div>
                ) : (
                  <ul className="mt-5 flex flex-col">
                    {(Object.entries(byLifecycle) as [Lifecycle, number][]).map(
                      ([lifecycle, count]) => (
                        <li
                          key={lifecycle}
                          className="py-3 border-b border-border last:border-0 flex items-center justify-between"
                        >
                          <span className="text-[13px] text-foreground font-medium capitalize">
                            {lifecycle}
                          </span>
                          <span className="numeric text-[13px] font-semibold text-foreground tabular-nums">
                            {count}
                          </span>
                        </li>
                      )
                    )}
                  </ul>
                )}
              </Card>
            </section>
            </MotionReveal>

            {/* Recent updates */}
            <MotionReveal>
              <RecentUpdates docs={docs} />
            </MotionReveal>
          </>
        )}
      </div>
    </>
  );
}

function RecentUpdates({ docs }: { docs: ApiDocument[] }) {
  const recent = [...docs]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  if (recent.length === 0) return null;

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-[16px] font-semibold text-foreground tracking-tight">
          Recent updates
        </h2>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          Last 5 documents by activity
        </p>
      </div>
      <Card inset="none" className="rounded-2xl">
        <ul className="flex flex-col">
          {recent.map((doc) => (
            <li
              key={doc.docId}
              className="px-6 py-3 border-b border-border last:border-0 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText size={13} className="text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <Link
                    href={`/projects/${doc.docId}`}
                    className="text-[13px] font-medium text-foreground hover:text-[var(--brand-primary-600)] transition-colors truncate block"
                  >
                    {doc.title || "Untitled document"}
                  </Link>
                  <span className="text-[11px] text-muted-foreground">
                    {doc.docType} · {doc.lifecycle}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge
                  variant={
                    doc.status === "READY"
                      ? "success"
                      : doc.status === "FAILED"
                      ? "danger"
                      : "warning"
                  }
                  dot
                  size="sm"
                >
                  {doc.status.toLowerCase()}
                </Badge>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {new Date(doc.updatedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <Link
                  href={`/projects/${doc.docId}`}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Open document"
                >
                  <ArrowRight size={12} />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

function DocumentAttentionCard({ doc }: { doc: ApiDocument }) {
  const isFailed = doc.status === "FAILED";
  const severity = isFailed ? "critical" : "warning";
  const tone = isFailed ? "danger" : "warning";

  return (
    <Card inset="lg" lift className="relative h-full rounded-2xl hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-2">
        <Badge variant={tone} dot size="sm">
          {doc.status.toLowerCase()}
        </Badge>
        <span className="font-mono text-[10px] text-muted-foreground">
          {doc.docType}
        </span>
      </div>
      <h4 className="text-[15px] font-semibold tracking-tight text-foreground leading-snug">
        {doc.title || "Untitled document"}
      </h4>
      {doc.parties.length > 0 && (
        <p className="mt-2 text-[12.5px] text-muted-foreground leading-relaxed">
          {doc.parties.join(", ")}
        </p>
      )}
      <div className="mt-2 text-[11px] text-muted-foreground">
        Updated{" "}
        {new Date(doc.updatedAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </div>
      <Link
        href={`/projects/${doc.docId}`}
        className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-foreground hover:text-[var(--brand-primary-600)] transition-colors"
      >
        View document
        <ArrowRight size={11} />
      </Link>
    </Card>
  );
}
