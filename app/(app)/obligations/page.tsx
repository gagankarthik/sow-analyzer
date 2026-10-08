"use client";

// Obligations: every report, payment, milestone and term end the signed
// agreements commit the organisation to, across all contracts, soonest due
// first. Sonar finds them when an agreement is signed; people add more on the
// contract page. Marking one done here updates the contract.

import { Suspense, useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatePanel } from "@/components/ui/StatePanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Loader2, Search, Sparkles } from "@/components/ui/icons";
import { isForbidden } from "@/lib/api";
import { OBLIGATION_KIND_LABEL, plural } from "@/lib/govern/labels";
import { formatCompact } from "@/lib/govern/metrics";
import { useObligations, useUpdateObligation } from "@/lib/govern/queries";
import type { ObligationKind, PortfolioObligation } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { KpiStrip, type Kpi } from "../home/_components/HomeSections";

type View = "overdue" | "30" | "90" | "all";
const VIEWS: { id: View; label: string }[] = [
  { id: "overdue", label: "Overdue" },
  { id: "30", label: "Next 30 days" },
  { id: "90", label: "Next 90 days" },
  { id: "all", label: "All open" },
];
const DAY_MS = 86_400_000;

/** Whole days from today to the due date: negative when overdue. */
function daysUntil(due: string): number {
  const d = Date.parse(`${due.slice(0, 10)}T00:00:00`);
  const t = new Date();
  const today = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
  return Math.round((d - today) / DAY_MS);
}

function inView(o: PortfolioObligation, view: View): boolean {
  if (!o.dueDate) return view === "all";
  const n = daysUntil(o.dueDate);
  if (view === "overdue") return n < 0;
  if (view === "30") return n >= 0 && n <= 30;
  if (view === "90") return n >= 0 && n <= 90;
  return true;
}

function dueText(due: string): { text: string; tone: "danger" | "warning" | "neutral" } {
  const n = daysUntil(due);
  if (n < 0) return { text: `${plural(-n, "day")} overdue`, tone: "danger" };
  if (n === 0) return { text: "Due today", tone: "warning" };
  if (n <= 14) return { text: `In ${plural(n, "day")}`, tone: "warning" };
  return { text: `In ${plural(n, "day")}`, tone: "neutral" };
}

function sumAmounts(list: PortfolioObligation[]): string {
  const by = new Map<string, number>();
  for (const o of list) if (o.amount) by.set((o.currency ?? "").toUpperCase(), (by.get((o.currency ?? "").toUpperCase()) ?? 0) + o.amount);
  const top = [...by.entries()].sort((a, b) => b[1] - a[1])[0];
  return top ? formatCompact(top[1], top[0] || null) : "—";
}

export default function ObligationsPage() {
  return (
    <Suspense fallback={null}>
      <Obligations />
    </Suspense>
  );
}

