"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  FileSignature,
  CheckCircle2,
  Lock,
  Gavel,
  Globe2,
  DollarSign,
  Repeat,
  Scale,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  GitBranch,
  Layers,
  FileText,
  History,
  Sparkles,
  type LucideIcon,
} from "@/components/ui/icons";
import { CLAUSE_TYPES } from "@/lib/clause-types";
import { Reveal } from "@/components/landing/primitives";

/* ──────────────────────────────────────────────────────────────
   Clause intelligence — one consolidated section: the three core
   capabilities up top, then the clause taxonomy as compact chips.
   Replaces the old FeatureOne + clause-grid pair to cut the text
   wall down to something scannable.
   ────────────────────────────────────────────────────────────── */

const CLAUSE_ICONS: Record<string, LucideIcon> = {
  "payment-milestone": DollarSign,
  "auto-renewal": Repeat,
  "ip-ownership": FileSignature,
  "liability-cap": Scale,
  "termination-notice": XCircle,
  confidentiality: Lock,
  penalty: AlertTriangle,
  "acceptance-criteria": CheckCircle2,
  "governing-law": Globe2,
  "dispute-resolution": Gavel,
  "force-majeure": ShieldAlert,
  "scope-change": GitBranch,
  other: Layers,
};

const CAPABILITIES = [
  { icon: ShieldAlert, title: "Playbook deviation", body: "Every clause scored against your playbook; drift flagged and cited to the section." },
  { icon: FileText, title: "OCR for any format", body: "Reads PDF, DOCX, and scanned image files, parsed down to the clause." },
  { icon: History, title: "Audit-ready history", body: "Each edit, approval, and upload logged per clause — built for SOC 2." },
];

export function ClauseIntelligenceSection() {
  return (
    <section className="px-5 md:px-10 py-24 md:py-32">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-10 max-w-[640px] md:mb-14">
          <Reveal as="h2" className="led-display text-[clamp(30px,3.4vw,46px)] leading-[1.05] text-[var(--led-ink)]">
            Every clause, extracted and scored.
          </Reveal>
          <Reveal as="p" delay={1} className="mt-5 max-w-[54ch] text-[15px] leading-[1.6] text-muted-foreground">
            Sonar reads the whole document, scores each clause against your playbook, and indexes
            it by type — so nothing waits for a manual first pass.
          </Reveal>
        </div>

        {/* Three core capabilities */}
        <Reveal delay={1} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {CAPABILITIES.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.title} className="rounded-2xl border border-[var(--led-line)] bg-[var(--paper-elev)] p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--page-bg)] text-[var(--led-ink)]">
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <h3 className="led-serif mt-4 text-[16px] text-[var(--led-ink)]">{c.title}</h3>
                <p className="mt-1.5 text-[13px] leading-[1.55] text-[var(--led-ink-soft)]">{c.body}</p>
              </div>
            );
          })}
        </Reveal>

        {/* Clause taxonomy — animated count-up + scanning sweep */}
        <AnimatedTaxonomy />

        <Reveal delay={2} className="mt-12">
          <Link
            href="/draft"
            className="group inline-flex items-center gap-2 rounded-full border border-[var(--led-line-2)] bg-[var(--paper-elev)] px-5 py-2.5 text-[13px] font-semibold text-[var(--led-ink)] transition-colors hover:border-[var(--led-ink)]"
          >
            <Sparkles size={14} className="text-[var(--pix-coral)]" />
            Draft a SOW with Sonar
            <ArrowRight size={14} strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* Animated taxonomy — the count tallies up as a "scan" highlight sweeps
   through the chips, suggesting Sonar finding each clause type in real time. */
function AnimatedTaxonomy() {
  const total = CLAUSE_TYPES.length;
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const [count, setCount] = useState(reduce ? total : 0);
  const [scan, setScan] = useState(-1);

  // Count up once the block scrolls into view. (Reduced motion → the initial
  // state is already `total`, so there's nothing to animate.)
  useEffect(() => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let started = false;
    const duration = 900;
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        setCount(Math.round(total * (1 - Math.pow(1 - t, 3))));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting && !started) { started = true; run(); io.disconnect(); }
      }),
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [reduce, total]);

  // Recurring scan sweep across the chips, with a short pause between passes.
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setScan((s) => (s + 1) % (total + 5)), 230);
    return () => clearInterval(id);
  }, [reduce, total]);

  return (
    <div ref={ref} className="mt-12 md:mt-16">
      <Reveal as="p" className="led-marker mb-5 flex items-center gap-2 text-[10.5px] text-[var(--led-ink-soft)]">
        <span className="tabular-nums text-[var(--led-ink)]">{count}</span> clause types · found in seconds
        <span aria-hidden className="ai-pulse" style={{ background: "var(--pix-coral)" }} />
      </Reveal>
      <Reveal delay={1} className="flex flex-wrap gap-2.5">
        {CLAUSE_TYPES.map((c, i) => {
          const Icon = CLAUSE_ICONS[c.id] ?? Layers;
          const lit = scan === i;
          return (
            <span
              key={c.id}
              className="group inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-all duration-300 hover:border-[var(--led-ink)]"
              style={{
                borderColor: lit ? "var(--pix-coral)" : "var(--led-line)",
                background: lit ? "color-mix(in srgb, var(--pix-coral) 10%, var(--paper-elev))" : "var(--paper-elev)",
                transform: lit ? "translateY(-2px)" : "none",
                boxShadow: lit ? "0 6px 16px -8px color-mix(in srgb, var(--pix-coral) 60%, transparent)" : "none",
              }}
            >
              <Icon
                size={14}
                strokeWidth={1.75}
                style={{ color: lit ? "var(--pix-coral)" : "var(--led-ink-soft)" }}
                className="transition-colors duration-300"
              />
              <span className="text-[var(--led-ink)]">{c.label}</span>
            </span>
          );
        })}
      </Reveal>
    </div>
  );
}
