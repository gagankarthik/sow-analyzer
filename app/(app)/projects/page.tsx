"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MotionReveal } from "@/components/MotionReveal";
import { MiniRiskDonut } from "@/components/charts/MiniRiskDonut";
import {
  Plus, Search, Briefcase, ArrowRight, Layers, LayoutGrid, Menu, Loader2,
} from "@/components/ui/icons";
import { useDocuments } from "@/lib/queries/documents";
import { useProjects, type LocalProject } from "@/lib/projects-store";
import type { ApiDocument, RiskLevel } from "@/lib/types";

const PROCESSING = new Set(["PENDING", "PARSING", "CLASSIFYING", "EMBEDDING", "GRAPHING", "DIFFING", "TIMELINING", "PERSISTING"]);
const RISK_PILL: Record<RiskLevel, string> = {
  critical: "bg-[var(--danger-soft)] text-[var(--danger)]",
  high: "bg-[var(--warning-soft)] text-[var(--warning)]",
  medium: "bg-[var(--ink-100)] text-[var(--ink-600)]",
  low: "bg-[var(--success-soft)] text-[var(--success)]",
};
const RISK_HEX: Record<RiskLevel, string> = { critical: "var(--danger)", high: "var(--warning)", medium: "var(--ink-400)", low: "var(--success)" };

type Agg = {
  project: LocalProject;
  docCount: number;
  clauseCount: number;
  rc: { low: number; medium: number; high: number; critical: number };
  total: number;
  highRisk: number;
  overallRisk: RiskLevel;
  processing: number;
};

function aggregate(project: LocalProject, byId: Map<string, ApiDocument>): Agg {
  const rc = { low: 0, medium: 0, high: 0, critical: 0 };
  let clauseCount = 0, processing = 0;
  for (const id of project.docIds) {
    const d = byId.get(id);
    if (!d) continue;
    clauseCount += d.clauseCount ?? 0;
    if (d.riskCounts) { rc.low += d.riskCounts.low; rc.medium += d.riskCounts.medium; rc.high += d.riskCounts.high; rc.critical += d.riskCounts.critical; }
    if (PROCESSING.has(d.status)) processing++;
  }
  const total = rc.low + rc.medium + rc.high + rc.critical;
  const highRisk = rc.high + rc.critical;
  const overallRisk: RiskLevel = rc.critical > 0 ? "critical" : rc.high > 0 ? "high" : rc.medium > 0 ? "medium" : "low";
  return { project, docCount: project.docIds.length, clauseCount, rc, total, highRisk, overallRisk, processing };
}

type RiskFilter = "all" | "attention" | RiskLevel;
type ViewMode = "grid" | "table";

