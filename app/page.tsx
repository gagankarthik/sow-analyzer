"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  type MotionValue,
} from "framer-motion";
import {
  ArrowRight, ChevronDown, Menu, X, ShieldCheck, ShieldAlert, TrendingUp,
  DollarSign, GitBranch, Kanban, PieChart, BookMarked, FileText, Sparkles,
  BarChart3, Scale, Lock, CheckCircle2, Clock,
} from "@/components/ui/icons";

/* ───────────────── nav data ───────────────── */

const PRODUCT = [
  { icon: FileText, title: "SOW Analyzer", desc: "Clause-level risk extraction", href: "/signup" },
  { icon: Sparkles, title: "Bluely Copilot", desc: "Answers grounded in your clauses", href: "/signup" },
  { icon: GitBranch, title: "Amendments", desc: "Diff every version automatically", href: "/signup" },
  { icon: Kanban, title: "Workflow", desc: "Draft to signed on one board", href: "/signup" },
  { icon: PieChart, title: "Portfolio insights", desc: "Risk across the whole book", href: "/signup" },
  { icon: BookMarked, title: "Playbook", desc: "Score deviations from your standards", href: "/signup" },
];
const SOLUTIONS = [
  { title: "Legal", desc: "Review faster, miss nothing" },
  { title: "Sales", desc: "Close without legal bottlenecks" },
  { title: "Finance", desc: "Catch exposure before it lands" },
  { title: "Procurement", desc: "Standardize every vendor deal" },
];
const RESOURCES = [
  { title: "Documentation", desc: "Guides and API reference" },
  { title: "Security", desc: "SOC 2, GDPR, HIPAA" },
  { title: "Blog", desc: "Contract intelligence, explained" },
];

const OUTCOMES = [
  { icon: ShieldAlert, accent: "danger", stat: "$3.4M", label: "liability caught per portfolio", body: "Bluely flags one-sided caps, uncapped indemnities, and missing carve-outs the moment a contract lands." },
  { icon: Clock, accent: "brand", stat: "21 → 8 days", label: "median review cycle", body: "Clauses, risk, and summaries are ready in 90 seconds — so review starts where it used to end." },
  { icon: DollarSign, accent: "success", stat: "$8.2M", label: "revenue protected", body: "Surface auto-renewals, SLA gaps, and payment risk before they quietly erode the P&L." },
];

const ACCENT: Record<string, string> = {
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  brand: "bg-[var(--brand-primary-50)] text-[var(--brand-primary-600)]",
  success: "bg-[var(--success-soft)] text-[var(--success)]",
};

/* ───────────────── page ───────────────── */

