"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Activity,
} from "@/components/ui/icons";
import { MonitoringChart } from "@/components/MonitoringChart";
import { Reveal } from "@/components/landing/primitives";

/* Count-up that animates the first time it scrolls into view. */
function CountUp({
  to, prefix = "", suffix = "", duration = 1400, decimals = 0,
}: {
  to: number; prefix?: string; suffix?: string; duration?: number; decimals?: number;
}) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            setValue(to * eased);
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString()}
      {suffix}
    </span>
  );
}

/* ──────────────────────────────────────────────── */
/*  Lead section — the problem, the proof, the thesis */
/* ──────────────────────────────────────────────── */
export function LeadSection() {
  const stats = [
    { stat: <><span className="text-muted-foreground">−</span><CountUp to={60} suffix="%" /></>, label: "review cycle time" },
    { stat: <CountUp to={8.2} decimals={1} prefix="$" suffix="M" />, label: "revenue at risk surfaced" },
    { stat: <CountUp to={14} />, label: "anomalies / month" },
    { stat: <CountUp to={100} suffix="%" />, label: "audit-ready trail" },
  ];
  return (
    <section className="px-5 md:px-10 py-24 md:py-32">
      <div className="mx-auto grid max-w-[1100px] grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-2">

        {/* A · The problem — copy + cycle gap */}
        <div className="flex flex-col">
          <div className="p-6 sm:p-10">
            <Reveal as="span" className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              <AlertTriangle size={14} className="text-[var(--brand-primary-600)]" />
              The problem
            </Reveal>
            <Reveal as="h2" className="landing-h2 mt-6 text-[clamp(26px,3vw,40px)] leading-[1.12] text-foreground" delay={1}>
              A missed clause is <span className="accent-gradient">money</span> you didn&apos;t protect.
            </Reveal>
            <Reveal as="p" className="mt-5 max-w-[480px] text-[15px] leading-[1.65] text-[var(--ink-600)]" delay={2}>
              More contracts means a slower first pass. Legal re-reads the same boilerplate for
              weeks while Finance finds the exposure months after signing. Blue-IQ extracts and
              scores every clause the moment a contract lands.
            </Reveal>
          </div>
          <Reveal delay={3} className="mt-auto border-t border-border bg-muted/30 px-6 py-7 sm:px-10">
            <div className="flex flex-col gap-3">
              <div>
                <div className="mb-1.5 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
                  <span>Manual review</span><span>21 days</span>
                </div>
                <div className="h-2 w-full rounded-full bg-border" />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--brand-primary-700)]">
                  <span>With Blue-IQ</span><span>8 days</span>
                </div>
                <div className="h-2 w-[38%] rounded-full bg-[var(--brand-primary-600)]" />
              </div>
            </div>
          </Reveal>
        </div>

        {/* B · Caught at signing — flagged clause card */}
        <div className="flex flex-col border-t border-border bg-muted/20 md:border-l md:border-t-0">
          <div className="p-6 sm:p-10">
            <Reveal as="span" className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              <ShieldAlert size={14} className="text-[var(--brand-primary-600)]" />
              Caught at signing
            </Reveal>
            <Reveal as="p" className="mt-6 text-2xl font-semibold leading-snug tracking-tight text-foreground" delay={1}>
              Playbook deviations surface at upload, not six months later.
            </Reveal>
          </div>
          <Reveal delay={2} className="mt-auto px-6 pb-8 sm:px-10">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">Northwind MSA</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--risk-4)]/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--risk-4)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--risk-4)]" />Flagged at upload
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-mono text-[11px] text-muted-foreground">§7.2</span>
                <span className="text-[14px] font-semibold text-foreground">Limitation of Liability</span>
              </div>
              <p className="mt-1.5 text-[12.5px] leading-[1.5] text-muted-foreground">
                Sits <span className="font-semibold text-foreground">2× above</span> your playbook cap — about <span className="font-semibold text-foreground">$3.36M</span> of unprotected exposure.
              </p>
              <div className="mt-3 border-t border-border pt-2.5">
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="font-mono text-[11px] text-muted-foreground">§4.2</span>
                  <span className="flex-1 text-foreground">Service Level Agreement</span>
                  <span className="inline-flex items-center gap-1 text-[var(--success)]"><CheckCircle2 size={12} />within playbook</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* C · The proof — animated stat band */}
        <div className="col-span-full grid grid-cols-2 border-t border-border sm:grid-cols-4 sm:divide-x sm:divide-border">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={((i + 1) as 1 | 2 | 3 | 4)} className="px-6 py-8 text-center md:py-10">
              <div className="landing-display text-[clamp(28px,3.6vw,46px)] leading-none tabular-nums text-foreground">{s.stat}</div>
              <div className="mt-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{s.label}</div>
            </Reveal>
          ))}
        </div>

        {/* D · Live monitoring */}
        <div className="col-span-full border-t border-border p-6 sm:p-10">
          <Reveal as="span" className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            <Activity size={14} className="text-[var(--brand-primary-600)]" />
            Live monitoring
          </Reveal>
          <Reveal as="p" className="mt-6 max-w-[640px] text-2xl font-semibold leading-snug tracking-tight text-foreground" delay={1}>
            Exposure flagged, month over month.{" "}
            <span className="text-muted-foreground">Caught the moment a contract lands, while there&apos;s still time to act.</span>
          </Reveal>
          <Reveal delay={2} className="mt-8">
            <MonitoringChart />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
