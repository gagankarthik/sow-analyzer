"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MotionReveal } from "@/components/MotionReveal";
import {
  ArrowRight, Menu, X, FileText, Sparkles, GitBranch, Kanban, PieChart,
  BookMarked, ShieldCheck, Lock, CheckCircle2, Upload, Brain, Gavel,
} from "@/components/ui/icons";

const NAV = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Security", href: "#security" },
];

const FEATURES = [
  { icon: FileText, tint: "blue", title: "SOW Analyzer", body: "Every clause extracted, categorized, and risk-scored the moment you upload — no manual review." },
  { icon: Sparkles, tint: "violet", title: "Bluely Copilot", body: "Ask anything about a contract and get a grounded answer with citations to the exact clause." },
  { icon: GitBranch, tint: "amber", title: "Amendments tracking", body: "Diff every version against its parent. See what changed, who it favors, and the dollar impact." },
  { icon: Kanban, tint: "green", title: "Workflow pipeline", body: "Move contracts from draft to signed on one board. Nothing slips, everyone sees the same state." },
  { icon: PieChart, tint: "red", title: "Portfolio insights", body: "Risk across your whole book of business — surfaced before it lands on the P&L." },
  { icon: BookMarked, tint: "blue", title: "Playbook", body: "Score every clause against your firm's standard positions and flag deviations automatically." },
];

const TINT: Record<string, { bg: string; fg: string }> = {
  blue: { bg: "var(--brand-primary-50)", fg: "var(--brand-primary-600)" },
  violet: { bg: "var(--ai-surface)", fg: "var(--ai-ink)" },
  amber: { bg: "var(--warning-soft)", fg: "var(--warning)" },
  green: { bg: "var(--success-soft)", fg: "var(--success)" },
  red: { bg: "var(--danger-soft)", fg: "var(--danger)" },
};

const STEPS = [
  { icon: Upload, title: "Upload a contract", body: "Drop a SOW, MSA, NDA, or amendment — scanned or native, any common format." },
  { icon: Brain, title: "Bluely analyzes it", body: "Clauses, parties, dates, and risk are extracted and indexed automatically." },
  { icon: CheckCircle2, title: "Decide in 90 seconds", body: "Read the summary, review the flagged risks, and ask Bluely anything." },
];

const STATS = [
  { value: "60%", label: "shorter cycle times" },
  { value: "$8.2M", label: "revenue risk surfaced" },
  { value: "240+", label: "contracting teams" },
  { value: "90s", label: "to first insight" },
];

