"use client";

import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { DataTable } from "@/components/ui/data-table";
import { PipelineStepper } from "@/components/ui/PipelineStepper";
import { StatusPill } from "@/components/ui/StatusPill";
import { RiskDots } from "@/components/ui/RiskDots";
import { Files, ArrowUp, Loader2 } from "@/components/ui/icons";

/* Internal design-system reference. Route: /styleguide
   Shows every shared primitive in its variants so we never fork styles. */

type DemoRow = { id: string; title: string; type: string; risk: string; updated: string };
const demoRows: DemoRow[] = [
  { id: "1", title: "Acme Corp — Digital Transformation SOW", type: "SOW", risk: "high", updated: "2h ago" },
  { id: "2", title: "Northwind MSA 2024", type: "MSA", risk: "medium", updated: "1d ago" },
  { id: "3", title: "Vector Bio — Amendment 3", type: "AMENDMENT", risk: "critical", updated: "3d ago" },
  { id: "4", title: "Obelisk NDA", type: "NDA", risk: "low", updated: "1w ago" },
];
const demoColumns: ColumnDef<DemoRow>[] = [
  { accessorKey: "title", header: "Title", cell: ({ row }) => <span className="font-medium">{row.original.title}</span> },
  { accessorKey: "type", header: "Type", cell: ({ row }) => <Badge variant="neutral" size="sm">{row.original.type}</Badge> },
  { accessorKey: "risk", header: "Risk", cell: ({ row }) => <RiskBadge risk={row.original.risk} /> },
  { accessorKey: "updated", header: "Updated", cell: ({ row }) => <span className="text-muted-foreground">{row.original.updated}</span> },
];

function RiskBadge({ risk }: { risk: string }) {
  const m: Record<string, string> = {
    low: "bg-[var(--success-soft)] text-[var(--success)]",
    medium: "bg-[var(--warning-soft)] text-[var(--warning)]",
    high: "bg-[var(--warning-soft)] text-[#C2410C]",
    critical: "bg-[var(--danger-soft)] text-[var(--danger)]",
  };
  return <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${m[risk] ?? m.low}`}>{risk}</span>;
}

export default function StyleguidePage() {
  const [stepperStatus, setStepperStatus] = useState("EMBEDDING");
  const statuses = ["PENDING", "PARSING", "CLASSIFYING", "EMBEDDING", "GRAPHING", "DIFFING", "TIMELINING", "PERSISTING", "READY", "FAILED"];

  return (
    <div className="app-container py-8 space-y-12">
      <header>
        <div className="eyebrow">Design system</div>
        <h1 className="h-1 text-[28px] text-foreground mt-1">Blue-IQ Styleguide</h1>
        <p className="text-[14px] text-muted-foreground mt-1 max-w-2xl">
          The shared primitives every page composes from. Built once in <code className="font-mono text-[12px]">components/ui</code> — never forked.
        </p>
      </header>

      {/* Color tokens */}
      <Section title="Color tokens" desc="Sourced from globals.css. Spec names (--gray-*, --brand-*) alias these.">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            ["Brand 600", "var(--brand-primary-600)"], ["Brand 700", "var(--brand-primary-700)"],
            ["Ink 900", "var(--ink-900)"], ["Ink 500", "var(--ink-500)"], ["Ink 200", "var(--ink-200)"],
            ["AI", "var(--ai-ink)"], ["Success", "var(--success)"], ["Warning", "var(--warning)"],
            ["Danger", "var(--danger)"], ["Info", "var(--info)"], ["Canvas", "var(--paper)"], ["Surface", "var(--paper-elev)"],
          ].map(([name, v]) => (
            <div key={name} className="space-y-1.5">
              <div className="h-12 rounded-lg border border-border" style={{ background: v }} />
              <div className="text-[11px] text-muted-foreground">{name}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Buttons */}
      <Section title="Button" desc="Variants × sizes, with loading and disabled states.">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Danger</Button>
          <Button variant="ai">AI action</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <Button variant="primary" size="xs">XS</Button>
          <Button variant="primary" size="sm">SM</Button>
          <Button variant="primary" size="md">MD</Button>
          <Button variant="primary" size="lg">LG</Button>
          <Button variant="primary" disabled>Disabled</Button>
          <Button variant="primary"><Loader2 size={14} className="animate-spin" />Loading</Button>
        </div>
      </Section>

      {/* Badges + status */}
      <Section title="Badge & status" desc="Semantic pills, lifecycle status, risk dots.">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="neutral" size="sm">Neutral</Badge>
          <Badge variant="success" size="sm">Signed</Badge>
          <Badge variant="warning" size="sm">In review</Badge>
          <Badge variant="danger" size="sm">Expired</Badge>
          <Badge variant="ai" size="sm">AI extracted</Badge>
          <StatusPill status="active" />
          <StatusPill status="draft" />
          <RiskDots level="high" />
        </div>
      </Section>

      {/* Inputs */}
      <Section title="Input" desc="Always paired with a label.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          <div className="space-y-1.5">
            <Label htmlFor="sg-name">Contract title</Label>
            <Input id="sg-name" placeholder="e.g. Acme MSA 2024" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sg-search">Search</Label>
            <Input id="sg-search" placeholder="Search documents…" />
          </div>
        </div>
      </Section>

      {/* Metric cards */}
      <Section title="MetricCard" desc="The dashboard workhorse: label, big number, delta, hint.">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Total contracts" value="1,247" delta={{ value: "12.4%", direction: "up" }} hint="vs. 1,109 last month" icon={<Files size={14} />} />
          <MetricCard label="High risk" value="38" delta={{ value: "4", direction: "down" }} hint="across portfolio" tone="danger" icon={<ArrowUp size={14} />} />
          <MetricCard label="Active" value="312" hint="currently in force" tone="success" />
          <MetricCard label="ARR at risk" value="$8.2M" tone="warning" hint="renewals < 45 days" />
        </div>
      </Section>

      {/* Pipeline stepper */}
      <Section title="PipelineStepper" desc="Live 7-stage processing indicator. Click a status to preview.">
        <div className="flex flex-wrap gap-2 mb-5">
          {statuses.map((s) => (
            <button key={s} onClick={() => setStepperStatus(s)} className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${stepperStatus === s ? "bg-[var(--brand-primary-50)] border-[var(--brand-primary-300)] text-[var(--brand-primary-700)]" : "border-border text-muted-foreground hover:text-foreground"}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-card p-6 max-w-2xl">
          <PipelineStepper status={stepperStatus} />
        </div>
      </Section>

      {/* DataTable */}
      <Section title="DataTable" desc="TanStack-powered: sort, search, selection, density, pagination.">
        <DataTable
          columns={demoColumns}
          data={demoRows}
          enableSelection
          searchPlaceholder="Search contracts…"
          getRowId={(r) => r.id}
          bulkActions={(sel) => <Button variant="outline" size="sm">Export {sel.length}</Button>}
          empty={{ title: "No contracts", description: "Upload your first SOW to get started." }}
        />
      </Section>

      {/* Skeletons */}
      <Section title="Skeleton" desc="Loading placeholders — never spinners over 300ms.">
        <div className="space-y-2 max-w-md">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </Section>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="h-3 text-[16px] text-foreground">{title}</h2>
        {desc && <p className="text-[12.5px] text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      {children}
    </section>
  );
}
