"use client";

// Interactive contract-value analytics for a contract family. Consumes the
// value segments from lib/contract-value (SOW initial + each amendment delta)
// and offers three lenses: a per-document bar, a composition pie, and a
// cumulative-value trend that makes increases/decreases obvious. Original SOW
// and amendments are coloured distinctly so the "what changed" reads instantly.

import { useState } from "react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, AreaChart, Area, CartesianGrid,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3,
  PieChart as PieChartIcon, LineChart as TrendIcon,
} from "@/components/ui/icons";
import { fmtMoney, type ValueSegment } from "@/lib/contract-value";

type Mode = "bar" | "pie" | "trend";

const BASE_COLOR = "var(--brand-primary-600)";
const ADD_COLOR = "var(--success)";
const CUT_COLOR = "var(--danger)";
const PIE_COLORS = ["var(--brand-primary-600)", "var(--success)", "var(--info)", "var(--brand-primary-400)", "var(--warning)", "var(--ai-ink)"];

function compact(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`;
  if (a >= 1e3) return `${sign}$${Math.round(a / 1e3)}k`;
  return `${sign}$${Math.round(a)}`;
}

function segColor(s: { isAmendment: boolean; value: number }): string {
  if (!s.isAmendment) return BASE_COLOR;
  return s.value < 0 ? CUT_COLOR : ADD_COLOR;
}

export function ContractValueChart({
  segments, total, currency,
}: {
  segments: ValueSegment[];
  total: number;
  currency: string | null;
}) {
  const [mode, setMode] = useState<Mode>("bar");
  if (!segments.length || total <= 0) return null;

  const base = segments.find((s) => !s.isAmendment)?.value ?? segments[0].value;
  const net = total - base;
  const pct = base > 0 ? (net / base) * 100 : 0;
  const rose = net > 0.5;
  const fell = net < -0.5;

  const barData = segments.map((s) => ({ name: s.label, value: s.value, isAmendment: s.isAmendment, source: s.source }));
  const pieData = segments.filter((s) => s.value > 0).map((s) => ({ name: s.label, value: s.value }));
  let running = 0;
  const trendData = segments.map((s) => { running += s.value; return { name: s.label, total: running, add: s.value }; });

  const tabs: { id: Mode; label: string; icon: React.ReactNode }[] = [
    { id: "bar", label: "By document", icon: <BarChart3 size={13} /> },
    { id: "pie", label: "Composition", icon: <PieChartIcon size={13} /> },
    { id: "trend", label: "Value journey", icon: <TrendIcon size={13} /> },
  ];

  return (
    <section className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-5 py-3">
        <div className="flex items-center gap-2">
          <DollarSign size={15} className="text-[var(--success)]" />
          <h3 className="text-[13px] font-semibold tracking-tight text-foreground">Contract value analytics</h3>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setMode(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                mode === t.id ? "bg-[var(--brand-primary-600)] text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-12 md:p-6">
        {/* Headline */}
        <div className="md:col-span-4 lg:col-span-3 flex flex-col gap-4">
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Current total</div>
            <div className="mt-1 text-[28px] font-bold leading-none tabular-nums text-foreground" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
              {fmtMoney(total, currency)}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-3.5">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">vs. original SOW</div>
            <div className={`mt-1 inline-flex items-center gap-1.5 text-[18px] font-bold tabular-nums ${rose ? "text-[var(--success)]" : fell ? "text-[var(--danger)]" : "text-muted-foreground"}`} style={{ fontFamily: "var(--font-display)" }}>
              {rose && <TrendingUp size={16} />}
              {fell && <TrendingDown size={16} />}
              {net === 0 ? "No change" : `${net > 0 ? "+" : "−"}${fmtMoney(Math.abs(net), currency)}`}
            </div>
            {base > 0 && net !== 0 && (
              <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                {pct > 0 ? "+" : "−"}{Math.abs(pct).toFixed(1)}% from {fmtMoney(base, currency)}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Legend swatch={BASE_COLOR} label="Original SOW" />
            <Legend swatch={ADD_COLOR} label="Amendment increase" />
            {segments.some((s) => s.isAmendment && s.value < 0) && <Legend swatch={CUT_COLOR} label="Amendment decrease" />}
          </div>
        </div>

        {/* Chart */}
        <div className="md:col-span-8 lg:col-span-9 h-[260px]">
          {mode === "bar" && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} interval={0} />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={52} />
                <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<MoneyTooltip currency={currency} />} />
                <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={64}>
                  {barData.map((d, i) => <Cell key={i} fill={segColor(d)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {mode === "pie" && (
            <div className="flex h-full items-center gap-6">
              <div className="relative h-[220px] w-[220px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={64} outerRadius={96} paddingAngle={pieData.length > 1 ? 2 : 0} stroke="none" startAngle={90} endAngle={-270}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<MoneyTooltip currency={currency} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="leading-none text-foreground" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em" }}>{compact(total)}</span>
                  <span className="mt-0.5 text-[10.5px] text-muted-foreground">total</span>
                </div>
              </div>
              <ul className="min-w-0 flex-1 space-y-2">
                {pieData.map((d, i) => (
                  <li key={d.name} className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="flex-1 truncate text-[12.5px] text-foreground">{d.name}</span>
                    <span className="tabular-nums text-[12px] font-medium text-foreground">{fmtMoney(d.value, currency)}</span>
                    <span className="w-10 text-right tabular-nums text-[11px] text-muted-foreground">{Math.round((d.value / total) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {mode === "trend" && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
                <defs>
                  <linearGradient id="cvFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand-primary-500)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--brand-primary-500)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} interval={0} />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={52} />
                <Tooltip content={<MoneyTooltip currency={currency} cumulative />} />
                <Area type="monotone" dataKey="total" stroke="var(--brand-primary-600)" strokeWidth={2.5} fill="url(#cvFill)" dot={{ r: 3, fill: "var(--brand-primary-600)" }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11.5px] text-muted-foreground">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: swatch }} />{label}
    </span>
  );
}

function MoneyTooltip({ active, payload, currency, cumulative }: {
  active?: boolean;
  payload?: { payload: { name: string; value?: number; total?: number; add?: number; source?: string | null } }[];
  currency: string | null;
  cumulative?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const value = cumulative ? p.total ?? 0 : p.value ?? 0;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <div className="text-[11px] font-semibold text-foreground">{p.name}</div>
      <div className="mt-0.5 text-[12.5px] font-bold tabular-nums text-foreground">{fmtMoney(value, currency)}</div>
      {cumulative && typeof p.add === "number" && (
        <div className="text-[11px] text-muted-foreground">{p.add >= 0 ? "+" : "−"}{fmtMoney(Math.abs(p.add), currency)} this step</div>
      )}
      {p.source && <div className="mt-1 max-w-[220px] text-[10.5px] italic text-muted-foreground">“{p.source}”</div>}
    </div>
  );
}
