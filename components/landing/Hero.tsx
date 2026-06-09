"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight, ShieldCheck } from "@/components/ui/icons";
import { PixelWave } from "@/components/landing/PixelWave";

/* ──────────────────────────────────────────────────────────────
   Hero — MindFlow-style: a heavy near-black statement on a warm
   gray canvas, a pixel-art gradient wave for art, then a dark band
   of honest capability stats. No invented vanity metrics, no fake
   customer logos — the band carries product facts and the formats
   we actually read.
   ────────────────────────────────────────────────────────────── */

// Honest, structural stats — capabilities and posture, not vanity counts.
const STATS: { value: string; label: string }[] = [
  { value: "< 1 min", label: "Upload to a fully scored clause list" },
  { value: "Every clause", label: "Extracted and scored, never sampled" },
  { value: "3 formats", label: "PDF, DOCX, and scanned-image OCR" },
  { value: "Per section", label: "Each finding cited to the exact clause" },
  { value: "SOC 2", label: "GDPR & HIPAA aligned" },
];

// Formats / destinations we work with — replaces the (removed) fake logo wall.
const WORKS_WITH = ["PDF", "DOCX", "Scanned OCR", "Word export"];

export function Hero() {
  const reduce = useReducedMotion();

  const reveal: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <section className="relative isolate overflow-hidden px-5 pt-[120px] pb-16 md:px-10 md:pt-[148px] md:pb-20">
      <div className="mx-auto max-w-[1240px]">
        {/* ── Statement + pixel wave ─────────────────────────── */}
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.02fr_1.18fr] lg:gap-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } } }}
            className="relative z-10 flex flex-col items-start"
          >

            <motion.h1
              variants={reveal}
              className="led-display mt-6 text-[clamp(42px,6vw,76px)] text-[var(--led-ink)]"
            >
              Bring contract<br className="hidden sm:block" /> chaos to{" "}
              <span className="relative whitespace-nowrap">
                clarity.
                <span aria-hidden className="absolute -bottom-1 left-0 h-[0.14em] w-full rounded-full bg-[var(--pix-coral)]" />
              </span>
            </motion.h1>

            <motion.p
              variants={reveal}
              className="mt-6 max-w-[480px] text-[16px] leading-[1.65] text-[var(--led-ink-soft)] md:text-[17px]"
            >
              Upload a SOW, MSA, or amendment. Blue-IQ extracts every clause, scores it
              against your own playbook, and tells you exactly where the document drifts —
              before it reaches a signature.
            </motion.p>

            <motion.div variants={reveal} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--led-ink)] px-6 text-[15px] font-semibold text-[#F5F4F0] transition-colors duration-200 hover:bg-black"
              >
                Get started — it&apos;s free
                <ArrowRight size={16} strokeWidth={2.25} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-[var(--led-line-2)] bg-[var(--paper-elev)] px-6 text-[15px] font-semibold text-[var(--led-ink)] transition-colors hover:border-[var(--led-ink)]"
              >
                Book a demo
              </Link>
            </motion.div>

            <motion.p variants={reveal} className="mt-8 flex items-center gap-2.5 text-[12.5px] text-[var(--led-ink-soft)]">
              <ShieldCheck size={15} className="shrink-0 text-[var(--led-ink)]" />
              <span>
                <span className="font-semibold text-[var(--led-ink)]">SOC&nbsp;2, GDPR &amp; HIPAA aligned.</span>{" "}
                Your contracts never train shared models.
              </span>
            </motion.p>
          </motion.div>

          {/* Pixel-art gradient wave — chaos resolving into a clear stream. */}
          <motion.div
            initial={{ opacity: 0, scale: reduce ? 1 : 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative -mr-5 h-[260px] sm:h-[340px] md:-mr-10 lg:h-[460px]"
          >
            <PixelWave className="h-full w-full" />
          </motion.div>
        </div>

        {/* ── Dark capability band ───────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-12% 0px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="pix-dark mt-16 overflow-hidden rounded-[28px] p-7 md:mt-20 md:p-10"
        >
          {/* Works-with strip — honest formats & destinations, not logos */}
          <div className="flex flex-col gap-4 border-b border-white/10 pb-7 sm:flex-row sm:items-center sm:justify-between">
            <span className="led-marker text-[10.5px] text-white/45">Works with the files you already have</span>
            <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
              {WORKS_WITH.map((w) => (
                <span key={w} className="text-[14px] font-semibold tracking-tight text-white/55 transition-colors hover:text-white/90">
                  {w}
                </span>
              ))}
            </div>
          </div>

          {/* Capability stat cards */}
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {STATS.map((s, i) => (
              <div
                key={s.value}
                className={[
                  "relative flex flex-col justify-between rounded-2xl bg-[#262521] p-4 md:p-5",
                  i === 4 ? "col-span-2 sm:col-span-1" : "",
                ].join(" ")}
              >
                <span
                  aria-hidden
                  className={`absolute right-4 top-4 h-2 w-2 rounded-[2px] ${
                    i % 2 === 0 ? "bg-[var(--pix-coral)]" : "bg-[var(--pix-peri)]"
                  }`}
                />
                <span className="led-display pr-6 text-[clamp(22px,2.4vw,30px)] leading-none text-[#F5F4F0]">
                  {s.value}
                </span>
                <span className="mt-3 text-[12px] leading-[1.4] text-white/55">{s.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
