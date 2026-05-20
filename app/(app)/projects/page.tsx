"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MotionReveal } from "@/components/MotionReveal";
import {
  Plus, Search, Briefcase, FileText, GitBranch, ArrowRight,
  CheckCircle2, Loader2, XCircle, Layers,
} from "@/components/ui/icons";
import { useDocuments } from "@/lib/queries/documents";
import { groupFamilies, type ContractFamily } from "@/lib/families";
import { formatRelativeDays } from "@/lib/format";
import type { ApiDocument, DocType, RiskLevel } from "@/lib/types";

const PROCESSING = new Set(["PENDING", "PARSING", "CLASSIFYING", "EMBEDDING", "GRAPHING", "DIFFING", "TIMELINING", "PERSISTING"]);

const TYPE_PILL: Record<DocType, string> = {
  SOW: "bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)]",
  MSA: "bg-purple-50 text-purple-700",
  AMENDMENT: "bg-[var(--warning-soft)] text-[var(--warning)]",
  NDA: "bg-[var(--success-soft)] text-[var(--success)]",
  OTHER: "bg-[var(--ink-100)] text-[var(--ink-600)]",
};
const RISK_PILL: Record<RiskLevel, string> = {
  critical: "bg-[var(--danger-soft)] text-[var(--danger)]",
  high: "bg-[var(--warning-soft)] text-[#C2410C]",
  medium: "bg-[var(--ink-100)] text-[var(--ink-600)]",
  low: "bg-[var(--success-soft)] text-[var(--success)]",
};
const RISK_FILL: Record<RiskLevel, string> = {
  critical: "bg-[var(--danger)]", high: "bg-[var(--warning)]", medium: "bg-[var(--ink-400)]", low: "bg-[var(--success)]",
};

type ViewKey = "all" | "risk" | "processing" | "failed";