export default function ProjectsPage() {
  const { data: docs = [], isLoading } = useDocuments();
  const projects = useProjects();
  const [mounted, setMounted] = useState(false);
  const [q, setQ] = useState("");
  const [risk, setRisk] = useState<RiskFilter>("all");
  const [view, setView] = useState<ViewMode>("grid");

  useEffect(() => { setMounted(true); }, []);

  const byId = useMemo(() => new Map(docs.map((d) => [d.docId, d])), [docs]);
  const aggregates = useMemo(() => projects.map((p) => aggregate(p, byId)), [projects, byId]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return aggregates.filter((a) => {
      if (risk === "attention" && a.highRisk === 0) return false;
      if (risk !== "all" && risk !== "attention" && a.overallRisk !== risk) return false;
      if (term && !`${a.project.name} ${a.project.client ?? ""}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [aggregates, q, risk]);

  const totalDocs = projects.reduce((s, p) => s + p.docIds.length, 0);

  return (
    <>
      {/* Compact header */}
      <header className="border-b border-border bg-card">
        <div className="app-container flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)]"><Briefcase size={17} strokeWidth={1.75} /></span>
            <div>
              <h1 className="text-[18px] font-bold leading-tight tracking-tight text-foreground">Projects</h1>
              <p className="text-[12px] text-muted-foreground">
                {mounted ? `${projects.length} project${projects.length === 1 ? "" : "s"} · ${totalDocs} document${totalDocs === 1 ? "" : "s"}` : "Your contracts and the documents inside them"}
              </p>
            </div>
          </div>
          <Link href="/projects/new" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--brand-primary-600)] px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-primary-700)]">
            <Plus size={15} strokeWidth={2.5} />New project
          </Link>
        </div>
      </header>

      <div className="app-container py-5 md:py-6">
        {/* Filters on top */}
        {mounted && projects.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-2.5">
            <div className="relative flex min-w-[200px] flex-1 items-center sm:max-w-xs">
              <Search size={15} className="pointer-events-none absolute left-3 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects…"
                className="h-9 w-full rounded-full border border-border bg-card pl-9 pr-4 text-[13px] outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-[var(--brand-primary-400)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-100)]" />
            </div>
            <div className="flex items-center gap-1">
              {([
                { k: "all", label: "All" },
                { k: "attention", label: "Needs attention" },
                { k: "critical", label: "Critical" },
                { k: "high", label: "High" },
              ] as { k: RiskFilter; label: string }[]).map((f) => (
                <button key={f.k} onClick={() => setRisk(f.k)} data-active={risk === f.k}
                  className="inline-flex h-8 items-center rounded-full border border-transparent px-3 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-muted data-[active=true]:bg-[var(--brand-primary-50)] data-[active=true]:text-[var(--brand-primary-700)]">
                  {f.label}
                </button>
              ))}
            </div>
            {/* layout toggle */}
            <div className="ml-auto inline-flex items-center rounded-md border border-border bg-card p-0.5">
              {([{ m: "grid", icon: <LayoutGrid size={15} /> }, { m: "table", icon: <Menu size={15} /> }] as { m: ViewMode; icon: React.ReactNode }[]).map((vm) => (
                <button key={vm.m} onClick={() => setView(vm.m)} data-active={view === vm.m} aria-label={`${vm.m} view`}
                  className="inline-flex h-7 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground data-[active=true]:bg-[var(--brand-primary-50)] data-[active=true]:text-[var(--brand-primary-700)]">
                  {vm.icon}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Body */}
        {!mounted || isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
        ) : projects.length === 0 ? (
          <EmptyState pristine />
        ) : filtered.length === 0 ? (
          <EmptyState pristine={false} reset={() => { setQ(""); setRisk("all"); }} />
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((a, i) => (
              <MotionReveal key={a.project.id} delay={Math.min(i * 0.04, 0.2)}><ProjectGridCard a={a} /></MotionReveal>
            ))}
          </div>
        ) : (
          <ProjectTable rows={filtered} />
        )}
      </div>
    </>
  );
}

function ProjectGridCard({ a }: { a: Agg }) {
  const segs: { k: RiskLevel; n: number }[] = [
    { k: "critical", n: a.rc.critical }, { k: "high", n: a.rc.high }, { k: "medium", n: a.rc.medium }, { k: "low", n: a.rc.low },
  ];
  return (
    <Link href={`/projects/${a.project.id}`} className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-[var(--brand-primary-300)] hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-[19px] font-bold leading-tight tracking-tight text-foreground transition-colors group-hover:text-[var(--brand-primary-700)]" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>{a.project.name}</h3>
          {a.project.client && <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{a.project.client}</p>}
        </div>
        {a.total > 0 ? (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${RISK_PILL[a.overallRisk]}`}>{a.overallRisk}</span>
        ) : a.processing > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--warning)]"><Loader2 size={10} className="animate-spin" />Analyzing</span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-4">
        <MiniRiskDonut counts={a.rc} />
        <div className="grid flex-1 grid-cols-3 gap-2 text-center">
          <Stat value={a.docCount} label="Docs" />
          <Stat value={a.clauseCount} label="Clauses" />
          <Stat value={a.highRisk} label="High-risk" tone={a.highRisk > 0 ? "danger" : undefined} />
        </div>
      </div>

      {a.total > 0 && (
        <div className="mt-4">
          <div className="flex h-2 overflow-hidden rounded-full bg-muted">
            {segs.map(({ k, n }) => (n > 0 ? <div key={k} style={{ width: `${(n / a.total) * 100}%`, background: RISK_HEX[k] }} /> : null))}
          </div>
          <div className="mt-2 flex items-center justify-between text-[10.5px] text-muted-foreground">
            {segs.map(({ k, n }) => (
              <span key={k} className="inline-flex items-center gap-1 capitalize"><span className="h-2 w-2 rounded-full" style={{ background: RISK_HEX[k] }} />{k} {n}</span>
            ))}
          </div>
        </div>
      )}
    </Link>
  );
}