function Obligations() {
  const router = useRouter();
  const params = useSearchParams();
  const view = (VIEWS.find((v) => v.id === params.get("view"))?.id ?? "all") as View;
  const setView = (v: View) => router.replace(v === "all" ? "/obligations" : `/obligations?view=${v}`, { scroll: false });
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<ObligationKind | "any">("any");
  const query = useDeferredValue(q.trim().toLowerCase());

  const { data, isLoading, isError, error, refetch } = useObligations();
  const all = useMemo(() => data?.obligations ?? [], [data]);

  const counts = useMemo(() => ({
    overdue: all.filter((o) => inView(o, "overdue")),
    d30: all.filter((o) => inView(o, "30")),
    d90: all.filter((o) => inView(o, "90")),
  }), [all]);

  const rows = useMemo(() => all.filter((o) =>
    inView(o, view)
    && (kind === "any" || o.kind === kind)
    && (!query || [o.title, o.contractTitle, o.counterparty, o.owner?.name].some((s) => s?.toLowerCase().includes(query))),
  ), [all, view, kind, query]);

  const kinds = useMemo(() => [...new Set(all.map((o) => o.kind))], [all]);

  const kpis: Kpi[] = [
    { label: "Overdue", value: String(counts.overdue.length), sub: counts.overdue.length ? "Complete or reschedule" : "Nothing overdue", tone: counts.overdue.length ? "danger" : "neutral", href: "/obligations?view=overdue" },
    { label: "Due in 30 days", value: String(counts.d30.length), sub: "Plan the work now", tone: counts.d30.length ? "warning" : "neutral", href: "/obligations?view=30" },
    { label: "Due in 90 days", value: String(counts.d90.length), sub: plural(new Set(counts.d90.map((o) => o.contractId)).size, "contract"), href: "/obligations?view=90" },
    { label: "Money due in 90 days", value: sumAmounts(counts.d90), sub: "Payments and fees with an amount", href: "/obligations?view=90" },
  ];

  const header = (
    <PageHeader
      title="Obligations"
      subtitle="Reports, payments, milestones and term ends your agreements commit you to, soonest due first."
    />
  );

  if (isLoading) {
    return (
      <>
        {header}
        <div className="app-container app-page" aria-busy="true" aria-label="Loading obligations">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)}
          </div>
          <Skeleton className="h-10 w-full max-w-xl rounded-lg" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </>
    );
  }

  if (isError && !data) {
    return (
      <>
        {header}
        <StatePanel
          art="error"
          title={isForbidden(error) ? "You don't have access to obligations" : "We couldn't load obligations"}
          description={isForbidden(error) ? "Ask a Govern admin to give you access." : "Check your connection and try again. Nothing has been lost."}
        >
          {!isForbidden(error) && <Button size="lg" onClick={() => void refetch()}>Try again</Button>}
        </StatePanel>
      </>
    );
  }

  if (all.length === 0) {
    return (
      <>
        {header}
        <StatePanel
          art="empty"
          title="No open obligations"
          description="When an agreement is signed, Sonar reads it for reports, payments, milestones and the term end, and lists them here with their due dates. You can also add one on any contract page."
        >
          <Button asChild size="lg"><Link href="/workflow">Go to the workflow</Link></Button>
        </StatePanel>
      </>
    );
  }

  return (
    <>
      {header}
      <div className="app-container app-page">
        <KpiStrip items={kpis} />

        <section aria-label="Filters" className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div role="radiogroup" aria-label="Due" className="inline-flex h-10 w-fit max-w-full items-center overflow-x-auto rounded-lg border border-border bg-[var(--ink-50)] p-0.5">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={view === v.id}
                onClick={() => setView(v.id)}
                className={cn(
                  "h-full shrink-0 rounded-md px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] motion-reduce:transition-none",
                  view === v.id ? "bg-card text-foreground shadow-xs ring-1 ring-border" : "text-[var(--ink-600)] hover:text-foreground",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative sm:w-72">
              <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-500)]" />
              <Input type="search" aria-label="Search obligations" placeholder="Search by obligation, contract or owner" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 pl-9 text-sm" />
            </div>
            <Select value={kind} onValueChange={(v) => setKind(v as ObligationKind | "any")}>
              <SelectTrigger aria-label="Type of obligation" className="h-10 bg-card text-sm sm:w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any type</SelectItem>
                {kinds.map((k) => <SelectItem key={k} value={k}>{OBLIGATION_KIND_LABEL[k]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </section>

        <section aria-labelledby="obligations-list" className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
            <h2 id="obligations-list" className="text-lg font-semibold text-foreground">{VIEWS.find((v) => v.id === view)!.label}</h2>
            <span className="text-sm tabular-nums text-[var(--ink-600)]" aria-live="polite">{plural(rows.length, "obligation")}</span>
          </header>
          {rows.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-[var(--ink-600)]">
              {view === "overdue" ? "Nothing is overdue." : "No obligation matches these filters."}
            </p>
          ) : (
            <>
              {/* Tablet and up: a table. */}
              <table className="hidden w-full text-sm md:table">
                <thead className="bg-[var(--ink-50)] text-left text-xs font-medium text-[var(--ink-600)]">
                  <tr>
                    <th scope="col" className="px-5 py-2.5">Due</th>
                    <th scope="col" className="px-3 py-2.5">Obligation</th>
                    <th scope="col" className="px-3 py-2.5">Contract</th>
                    <th scope="col" className="hidden px-3 py-2.5 lg:table-cell">Owner</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Amount</th>
                    <th scope="col" className="px-5 py-2.5"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((o) => <ObligationRow key={`${o.contractId}:${o.id}`} o={o} />)}
                </tbody>
              </table>
              {/* Phones: cards. */}
              <ul className="divide-y divide-border md:hidden">
                {rows.map((o) => <ObligationCard key={`${o.contractId}:${o.id}`} o={o} />)}
              </ul>
            </>
          )}
        </section>
      </div>
    </>
  );
}