export default function Landing() {
  const [menu, setMenu] = useState(false);

  return (
    <div className="min-h-screen bg-white text-[var(--ink-900)]">
      {/* ── Nav ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-[var(--ink-100)] bg-white/85 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-5 md:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo-icon.svg" alt="" width={30} height={30} priority style={{ display: "block", width: 30, height: 30 }} />
            <span className="text-[18px] font-semibold tracking-tight" style={{ fontFamily: "var(--font-grotesk, var(--font-display))" }}>Blue-IQ</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="text-[14px] text-[var(--ink-600)] hover:text-[var(--ink-900)] transition-colors">{n.label}</a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Link href="/login" className="text-[14px] font-medium text-[var(--ink-700)] hover:text-[var(--ink-900)] px-4 h-10 inline-flex items-center transition-colors">Sign in</Link>
            <Link href="/signup" className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-[14px] font-medium transition-colors shadow-sm">
              Get started
            </Link>
          </div>

          <button onClick={() => setMenu((m) => !m)} className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--ink-50)]" aria-label="Menu">
            {menu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {menu && (
          <div className="md:hidden border-t border-[var(--ink-100)] bg-white px-5 py-4 space-y-1">
            {NAV.map((n) => <a key={n.href} href={n.href} onClick={() => setMenu(false)} className="block py-2 text-[15px] text-[var(--ink-700)]">{n.label}</a>)}
            <div className="pt-3 flex flex-col gap-2">
              <Link href="/login" className="h-11 inline-flex items-center justify-center rounded-full border border-[var(--ink-200)] text-[14px] font-medium">Sign in</Link>
              <Link href="/signup" className="h-11 inline-flex items-center justify-center rounded-full bg-[var(--brand-primary-600)] text-white text-[14px] font-medium">Get started</Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 md:px-8 pt-16 md:pt-24 pb-12 text-center">
        <MotionReveal>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ink-200)] bg-[var(--ink-25)] px-3 py-1 text-[12.5px] font-medium text-[var(--ink-600)]">
            <Sparkles size={13} className="text-[var(--ai-ink)]" /> AI contract intelligence
          </span>
          <h1 className="mt-6 mx-auto max-w-3xl text-[clamp(36px,6vw,64px)] font-bold leading-[1.05] tracking-tight" style={{ fontFamily: "var(--font-grotesk, var(--font-display))" }}>
            Every contract,<br className="hidden sm:block" /> <span className="text-[var(--brand-primary-600)]">understood.</span>
          </h1>
          <p className="mt-6 mx-auto max-w-2xl text-[16px] md:text-[18px] leading-relaxed text-[var(--ink-600)]">
            Blue-IQ reads your SOWs, MSAs, and amendments the moment you upload them — surfacing risk, tracking changes, and answering questions in seconds.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup" className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-[15px] font-medium transition-colors shadow-sm">
              Get started free <ArrowRight size={16} />
            </Link>
            <a href="#how" className="inline-flex items-center gap-1.5 h-12 px-6 rounded-full text-[15px] font-medium text-[var(--ink-700)] hover:bg-[var(--ink-50)] transition-colors">
              See how it works
            </a>
          </div>
          <p className="mt-4 text-[12.5px] text-[var(--ink-500)]">No credit card required · SOC 2 Type II · 90-second setup</p>
        </MotionReveal>

        {/* Product mock */}
        <MotionReveal delay={0.1}>
          <div className="mt-14 mx-auto max-w-4xl">
            <ProductMock />
          </div>
        </MotionReveal>
      </section>

      {/* ── Trust strip ─────────────────────────────────── */}
      <section className="border-y border-[var(--ink-100)] bg-[var(--ink-25)]">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-8">
          <p className="text-center text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--ink-500)]">Trusted by contracting teams everywhere</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70">
            {["Obelisk Capital", "Northwind", "Vector Bio", "Meridian Legal", "Cohort Health"].map((c) => (
              <span key={c} className="text-[16px] font-semibold tracking-tight text-[var(--ink-500)]" style={{ fontFamily: "var(--font-grotesk, var(--font-display))" }}>{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────── */}
      <section id="features" className="mx-auto max-w-6xl px-5 md:px-8 py-20 md:py-28">
        <MotionReveal>
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-[clamp(28px,4vw,40px)] font-bold tracking-tight" style={{ fontFamily: "var(--font-grotesk, var(--font-display))" }}>Everything you need to move faster</h2>
            <p className="mt-4 text-[16px] text-[var(--ink-600)] leading-relaxed">One workspace where Legal, Sales, Finance, and Procurement work the same contract.</p>
          </div>
        </MotionReveal>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => {
            const t = TINT[f.tint];
            const Icon = f.icon;
            return (
              <MotionReveal key={f.title} delay={Math.min(i * 0.05, 0.25)}>
                <div className="h-full rounded-3xl border border-[var(--ink-100)] bg-white p-7 shadow-xs hover:shadow-md transition-all duration-200">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: t.bg, color: t.fg }}>
                    <Icon size={22} strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-5 text-[18px] font-semibold tracking-tight">{f.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-[var(--ink-600)]">{f.body}</p>
                </div>
              </MotionReveal>
            );
          })}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────── */}
      <section id="how" className="bg-[var(--brand-primary-50)]/40 border-y border-[var(--ink-100)]">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-20 md:py-28">
          <MotionReveal>
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-[clamp(28px,4vw,40px)] font-bold tracking-tight" style={{ fontFamily: "var(--font-grotesk, var(--font-display))" }}>From upload to decision in three steps</h2>
              <p className="mt-4 text-[16px] text-[var(--ink-600)]">No setup, no training data, no waiting.</p>
            </div>
          </MotionReveal>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <MotionReveal key={s.title} delay={i * 0.08}>
                  <div className="rounded-3xl bg-white border border-[var(--ink-100)] p-7 shadow-xs h-full">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-primary-600)] text-white text-[15px] font-bold">{i + 1}</span>
                      <Icon size={20} className="text-[var(--brand-primary-600)]" />
                    </div>
                    <h3 className="mt-5 text-[18px] font-semibold tracking-tight">{s.title}</h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-[var(--ink-600)]">{s.body}</p>
                  </div>
                </MotionReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 md:px-8 py-20 md:py-24">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <MotionReveal key={s.label} delay={i * 0.06}>
              <div className="text-center">
                <div className="text-[clamp(32px,5vw,52px)] font-bold tracking-tight text-[var(--brand-primary-600)]" style={{ fontFamily: "var(--font-grotesk, var(--font-display))" }}>{s.value}</div>
                <div className="mt-1 text-[14px] text-[var(--ink-600)]">{s.label}</div>
              </div>
            </MotionReveal>
          ))}
        </div>
      </section>

      {/* ── Bluely highlight ────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 md:px-8 pb-20 md:pb-28">
        <MotionReveal>
          <div className="rounded-[28px] border border-[var(--ai-border)] bg-[var(--ai-surface)]/50 p-8 md:p-12 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ai-ink)]">
                <Sparkles size={14} /> Meet Bluely
              </span>
              <h2 className="mt-4 text-[clamp(26px,3.5vw,38px)] font-bold tracking-tight" style={{ fontFamily: "var(--font-grotesk, var(--font-display))" }}>Ask your contracts anything.</h2>
              <p className="mt-4 text-[16px] leading-relaxed text-[var(--ink-600)]">
                Bluely is grounded in your clauses — so every answer cites the exact section. Find liability caps, compare to your playbook, or draft a counter, in plain language.
              </p>
              <Link href="/signup" className="mt-7 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-[var(--ai-ink)] hover:opacity-90 text-white text-[15px] font-medium transition-opacity">
                Try Bluely <ArrowRight size={16} />
              </Link>
            </div>
            <ChatMock />
          </div>
        </MotionReveal>
      </section>

      {/* ── Security ────────────────────────────────────── */}
      <section id="security" className="border-y border-[var(--ink-100)] bg-[var(--ink-25)]">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-16 md:py-20">
          <MotionReveal>
            <div className="text-center max-w-2xl mx-auto">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--success-soft)] text-[var(--success)] mb-4"><ShieldCheck size={24} /></span>
              <h2 className="text-[clamp(26px,3.5vw,36px)] font-bold tracking-tight" style={{ fontFamily: "var(--font-grotesk, var(--font-display))" }}>Enterprise-grade security</h2>
              <p className="mt-3 text-[15px] text-[var(--ink-600)]">Your contracts are encrypted, isolated per tenant, and never used to train shared models.</p>
            </div>
          </MotionReveal>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: ShieldCheck, label: "SOC 2 Type II" },
              { icon: Gavel, label: "GDPR ready" },
              { icon: CheckCircle2, label: "HIPAA aligned" },
              { icon: Lock, label: "AES-256 at rest" },
              { icon: Lock, label: "TLS 1.3 in transit" },
            ].map((b) => {
              const Icon = b.icon;
              return (
                <span key={b.label} className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-[var(--ink-200)] bg-white text-[13.5px] font-medium text-[var(--ink-700)]">
                  <Icon size={15} className="text-[var(--success)]" />{b.label}
                </span>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 md:px-8 py-24 md:py-32 text-center">
        <MotionReveal>
          <h2 className="mx-auto max-w-2xl text-[clamp(30px,5vw,52px)] font-bold tracking-tight leading-[1.08]" style={{ fontFamily: "var(--font-grotesk, var(--font-display))" }}>
            Bring every contract into focus.
          </h2>
          <p className="mt-5 mx-auto max-w-xl text-[16px] text-[var(--ink-600)]">Join 240+ teams turning contracts into decisions in seconds.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup" className="inline-flex items-center gap-2 h-12 px-8 rounded-full bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-[15px] font-medium transition-colors shadow-sm">
              Get started free <ArrowRight size={16} />
            </Link>
            <Link href="/login" className="inline-flex items-center h-12 px-6 rounded-full text-[15px] font-medium text-[var(--ink-700)] hover:bg-[var(--ink-50)] transition-colors">Sign in</Link>
          </div>
        </MotionReveal>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-[var(--ink-100)] bg-[var(--ink-25)]">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2">
                <Image src="/logo-icon.svg" alt="" width={26} height={26} style={{ display: "block", width: 26, height: 26 }} />
                <span className="text-[16px] font-semibold tracking-tight" style={{ fontFamily: "var(--font-grotesk, var(--font-display))" }}>Blue-IQ</span>
              </div>
              <p className="mt-3 text-[13px] text-[var(--ink-500)] max-w-[200px] leading-relaxed">AI contract intelligence for modern legal and revenue teams.</p>
            </div>
            <FooterCol title="Product" links={["Features", "How it works", "Security", "Pricing"]} />
            <FooterCol title="Company" links={["About", "Careers", "Blog", "Contact"]} />
            <FooterCol title="Legal" links={["Privacy", "Terms", "DPA", "Compliance"]} />
          </div>
          <div className="mt-10 pt-6 border-t border-[var(--ink-100)] flex flex-col sm:flex-row items-center justify-between gap-3 text-[12.5px] text-[var(--ink-500)]">
            <span>© {new Date().getFullYear()} Blue-IQ. All rights reserved.</span>
            <span>Built for teams who read the fine print.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h4 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-500)]">{title}</h4>
      <ul className="mt-3 space-y-2">
        {links.map((l) => <li key={l}><a href="#" className="text-[13.5px] text-[var(--ink-600)] hover:text-[var(--ink-900)] transition-colors">{l}</a></li>)}
      </ul>
    </div>
  );
}