export default function ProjectsPage() {
  const { data: docs = [], isLoading } = useDocuments();
  const [view, setView] = useState<ViewKey>("all");
  const [search, setSearch] = useState("");

  const families = useMemo(() => groupFamilies(docs), [docs]);

  const counts = useMemo(() => ({
    all: families.length,
    risk: families.filter((f) => f.overallRisk === "high" || f.overallRisk === "critical").length,
    processing: families.filter((f) => f.processing).length,
    failed: families.filter((f) => f.failed).length,
  }), [families]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return families.filter((f) => {
      if (view === "risk" && !(f.overallRisk === "high" || f.overallRisk === "critical")) return false;
      if (view === "processing" && !f.processing) return false;
      if (view === "failed" && !f.failed) return false;
      if (q) {
        const hay = [f.root.title, ...f.documents.map((d) => d.title), ...f.parties].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [families, view, search]);

  return (
    <>
      <PageHeader
        eyebrow={isLoading ? "Loading…" : `${counts.all} project${counts.all === 1 ? "" : "s"} · ${docs.length} document${docs.length === 1 ? "" : "s"}`}
        title="Projects"
        subtitle="Each project groups a contract with its amendments. Upload an amendment and Bluely files it under the right contract automatically."
        actions={
          <Link href="/projects/new" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-[13px] font-semibold transition-colors shadow-sm">
            <Plus size={15} strokeWidth={2.5} />New project
          </Link>
        }
      />

      <div className="app-container py-6 md:py-8 space-y-5">
        {/* Toolbar: search + views */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex items-center flex-1 min-w-[220px] max-w-sm">
            <Search size={15} className="absolute left-3 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects, documents, parties…"
              className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-4 text-[13px] outline-none focus-visible:border-[var(--brand-primary-400)] focus-visible:ring-4 focus-visible:ring-[var(--brand-primary-100)] placeholder:text-muted-foreground transition-shadow"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {([
              { key: "all", label: "All" },
              { key: "risk", label: "High risk" },
              { key: "processing", label: "Processing" },
              { key: "failed", label: "Needs attention" },
            ] as const).map((v) => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                data-active={view === v.key}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[12.5px] font-medium text-muted-foreground border border-transparent hover:bg-muted data-[active=true]:bg-[var(--brand-primary-50)] data-[active=true]:text-[var(--brand-primary-700)] transition-colors"
              >
                {v.label}
                <span className="tabular-nums text-[11px] opacity-70">{isLoading ? "·" : counts[v.key]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Family grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-3xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState reset={() => { setView("all"); setSearch(""); }} pristine={counts.all === 0} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filtered.map((f, i) => (
              <MotionReveal key={f.id} delay={Math.min(i * 0.04, 0.2)}>
                <FamilyCard family={f} />
              </MotionReveal>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function FamilyCard({ family }: { family: ContractFamily }) {
  const total = family.riskCounts.low + family.riskCounts.medium + family.riskCounts.high + family.riskCounts.critical;
  const segs: { k: RiskLevel; n: number }[] = [
    { k: "critical", n: family.riskCounts.critical }, { k: "high", n: family.riskCounts.high },
    { k: "medium", n: family.riskCounts.medium }, { k: "low", n: family.riskCounts.low },
  ];
  const docCount = family.documents.length;

  return (
    <div className="group rounded-3xl border border-border bg-card shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-5 md:p-6 pb-4">
        <div className="flex items-start gap-3.5">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)] shrink-0">
            <Briefcase size={19} strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <Link href={`/projects/${family.root.docId}`} className="block">
              <h3 className="text-[16px] font-semibold tracking-tight text-foreground leading-snug truncate group-hover:text-[var(--brand-primary-700)] transition-colors">
                {family.root.title || "Untitled contract"}
              </h3>
            </Link>
            <div className="mt-1 flex items-center gap-2 flex-wrap text-[12px] text-muted-foreground">
              <span className={`text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full ${TYPE_PILL[family.root.docType]}`}>{family.root.docType}</span>
              <span>{docCount} document{docCount === 1 ? "" : "s"}</span>
              <span className="text-muted-foreground/40">·</span>
              <span>updated {formatRelativeDays(family.updatedAt)}</span>
            </div>
          </div>
          <span className={`shrink-0 text-[10.5px] font-semibold px-2 py-0.5 rounded-full capitalize ${RISK_PILL[family.overallRisk]}`}>{family.overallRisk} risk</span>
        </div>

        {/* Combined stats */}
        <div className="mt-4 flex items-center gap-5 text-[12px]">
          <Stat label="Clauses" value={family.clauseCount || "—"} />
          <Stat label="High-risk" value={family.highRiskCount} tone={family.highRiskCount > 0 ? "danger" : undefined} />
          <Stat label="Parties" value={family.parties.length || "—"} />
        </div>

        {/* Combined risk bar */}
        {total > 0 && (
          <div className="mt-3 h-1.5 rounded-full overflow-hidden flex bg-muted" title="Combined clause risk across the project">
            {segs.map(({ k, n }) => n > 0 && <div key={k} className={RISK_FILL[k]} style={{ width: `${(n / total) * 100}%` }} />)}
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="border-t border-border bg-muted/20 px-3 py-2 flex-1">
        <ul className="divide-y divide-border/60">
          {family.documents.map((d, i) => (
            <li key={d.docId}>
              <Link href={`/projects/${d.docId}`} className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl hover:bg-card transition-colors">
                <StatusDot doc={d} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[12.5px] font-medium text-foreground truncate">{d.title || "Untitled"}</span>
                  <span className="text-[10.5px] text-muted-foreground inline-flex items-center gap-1.5">
                    {i === 0 ? "Root contract" : <><GitBranch size={9} />Amendment</>}
                    {typeof d.clauseCount === "number" && d.clauseCount > 0 && <>· {d.clauseCount} clauses</>}
                  </span>
                </span>
                {d.status === "READY" && d.overallRisk && (
                  <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${RISK_PILL[d.overallRisk]}`}>{d.overallRisk}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-2 px-5 md:px-6 py-3 border-t border-border">
        <Link href={`/projects/${family.root.docId}`} className="text-[12.5px] font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] inline-flex items-center gap-1 transition-colors">
          Open project <ArrowRight size={12} strokeWidth={2.25} />
        </Link>
        <Button variant="outline" size="sm" className="rounded-full" asChild>
          <Link href="/projects/new"><Plus size={13} />Add document</Link>
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "danger" }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
      <span className={`text-[18px] font-bold tabular-nums leading-tight ${tone === "danger" ? "text-[var(--danger)]" : "text-foreground"}`} style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>{value}</span>
    </div>
  );
}

function StatusDot({ doc }: { doc: ApiDocument }) {
  if (doc.status === "READY") return <CheckCircle2 size={14} className="text-[var(--success)] shrink-0" />;
  if (doc.status === "FAILED") return <XCircle size={14} className="text-[var(--danger)] shrink-0" />;
  if (PROCESSING.has(doc.status)) return <Loader2 size={14} className="text-[var(--warning)] animate-spin shrink-0" />;
  return <FileText size={14} className="text-muted-foreground shrink-0" />;
}

function EmptyState({ reset, pristine }: { reset: () => void; pristine: boolean }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card/50 py-20 flex flex-col items-center text-center">
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--brand-primary-50)] text-[var(--brand-primary-600)] mb-5">
        <Layers size={28} strokeWidth={1.5} />
      </span>
      <h3 className="text-[18px] font-semibold text-foreground">{pristine ? "No projects yet" : "No projects match"}</h3>
      <p className="mt-2 text-[13px] text-muted-foreground max-w-sm">
        {pristine
          ? "Upload a SOW or MSA to start a project. Bluely extracts clauses, scores risk, and groups any amendments you add later."
          : "Try a different view or clear your search."}
      </p>
      {pristine ? (
        <Button variant="primary" size="lg" className="mt-6 rounded-full" asChild>
          <Link href="/projects/new"><Plus size={15} />Create your first project</Link>
        </Button>
      ) : (
        <Button variant="outline" size="md" className="mt-6 rounded-full" onClick={reset}>Clear filters</Button>
      )}
    </div>
  );
}
