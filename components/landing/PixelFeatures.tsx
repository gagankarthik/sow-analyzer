"use client";

import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import { PixelArt, type MascotName } from "@/components/landing/PixelArt";
import { Reveal } from "@/components/landing/primitives";

/* ──────────────────────────────────────────────────────────────
   PixelFeatures — MindFlow-style bento + orbital section.

   Two dark bento cards with pixel-art mascots sit above an orbital
   "Sonar" diagram (a dashed ring around the product's AI) and a
   cloud of capability pills. Echoes the reference layout while
   carrying Blue-IQ's contract-intelligence content.
   ────────────────────────────────────────────────────────────── */

const BENTO: {
  mascot: MascotName;
  tint: string; // pastel for the pixel art
  footerClass: string; // pastel footer fill
  title: string;
  body: string;
  cta: string;
  href: string;
}[] = [
  {
    mascot: "reader",
    tint: "var(--pix-pink2)",
    footerClass: "pix-fill-pink",
    title: "Reads every clause",
    body: "PDF, DOCX, or a scanned image — Blue-IQ parses the whole document and indexes it down to the individual clause.",
    cta: "Open the workspace",
    href: "/dashboard",
  },
  {
    mascot: "shield",
    tint: "var(--pix-peri)",
    footerClass: "pix-fill-lav",
    title: "Scores against your playbook",
    body: "Each clause is checked against your firm's standard position and flagged the moment it drifts — cited to the section.",
    cta: "See the playbook",
    href: "/settings/playbook",
  },
];

// The capabilities that flow out of "Sonar", laid out as graph nodes on a
// ring around the central hub. Positions are computed once (viewBox 0–100).
const NODE_ACCENTS = ["var(--pix-coral)", "var(--pix-peri)", "var(--pix-pink2)", "var(--pix-mauve)"];
const NODE_LABELS = ["Extracts", "Scores", "Flags", "Cites", "Diffs", "Drafts", "Tracks", "Reconciles"];
const GRAPH_RADIUS = 36; // distance from centre in viewBox units
const NODES = NODE_LABELS.map((label, i) => {
  const angle = ((-90 + i * (360 / NODE_LABELS.length)) * Math.PI) / 180;
  return {
    label,
    x: 50 + GRAPH_RADIUS * Math.cos(angle),
    y: 50 + GRAPH_RADIUS * Math.sin(angle),
    accent: NODE_ACCENTS[i % NODE_ACCENTS.length],
  };
});

export function PixelFeatures() {
  return (
    <section id="product" className="scroll-mt-20 px-5 py-20 md:px-10 md:py-28">
      <div className="mx-auto max-w-[1240px]">
        {/* Section intro — asymmetric, statement left / aside right */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <Reveal as="h2" className="led-display max-w-[18ch] text-[clamp(28px,3.6vw,48px)] text-[var(--led-ink)]">
            Contract review should do more than store the file.
          </Reveal>
          <Reveal
            as="p"
            delay={1}
            className="max-w-[42ch] text-[15px] leading-[1.65] text-[var(--led-ink-soft)] lg:pb-2"
          >
            That&apos;s why Blue-IQ goes past tracking documents — it reads them, understands
            the terms, and tells you where the risk sits.
          </Reveal>
        </div>

        {/* Bento cards */}
        <div className="mt-10 grid grid-cols-1 gap-4 md:mt-12 md:grid-cols-2">
          {BENTO.map((card) => (
            <Reveal key={card.title} delay={1} className="pix-dark group flex flex-col overflow-hidden rounded-[28px]">
              {/* art panel */}
              <div className="relative flex h-[230px] items-center justify-center md:h-[280px]">
                <div className="pix-bob">
                  <PixelArt name={card.mascot} color={card.tint} size={176} />
                </div>
              </div>

              {/* pastel footer */}
              <div className={`${card.footerClass} flex items-center justify-between gap-4 px-6 py-5`}>
                <div className="min-w-0">
                  <h3 className="text-[16px] font-semibold tracking-tight text-[#1A1A18]">{card.title}</h3>
                  <p className="mt-1 max-w-[34ch] text-[12.5px] leading-[1.5] text-[#1A1A18]/70">{card.body}</p>
                </div>
                <Link
                  href={card.href}
                  aria-label={card.cta}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 self-end rounded-lg bg-[#1A1A18] px-3.5 text-[12.5px] font-semibold text-[#F5F4F0] transition-transform duration-200 hover:translate-x-0.5"
                >
                  Go
                  <ArrowRight size={14} strokeWidth={2.25} />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Sonar flow graph — capabilities radiate out from the hub */}
        <div className="mt-16 md:mt-24">
          <div className="mx-auto mb-10 max-w-[560px] text-center md:mb-12">
            <Reveal as="h3" className="led-display text-[clamp(24px,3vw,38px)] text-[var(--led-ink)]">
              Your contract co-pilot.
            </Reveal>
            <Reveal as="p" delay={1} className="mt-3 text-[14px] leading-[1.6] text-[var(--led-ink-soft)]">
              Sonar handles the mechanical first pass — so your team starts at the decisions,
              not at page one.
            </Reveal>
          </div>

          <Reveal delay={1} className="relative mx-auto aspect-square w-full max-w-[520px]">
            {/* edges */}
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible" fill="none" aria-hidden>
              {/* faint guide ring the nodes sit on */}
              <circle cx="50" cy="50" r={GRAPH_RADIUS} stroke="var(--led-line)" strokeWidth="0.3" strokeDasharray="1 2.5" />
              {NODES.map((n) => (
                <g key={n.label}>
                  <line x1="50" y1="50" x2={n.x} y2={n.y} stroke="var(--led-line-2)" strokeWidth="0.4" />
                  <line className="pix-flow-line" x1="50" y1="50" x2={n.x} y2={n.y} stroke={n.accent} strokeWidth="0.7" strokeLinecap="round" />
                </g>
              ))}
            </svg>

            {/* central Sonar hub */}
            <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
              <div className="relative flex h-[112px] w-[112px] items-center justify-center rounded-full md:h-[128px] md:w-[128px]">
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "conic-gradient(from 210deg, var(--pix-coral), var(--pix-pink), var(--pix-mauve), var(--pix-peri), var(--pix-coral))",
                  }}
                />
                <div className="relative z-10 flex h-[80px] w-[80px] flex-col items-center justify-center rounded-full bg-[var(--page-bg)] md:h-[92px] md:w-[92px]">
                  <span className="led-marker text-[9.5px] text-[var(--led-ink-soft)]">AI</span>
                  <span className="led-display text-[17px] text-[var(--led-ink)] md:text-[19px]">Sonar</span>
                </div>
              </div>
            </div>

            {/* capability nodes */}
            {NODES.map((n) => (
              <div
                key={n.label}
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${n.x}%`, top: `${n.y}%` }}
              >
                <span className="pix-pill shadow-sm">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-[1px]" style={{ background: n.accent }} />
                  {n.label}
                </span>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