export default function Landing() {
  const [mobile, setMobile] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const yBack = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const yMid = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="min-h-screen bg-white text-[var(--ink-900)] overflow-x-hidden">
      <SiteNav mobile={mobile} setMobile={setMobile} />

      {/* ── Hero ─────────────────────────────────────── */}
      <section ref={heroRef} className="relative">
        {/* faint tech grid backdrop */}
        <div className="holo-grid pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <motion.div style={{ y: yBack }} className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div className="absolute left-[8%] top-32 h-64 w-64 rounded-full bg-[var(--brand-primary-100)] opacity-40 blur-3xl" />
          <div className="absolute right-[6%] top-56 h-72 w-72 rounded-full bg-[var(--success-soft)] opacity-50 blur-3xl" />
        </motion.div>

        <div className="mx-auto max-w-6xl px-5 md:px-8 pt-20 md:pt-28 pb-16">
          <motion.div style={{ opacity: fade }} className="max-w-3xl">
            <motion.span
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 rounded-md border border-[var(--ink-200)] bg-white px-3 py-1 text-[12.5px] font-medium text-[var(--ink-600)] shadow-xs"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" /> Contract intelligence for revenue teams
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="landing-display mt-6 text-[clamp(40px,6.5vw,72px)] text-[var(--ink-900)]"
            >
              See the revenue your<br className="hidden sm:block" /> contracts are leaking.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 max-w-xl text-[17px] md:text-[18px] leading-relaxed text-[var(--ink-600)]"
            >
              Blue-IQ reads every SOW, MSA, and amendment the moment you upload it — quantifying risk, recovering revenue, and cutting review cycles from weeks to minutes.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="mt-9 flex flex-col sm:flex-row items-start sm:items-center gap-3"
            >
              <Link href="/signup" className="inline-flex items-center gap-2 h-12 px-7 rounded-lg bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-[15px] font-semibold shadow-md transition-colors">
                Start free <ArrowRight size={16} />
              </Link>
              <a href="#outcomes" className="group inline-flex items-center gap-1.5 h-12 px-5 rounded-lg border border-[var(--ink-200)] bg-white text-[15px] font-semibold text-[var(--ink-800)] hover:border-[var(--brand-primary-300)] transition-colors">
                See the ROI <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </a>
            </motion.div>
            <p className="mt-4 text-[12.5px] text-[var(--ink-500)]">No credit card · SOC 2 Type II · live in 90 seconds</p>
          </motion.div>
        </div>

        {/* parallax 3D command-center mock */}
        <motion.div style={{ y: yMid }} className="mx-auto max-w-5xl px-5 md:px-8 pb-20">
          <TiltMock />
        </motion.div>
      </section>

      {/* ── Logos ────────────────────────────────────── */}
      <Reveal>
        <section className="border-y border-[var(--ink-100)] bg-[var(--ink-25)]">
          <div className="mx-auto max-w-6xl px-5 md:px-8 py-8">
            <p className="text-center text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--ink-500)]">Trusted across 240+ contracting teams</p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 opacity-60">
              {["Obelisk Capital", "Northwind", "Vector Bio", "Meridian Legal", "Cohort Health"].map((c) => (
                <span key={c} className="landing-h3 text-[18px] text-[var(--ink-500)]">{c}</span>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── Outcomes (ROI / Risk / Money) ────────────── */}
      <section id="outcomes" className="mx-auto max-w-6xl px-5 md:px-8 py-24 md:py-32">
        <Reveal>
          <div className="max-w-2xl">
            <span className="landing-label text-[var(--brand-primary-600)]">The bottom line</span>
            <h2 className="landing-h1 mt-3 text-[clamp(30px,4.5vw,46px)] text-[var(--ink-900)]">Risk you can see. Revenue you keep.</h2>
            <p className="mt-4 text-[17px] leading-relaxed text-[var(--ink-600)]">Three numbers every GC, CRO, and CFO cares about — measured on contracts you already have.</p>
          </div>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
          {OUTCOMES.map((o, i) => (
            <Reveal key={o.label} delay={i * 0.08}>
              <TiltCard className="h-full rounded-2xl border border-[var(--ink-100)] bg-white p-7 shadow-sm">
                <span className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${ACCENT[o.accent]}`}>
                  <o.icon size={22} strokeWidth={1.75} />
                </span>
                <div className="landing-display mt-6 text-[clamp(28px,3.5vw,40px)] text-[var(--ink-900)]">{o.stat}</div>
                <div className="mt-1 text-[13.5px] font-medium text-[var(--ink-500)]">{o.label}</div>
                <p className="mt-4 text-[14px] leading-relaxed text-[var(--ink-600)]">{o.body}</p>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Feature showcase (alternating, parallax) ─── */}
      <section id="product" className="bg-[var(--ink-25)] border-y border-[var(--ink-100)]">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-24 md:py-32 space-y-28">
          <ShowcaseRow
            label="Risk, quantified"
            icon={BarChart3}
            title="A risk score on every clause — in seconds."
            body="Bluely classifies each clause, assesses its commercial risk from the actual wording, and rolls it up into a single portfolio score. No templates, no manual tagging."
            visual={<RiskVisual />}
          />
          <ShowcaseRow
            reverse
            label="Change, tracked"
            icon={GitBranch}
            title="Every amendment, diffed and priced."
            body="See exactly what changed between versions, who it favors, and the dollar impact — so a quiet redline never costs you six months later."
            visual={<DiffVisual />}
          />
          <ShowcaseRow
            label="Answers, grounded"
            icon={Sparkles}
            title="Ask your contracts anything."
            body="Bluely answers from your clauses and cites the exact section. Find a liability cap, compare to your playbook, or draft a counter — in plain language."
            visual={<ChatVisual />}
          />
        </div>
      </section>

      {/* ── Security ─────────────────────────────────── */}
      <Reveal>
        <section id="security" className="mx-auto max-w-6xl px-5 md:px-8 py-24 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--success-soft)] text-[var(--success)]"><ShieldCheck size={26} /></span>
          <h2 className="landing-h1 mt-5 text-[clamp(28px,4vw,40px)] text-[var(--ink-900)]">Built for the contracts you can&apos;t afford to leak.</h2>
          <p className="mt-3 mx-auto max-w-xl text-[15px] text-[var(--ink-600)]">Encrypted, tenant-isolated, and never used to train shared models.</p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: ShieldCheck, label: "SOC 2 Type II" },
              { icon: Scale, label: "GDPR ready" },
              { icon: CheckCircle2, label: "HIPAA aligned" },
              { icon: Lock, label: "AES-256 at rest" },
              { icon: Lock, label: "TLS 1.3 in transit" },
            ].map((b) => (
              <span key={b.label} className="inline-flex items-center gap-2 h-11 px-4 rounded-lg border border-[var(--ink-200)] bg-white text-[13.5px] font-medium text-[var(--ink-700)] shadow-xs">
                <b.icon size={15} className="text-[var(--success)]" />{b.label}
              </span>
            ))}
          </div>
        </section>
      </Reveal>

      {/* ── Final CTA ────────────────────────────────── */}
      <section className="relative border-t border-[var(--ink-100)] bg-[var(--brand-primary-950)] text-white overflow-hidden">
        <div className="holo-grid pointer-events-none absolute inset-0 opacity-[0.15]" aria-hidden />
        <Reveal>
          <div className="relative mx-auto max-w-4xl px-5 md:px-8 py-28 text-center">
            <h2 className="landing-display text-[clamp(32px,5vw,56px)] leading-[1.08]">Bring every contract into focus.</h2>
            <p className="mt-5 mx-auto max-w-xl text-[16px] text-white/70">Join the teams turning contracts into decisions — and risk into recovered revenue.</p>
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/signup" className="inline-flex items-center gap-2 h-12 px-8 rounded-lg bg-white text-[var(--brand-primary-700)] text-[15px] font-semibold hover:bg-[var(--ink-100)] transition-colors">
                Start free <ArrowRight size={16} />
              </Link>
              <Link href="/login" className="inline-flex items-center h-12 px-6 rounded-lg border border-white/25 text-[15px] font-semibold text-white hover:bg-white/10 transition-colors">Sign in</Link>
            </div>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}

/* ───────────────── nav ───────────────── */

function SiteNav({ mobile, setMobile }: { mobile: boolean; setMobile: (v: boolean) => void }) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--ink-100)] bg-white/85 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-5 md:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/logo-icon.svg" alt="" width={30} height={30} priority className="block h-[30px] w-[30px]" />
          <span className="landing-h3 text-[19px] text-[var(--ink-900)]">Blue-IQ</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          <NavDropdown label="Product" wide>
            <div className="grid grid-cols-2 gap-1 w-[440px]">
              {PRODUCT.map((p) => (
                <Link key={p.title} href={p.href} className="flex items-start gap-3 rounded-lg p-3 hover:bg-[var(--ink-50)] transition-colors">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-primary-50)] text-[var(--brand-primary-600)] shrink-0"><p.icon size={17} strokeWidth={1.75} /></span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold text-[var(--ink-900)]">{p.title}</span>
                    <span className="block text-[12px] text-[var(--ink-500)]">{p.desc}</span>
                  </span>
                </Link>
              ))}
            </div>
          </NavDropdown>

          <NavDropdown label="Solutions">
            <div className="w-[260px]">
              {SOLUTIONS.map((s) => (
                <Link key={s.title} href="/signup" className="block rounded-lg p-3 hover:bg-[var(--ink-50)] transition-colors">
                  <span className="block text-[13.5px] font-semibold text-[var(--ink-900)]">{s.title}</span>
                  <span className="block text-[12px] text-[var(--ink-500)]">{s.desc}</span>
                </Link>
              ))}
            </div>
          </NavDropdown>

          <NavDropdown label="Resources">
            <div className="w-[260px]">
              {RESOURCES.map((s) => (
                <Link key={s.title} href="#" className="block rounded-lg p-3 hover:bg-[var(--ink-50)] transition-colors">
                  <span className="block text-[13.5px] font-semibold text-[var(--ink-900)]">{s.title}</span>
                  <span className="block text-[12px] text-[var(--ink-500)]">{s.desc}</span>
                </Link>
              ))}
            </div>
          </NavDropdown>

          <a href="#security" className="px-3.5 h-9 inline-flex items-center text-[14px] font-medium text-[var(--ink-600)] hover:text-[var(--ink-900)] transition-colors">Security</a>
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          <Link href="/login" className="text-[14px] font-medium text-[var(--ink-700)] hover:text-[var(--ink-900)] px-4 h-10 inline-flex items-center transition-colors">Sign in</Link>
          <Link href="/signup" className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-[14px] font-semibold shadow-sm transition-colors">Start free</Link>
        </div>

        <button onClick={() => setMobile(!mobile)} className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-[var(--ink-50)]" aria-label="Menu">
          {mobile ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobile && (
        <div className="lg:hidden border-t border-[var(--ink-100)] bg-white px-5 py-4 space-y-1">
          {["Product", "Solutions", "Resources", "Security"].map((l) => (
            <a key={l} href="#product" onClick={() => setMobile(false)} className="block py-2.5 text-[15px] font-medium text-[var(--ink-700)]">{l}</a>
          ))}
          <div className="pt-3 flex flex-col gap-2">
            <Link href="/login" className="h-11 inline-flex items-center justify-center rounded-lg border border-[var(--ink-200)] text-[14px] font-semibold">Sign in</Link>
            <Link href="/signup" className="h-11 inline-flex items-center justify-center rounded-lg bg-[var(--brand-primary-600)] text-white text-[14px] font-semibold">Start free</Link>
          </div>
        </div>
      )}
    </header>
  );
}

function NavDropdown({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="relative group">
      <button className="px-3.5 h-9 inline-flex items-center gap-1 text-[14px] font-medium text-[var(--ink-600)] group-hover:text-[var(--ink-900)] transition-colors">
        {label}<ChevronDown size={14} className="group-hover:rotate-180 transition-transform duration-200" />
      </button>
      <div className={`absolute left-0 top-full pt-2 ${wide ? "" : ""} opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200`}>
        <div className="rounded-2xl border border-[var(--ink-100)] bg-white p-2 shadow-xl">{children}</div>
      </div>
    </div>
  );
}

/* ───────────────── reveal + tilt ───────────────── */

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 200, damping: 18 });
  const sry = useSpring(ry, { stiffness: 200, damping: 18 });
  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * 8);
    rx.set(-py * 8);
  }
  function onLeave() { rx.set(0); ry.set(0); }
  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 900 }}
      className={`will-change-transform transition-shadow hover:shadow-lg ${className ?? ""}`}
    >
      {children}
    </motion.div>
  );
}

/* ───────────────── visuals ───────────────── */

function TiltMock() {
  return (
    <TiltCard className="rounded-2xl border border-[var(--ink-200)] bg-white shadow-2xl overflow-hidden">
      <div className="h-10 border-b border-[var(--ink-100)] bg-[var(--ink-25)] flex items-center gap-1.5 px-4">
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--ink-200)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--ink-200)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--ink-200)]" />
        <span className="ml-3 text-[11px] font-mono text-[var(--ink-400)]">blue-iq.app/portfolio</span>
      </div>
      <div className="grid grid-cols-3 gap-4 p-5 md:p-6 bg-[var(--ink-25)]/40">
        {[{ k: "Revenue protected", v: "$8.2M", c: "text-[var(--success)]" }, { k: "Risk caught", v: "$3.4M", c: "text-[var(--danger)]" }, { k: "Cycle time", v: "−62%", c: "text-[var(--brand-primary-600)]" }].map((t) => (
          <div key={t.k} className="rounded-xl border border-[var(--ink-100)] bg-white p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-400)]">{t.k}</div>
            <div className={`landing-display mt-1.5 text-[24px] ${t.c}`}>{t.v}</div>
          </div>
        ))}
        <div className="col-span-3 rounded-xl border border-[var(--ink-100)] bg-white p-4 space-y-2.5">
          {[["Limitation of Liability", "critical", "bg-[var(--danger)]", "bg-[var(--danger-soft)] text-[var(--danger)]"], ["IP assignment", "high", "bg-[var(--warning)]", "bg-[var(--warning-soft)] text-[var(--warning)]"], ["Payment terms", "medium", "bg-[var(--ink-400)]", "bg-[var(--ink-100)] text-[var(--ink-600)]"], ["Confidentiality", "low", "bg-[var(--success)]", "bg-[var(--success-soft)] text-[var(--success)]"]].map(([t, r, dot, pill]) => (
            <div key={t as string} className="flex items-center gap-2.5">
              <span className={`h-2 w-2 rounded-full ${dot}`} />
              <span className="text-[12px] font-medium flex-1 truncate text-[var(--ink-800)]">{t}</span>
              <span className={`text-[10px] font-semibold capitalize px-1.5 py-0.5 rounded-full ${pill}`}>{r}</span>
            </div>
          ))}
        </div>
      </div>
    </TiltCard>
  );
}

function RiskVisual() {
  return (
    <div className="rounded-2xl border border-[var(--ink-100)] bg-white p-6 shadow-md">
      <div className="flex items-center gap-5">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 36 36" className="h-28 w-28 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--ink-100)" strokeWidth="3.5" />
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--danger)" strokeWidth="3.5" strokeLinecap="round" pathLength={100} strokeDasharray="68 100" />
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="landing-display text-[24px] text-[var(--ink-900)]">68</span>
            <span className="text-[9px] uppercase tracking-wide text-[var(--ink-500)]">risk index</span>
          </span>
        </div>
        <div className="flex-1 space-y-2.5">
          {[["Critical", "bg-[var(--danger)]", "w-[30%]"], ["High", "bg-[var(--warning)]", "w-[55%]"], ["Medium", "bg-[var(--ink-400)]", "w-[40%]"], ["Low", "bg-[var(--success)]", "w-[80%]"]].map(([l, bar, w]) => (
            <div key={l as string} className="flex items-center gap-2.5">
              <span className="text-[11px] text-[var(--ink-500)] w-14">{l}</span>
              <span className="flex-1 h-2 rounded-full bg-[var(--ink-100)] overflow-hidden"><span className={`block h-full rounded-full ${bar} ${w}`} /></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DiffVisual() {
  return (
    <div className="rounded-2xl border border-[var(--ink-100)] bg-white p-6 shadow-md space-y-3">
      <div className="flex items-center gap-2 text-[12px] font-mono text-[var(--ink-500)]"><GitBranch size={13} /> v3 → v4 · 7 changes</div>
      <div className="rounded-lg border-l-[3px] border-l-[var(--warning)] border border-[var(--ink-100)] p-3">
        <div className="text-[11px] font-semibold text-[var(--warning)] uppercase tracking-wide">Modified · Payment terms</div>
        <div className="mt-1.5 grid grid-cols-2 gap-2 text-[12px]">
          <div className="rounded bg-[var(--danger-soft)]/50 px-2 py-1 text-[var(--ink-700)]">Net 30 days</div>
          <div className="rounded bg-[var(--success-soft)]/50 px-2 py-1 text-[var(--ink-700)]">Net 45 days</div>
        </div>
      </div>
      <div className="rounded-lg border-l-[3px] border-l-[var(--danger)] border border-[var(--ink-100)] p-3">
        <div className="text-[11px] font-semibold text-[var(--danger)] uppercase tracking-wide">High impact · Cash flow delayed ~$8,200</div>
      </div>
    </div>
  );
}

function ChatVisual() {
  return (
    <div className="rounded-2xl border border-[var(--ink-100)] bg-white p-5 shadow-md space-y-3">
      <div className="flex justify-end">
        <span className="max-w-[80%] rounded-2xl rounded-tr-sm bg-[var(--ink-900)] text-white px-3.5 py-2 text-[13px]">What&apos;s the liability cap, and is it standard?</span>
      </div>
      <div>
        <div className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--ai-ink)] mb-1"><Sparkles size={11} />Bluely</div>
        <div className="rounded-2xl rounded-tl-sm bg-[var(--ai-surface)] px-3.5 py-3 text-[13px] leading-relaxed text-[var(--ink-800)]">
          Capped at 12 months of fees <span className="font-mono text-[var(--ai-ink)]">[§12.3]</span> — <strong>2× below</strong> your playbook standard, with uncapped data-breach carve-outs.
        </div>
      </div>
    </div>
  );
}

function ShowcaseRow({ label, icon: Icon, title, body, visual, reverse }: {
  label: string; icon: typeof BarChart3; title: string; body: string; visual: React.ReactNode; reverse?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      <Reveal className={reverse ? "lg:order-2" : ""}>
        <span className="landing-label inline-flex items-center gap-2 text-[var(--brand-primary-600)]"><Icon size={15} />{label}</span>
        <h3 className="landing-h1 mt-3 text-[clamp(26px,3.5vw,38px)] text-[var(--ink-900)]">{title}</h3>
        <p className="mt-4 text-[16px] leading-relaxed text-[var(--ink-600)]">{body}</p>
        <Link href="/signup" className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] transition-colors">Explore <ArrowRight size={15} /></Link>
      </Reveal>
      <Reveal delay={0.1} className={reverse ? "lg:order-1" : ""}>{visual}</Reveal>
    </div>
  );
}

/* ───────────────── footer ───────────────── */

function SiteFooter() {
  return (
    <footer className="border-t border-[var(--ink-100)] bg-white">
      <div className="mx-auto max-w-6xl px-5 md:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <Image src="/logo-icon.svg" alt="" width={26} height={26} className="block h-[26px] w-[26px]" />
              <span className="landing-h3 text-[16px] text-[var(--ink-900)]">Blue-IQ</span>
            </div>
            <p className="mt-3 text-[13px] text-[var(--ink-500)] max-w-[210px] leading-relaxed">Contract intelligence that turns risk into recovered revenue.</p>
          </div>
          <FooterCol title="Product" links={["SOW Analyzer", "Bluely Copilot", "Amendments", "Workflow", "Playbook"]} />
          <FooterCol title="Solutions" links={["Legal", "Sales", "Finance", "Procurement"]} />
          <FooterCol title="Company" links={["About", "Careers", "Blog", "Contact"]} />
          <FooterCol title="Legal" links={["Privacy", "Terms", "DPA", "Security"]} />
        </div>
        <div className="mt-12 pt-6 border-t border-[var(--ink-100)] flex flex-col sm:flex-row items-center justify-between gap-3 text-[12.5px] text-[var(--ink-500)]">
          <span>© {new Date().getFullYear()} Blue-IQ. All rights reserved.</span>
          <span className="inline-flex items-center gap-1.5"><TrendingUp size={13} className="text-[var(--success)]" /> Built for teams who read the fine print.</span>
        </div>
      </div>
    </footer>
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