/* ── Hero product mock (pure CSS) ───────────────────────── */
function ProductMock() {
  return (
    <div className="rounded-2xl border border-[var(--ink-200)] bg-white shadow-xl overflow-hidden text-left">
      {/* window bar */}
      <div className="h-10 border-b border-[var(--ink-100)] bg-[var(--ink-25)] flex items-center gap-1.5 px-4">
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--ink-200)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--ink-200)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--ink-200)]" />
        <span className="ml-3 text-[11px] font-mono text-[var(--ink-400)]">blue-iq.app/projects</span>
      </div>
      <div className="p-5 md:p-6 grid grid-cols-3 gap-4 bg-[var(--ink-25)]/40">
        {/* KPI tiles */}
        {[{ k: "Clauses", v: "1,248", c: "var(--brand-primary-600)" }, { k: "High-risk", v: "38", c: "var(--danger)" }, { k: "Ready", v: "92%", c: "var(--success)" }].map((t) => (
          <div key={t.k} className="rounded-xl border border-[var(--ink-100)] bg-white p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-400)]">{t.k}</div>
            <div className="mt-1.5 text-[22px] font-bold tabular-nums" style={{ fontFamily: "var(--font-grotesk, var(--font-display))", color: t.c }}>{t.v}</div>
          </div>
        ))}
        {/* risk ring */}
        <div className="rounded-xl border border-[var(--ink-100)] bg-white p-4 flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0">
            <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--ink-100)" strokeWidth="4" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--danger)" strokeWidth="4" strokeDasharray="97" strokeDashoffset="62" strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold">36%</span>
          </div>
          <div className="space-y-1.5 flex-1">
            {[["Critical", "var(--danger)", "30%"], ["High", "var(--warning)", "55%"], ["Low", "var(--success)", "80%"]].map(([l, c, w]) => (
              <div key={l} className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--ink-500)] w-12">{l}</span>
                <span className="flex-1 h-1.5 rounded-full bg-[var(--ink-100)] overflow-hidden"><span className="block h-full rounded-full" style={{ width: w, background: c as string }} /></span>
              </div>
            ))}
          </div>
        </div>
        {/* clause list */}
        <div className="col-span-2 rounded-xl border border-[var(--ink-100)] bg-white p-4 space-y-2.5">
          {[["Limitation of Liability", "critical", "var(--danger)"], ["Payment terms", "medium", "var(--ink-400)"], ["IP assignment", "high", "var(--warning)"]].map(([t, r, c]) => (
            <div key={t} className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full" style={{ background: c as string }} />
              <span className="text-[12px] font-medium flex-1 truncate">{t}</span>
              <span className="text-[10px] font-semibold capitalize px-1.5 py-0.5 rounded-full" style={{ background: "var(--ink-50)", color: c as string }}>{r}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Bluely chat mock ───────────────────────────────────── */
function ChatMock() {
  return (
    <div className="rounded-2xl border border-[var(--ai-border)] bg-white shadow-lg p-5 space-y-3">
      <div className="flex justify-end">
        <span className="max-w-[80%] rounded-2xl rounded-tr-sm bg-[var(--ink-900)] text-white px-3.5 py-2 text-[13px]">What's the liability cap, and is it standard?</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--ai-ink)]"><Sparkles size={11} />Bluely</span>
        <div className="rounded-2xl rounded-tl-sm bg-[var(--ai-surface)] px-3.5 py-3 text-[13px] leading-relaxed text-[var(--ink-800)]">
          Liability is capped at fees paid in the prior 12 months <span className="font-mono text-[var(--ai-ink)]">[§12.3]</span> — but the cap is <strong>2× below</strong> your playbook standard, and data-breach carve-outs are uncapped.
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--ai-border)] bg-white px-2 py-0.5 text-[10.5px] font-mono text-[var(--ai-ink)]">§12.3</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--ai-border)] bg-white px-2 py-0.5 text-[10.5px] font-mono text-[var(--ai-ink)]">Playbook G.1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