function ProjectTable({ rows }: { rows: Agg[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
      <table className="w-full min-w-[680px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left">
            {["Project", "Docs", "Clauses", "Critical", "High", "Medium", "Low", "Risk"].map((h, i) => (
              <th key={h} className={`px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground ${i > 0 && i < 7 ? "text-right" : ""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.project.id} className="border-b border-border last:border-0 transition-colors hover:bg-muted/40">
              <td className="px-4 py-3">
                <Link href={`/projects/${a.project.id}`} className="font-semibold text-foreground hover:text-[var(--brand-primary-700)]">{a.project.name}</Link>
                {a.project.client && <div className="truncate text-[11px] text-muted-foreground">{a.project.client}</div>}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{a.docCount}</td>
              <td className="px-4 py-3 text-right tabular-nums">{a.clauseCount.toLocaleString()}</td>
              <td className="px-4 py-3 text-right tabular-nums">{cell(a.rc.critical, "var(--danger)")}</td>
              <td className="px-4 py-3 text-right tabular-nums">{cell(a.rc.high, "var(--warning)")}</td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{a.rc.medium || "—"}</td>
              <td className="px-4 py-3 text-right tabular-nums">{cell(a.rc.low, "var(--success)")}</td>
              <td className="px-4 py-3">
                {a.total > 0 ? <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${RISK_PILL[a.overallRisk]}`}>{a.overallRisk}</span> : <span className="text-[11px] text-muted-foreground">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function cell(n: number, color: string) {
  return n > 0 ? <span className="font-semibold" style={{ color }}>{n}</span> : <span className="text-muted-foreground">—</span>;
}

function Stat({ value, label, tone }: { value: number; label: string; tone?: "danger" }) {
  return (
    <div>
      <div className={`text-[18px] font-bold leading-none tabular-nums ${tone === "danger" ? "text-[var(--danger)]" : "text-foreground"}`} style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>{value.toLocaleString()}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function EmptyState({ pristine, reset }: { pristine: boolean; reset?: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/50 py-20 text-center">
      <span className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--brand-primary-50)] text-[var(--brand-primary-600)]"><Layers size={28} strokeWidth={1.5} /></span>
      <h3 className="text-[18px] font-semibold text-foreground">{pristine ? "No projects yet" : "No projects match"}</h3>
      <p className="mt-2 max-w-sm text-[13px] text-muted-foreground">
        {pristine ? "Create a project, then upload its SOW. Bluey extracts clauses, scores risk, and rolls it up here." : "Try a different filter or clear your search."}
      </p>
      {pristine ? (
        <Button variant="primary" size="lg" className="mt-6 rounded-full" asChild><Link href="/projects/new"><Plus size={15} />Create your first project</Link></Button>
      ) : (
        <Button variant="outline" size="md" className="mt-6 rounded-full" onClick={reset}>Clear filters</Button>
      )}
      {pristine && <Link href="/projects/new" className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)]">or add documents <ArrowRight size={12} /></Link>}
    </div>
  );
}
