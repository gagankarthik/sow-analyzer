"use client";

import Link from "next/link";
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
  Sparkles,
  type LucideIcon,
} from "@/components/ui/icons";
import { CLAUSE_TYPES } from "@/lib/clause-types";
import { Reveal } from "@/components/landing/primitives";

/* ──────────────────────────────────────────────── */
/*  Clause taxonomy — grid of the 13 clause types     */
/* ──────────────────────────────────────────────── */
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

export function ClauseIntelligenceSection() {
  return (
    <section className="px-5 md:px-10 py-24 md:py-32">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-10 flex flex-col items-center gap-4 text-center md:mb-14">
          <Reveal as="span" className="led-marker text-[var(--led-blue)]">
            The taxonomy
          </Reveal>
          <Reveal as="h2" className="led-display max-w-[20ch] text-[clamp(30px,3.4vw,46px)] leading-[1.05] text-[var(--led-ink)]">
            <span className="tabular-nums">{CLAUSE_TYPES.length}</span> clause types, found in seconds
          </Reveal>
          <Reveal as="p" className="max-w-[60ch] text-[15px] leading-[1.6] text-muted-foreground" delay={1}>
            Every clause that moves your risk or your revenue — payment terms, liability caps,
            auto-renewals, IP, termination — extracted from the SOW or MSA and labelled by type.
          </Reveal>
        </div>

        <Reveal delay={1}>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {CLAUSE_TYPES.map((c) => {
                const Icon = CLAUSE_ICONS[c.id] ?? Layers;
                return (
                  <div
                    key={c.id}
                    className="group flex items-start gap-3.5 border-b border-r border-border bg-card p-5 transition-colors hover:bg-muted/40"
                  >
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)] ring-1 ring-[var(--brand-primary-100)] transition-transform group-hover:scale-105">
                      <Icon size={18} strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[13.5px] font-semibold tracking-tight text-foreground">{c.label}</h3>
                      <p className="mt-0.5 text-[12px] leading-[1.5] text-muted-foreground">{c.blurb}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>

        <Reveal delay={2} className="mt-8 flex justify-center">
          <Link
            href="/draft"
            className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <Sparkles size={14} className="text-[var(--brand-primary-600)]" />
            Draft a SOW with Sonar
            <ArrowRight size={14} strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