function DueCell({ due }: { due: string | null }) {
  if (!due) return <span className="text-[var(--ink-500)]">No date</span>;
  const { text, tone } = dueText(due);
  return (
    <span className="flex flex-col">
      <span className="font-medium tabular-nums text-foreground">{new Date(`${due.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>
      <span className={cn("text-xs font-medium", tone === "danger" ? "text-[var(--danger)]" : tone === "warning" ? "text-[var(--warning-fg)]" : "text-[var(--ink-600)]")}>{text}</span>
    </span>
  );
}

function Title({ o }: { o: PortfolioObligation }) {
  return (
    <span className="flex flex-col">
      <span className="font-semibold text-foreground">{o.title}</span>
      <span className="flex items-center gap-1.5 text-xs text-[var(--ink-600)]">
        {OBLIGATION_KIND_LABEL[o.kind]}
        {o.source === "sonar" && (
          <span className="inline-flex items-center gap-1 text-[var(--ink-600)]"><Sparkles size={12} aria-hidden />Found by Sonar</span>
        )}
      </span>
    </span>
  );
}

function ContractCell({ o }: { o: PortfolioObligation }) {
  return (
    <span className="flex min-w-0 flex-col">
      <Link href={`/contracts/${encodeURIComponent(o.contractId)}`} className="truncate font-medium text-[var(--brand-primary-700)] hover:underline">
        {o.contractTitle || "Untitled contract"}
      </Link>
      {o.counterparty && <span className="truncate text-xs text-[var(--ink-600)]">{o.counterparty}</span>}
    </span>
  );
}

function amountText(o: PortfolioObligation): string {
  return o.amount ? formatCompact(o.amount, o.currency) : "—";
}

function MarkDone({ o }: { o: PortfolioObligation }) {
  const update = useUpdateObligation(o.contractId);
  const done = () => update.mutate(
    { oblId: o.id, input: { status: "done" } },
    {
      onSuccess: () => toast.success("Marked done", { description: o.title }),
      onError: (e) => toast.error("Couldn't mark it done", { description: e instanceof Error ? e.message : "Please try again." }),
    },
  );
  return (
    <Button variant="outline" size="sm" onClick={done} disabled={update.isPending} aria-label={`Mark done: ${o.title}`}>
      {update.isPending ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Check size={14} aria-hidden />}
      Mark done
    </Button>
  );
}

function ObligationRow({ o }: { o: PortfolioObligation }) {
  return (
    <tr className="align-top transition-colors hover:bg-[var(--ink-50)]">
      <td className="whitespace-nowrap px-5 py-3"><DueCell due={o.dueDate} /></td>
      <td className="px-3 py-3"><Title o={o} /></td>
      <td className="max-w-[16rem] px-3 py-3"><ContractCell o={o} /></td>
      <td className="hidden px-3 py-3 text-[var(--ink-700)] lg:table-cell">{o.owner?.name || o.owner?.email || "Unassigned"}</td>
      <td className="whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums text-foreground">{amountText(o)}</td>
      <td className="whitespace-nowrap px-5 py-3 text-right"><MarkDone o={o} /></td>
    </tr>
  );
}

function ObligationCard({ o }: { o: PortfolioObligation }) {
  return (
    <li className="flex flex-col gap-3 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <Title o={o} />
        <span className="shrink-0 font-medium tabular-nums text-foreground">{amountText(o)}</span>
      </div>
      <ContractCell o={o} />
      <div className="flex items-center justify-between gap-3">
        <DueCell due={o.dueDate} />
        <MarkDone o={o} />
      </div>
    </li>
  );
}
