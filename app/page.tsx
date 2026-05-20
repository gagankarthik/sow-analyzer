"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import {
  ArrowRight, ChevronDown, Menu, X, ShieldCheck, ShieldAlert, TrendingUp,
  DollarSign, GitBranch, Kanban, PieChart, BookMarked, FileText, Sparkles,
  BarChart3, Scale, Lock, CheckCircle2, Clock,
} from "@/components/ui/icons";

const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/* ───────────────── data ───────────────── */

const PRODUCT = [
  { icon: FileText, title: "SOW Analyzer", desc: "Clause-level risk extraction" },
  { icon: Sparkles, title: "Bluely Copilot", desc: "Answers grounded in your clauses" },
  { icon: GitBranch, title: "Amendments", desc: "Diff every version automatically" },
  { icon: Kanban, title: "Workflow", desc: "Draft to signed on one board" },
  { icon: PieChart, title: "Portfolio insights", desc: "Risk across the whole book" },
  { icon: BookMarked, title: "Playbook", desc: "Score deviations from your standards" },
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
  { icon: Clock, accent: "brand", stat: "21 → 8", label: "days median review cycle", body: "Clauses, risk, and summaries land in 90 seconds — so review starts where it used to end." },
  { icon: DollarSign, accent: "success", stat: "$8.2M", label: "revenue protected", body: "Surface auto-renewals, SLA gaps, and payment risk before they quietly erode the P&L." },
];
const ACCENT: Record<string, string> = {
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  brand: "bg-[var(--brand-primary-50)] text-[var(--brand-primary-600)]",
  success: "bg-[var(--success-soft)] text-[var(--success)]",
};
const PROOF = [
  { count: "240", suffix: "+", label: "contracting teams" },
  { count: "60", suffix: "%", label: "shorter cycle times" },
  { count: "8.2", prefix: "$", suffix: "M", decimals: 1, label: "revenue protected" },
  { count: "90", suffix: "s", label: "to first insight" },
];
const MARQUEE = ["Liability", "Indemnity", "Termination", "IP assignment", "Payment terms", "Data protection", "Confidentiality", "SLA credits", "Governing law", "Force majeure", "Auto-renewal", "Warranty"];

/* ───────────────── page ───────────────── */

export default function Landing() {
  const [mobile, setMobile] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement>(null);
  const marquee = useRef<HTMLDivElement>(null);
  const visual = useRef<HTMLDivElement>(null);

  useIso(() => {
    const ctx = gsap.context(() => {
      gsap.registerPlugin(ScrollTrigger, SplitText);

      // Hero line-by-line mask reveal
      const split = new SplitText(".hero-title", { type: "lines", linesClass: "split-line" });
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(split.lines, { yPercent: 115, duration: 0.95, stagger: 0.12 })
        .from(".hero-fade", { y: 22, autoAlpha: 0, duration: 0.7, stagger: 0.12 }, "-=0.55")
        .from(".accent-rule", { scaleX: 0, transformOrigin: "left center", duration: 0.7, ease: "power2.out" }, "-=0.5");

      // Hero parallax
      gsap.to(".hero-orb", { yPercent: 26, ease: "none", scrollTrigger: { trigger: hero.current, start: "top top", end: "bottom top", scrub: true } });
      if (visual.current) {
        gsap.fromTo(visual.current, { y: 40 }, { y: -30, ease: "none", scrollTrigger: { trigger: hero.current, start: "top top", end: "bottom top", scrub: 0.6 } });
      }

      // Scroll reveals
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.from(el, { y: 44, autoAlpha: 0, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 86%" } });
      });
      // Staggered groups
      gsap.utils.toArray<HTMLElement>("[data-reveal-group]").forEach((grp) => {
        gsap.from(grp.children, { y: 40, autoAlpha: 0, duration: 0.7, ease: "power3.out", stagger: 0.1, scrollTrigger: { trigger: grp, start: "top 82%" } });
      });

      // Count-up numbers
      gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
        const end = parseFloat(el.dataset.count || "0");
        const dec = parseInt(el.dataset.decimals || "0", 10);
        const pre = el.dataset.prefix || "";
        const suf = el.dataset.suffix || "";
        const obj = { v: 0 };
        gsap.to(obj, {
          v: end, duration: 1.6, ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 88%" },
          onUpdate: () => { el.textContent = `${pre}${obj.v.toFixed(dec)}${suf}`; },
        });
      });

      // Continuous clause marquee
      if (marquee.current) {
        gsap.to(marquee.current, { xPercent: -50, repeat: -1, duration: 26, ease: "none" });
      }

      // Subtle 3D tilt on hero visual
      const card = visual.current;
      if (card) {
        const onMove = (e: MouseEvent) => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          gsap.to(card, { rotationY: px * 7, rotationX: -py * 7, transformPerspective: 1000, transformOrigin: "center", duration: 0.5, ease: "power2.out" });
        };
        const onLeave = () => gsap.to(card, { rotationX: 0, rotationY: 0, duration: 0.7, ease: "power3.out" });
        card.addEventListener("mousemove", onMove);
        card.addEventListener("mouseleave", onLeave);
        return () => { card.removeEventListener("mousemove", onMove); card.removeEventListener("mouseleave", onLeave); };
      }
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="min-h-screen bg-[var(--paper)] text-[var(--ink-900)] overflow-x-hidden">
      <SiteNav mobile={mobile} setMobile={setMobile} />

      {/* ── Hero ─────────────────────────────────────── */}
      <section ref={hero} className="relative">
        <div className="holo-grid pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <div className="hero-orb pointer-events-none absolute -right-24 top-10 -z-10 h-[460px] w-[460px] rounded-full bg-[var(--brand-primary-100)] opacity-50 blur-[120px]" aria-hidden />
        <div className="hero-orb pointer-events-none absolute -left-24 top-64 -z-10 h-[360px] w-[360px] rounded-full bg-[var(--success-soft)] opacity-60 blur-[120px]" aria-hidden />

        <div className="mx-auto max-w-6xl px-5 md:px-8 pt-20 md:pt-28 pb-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <span className="hero-fade landing-label inline-flex items-center gap-2 text-[var(--ink-500)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" /> Contract intelligence for revenue teams
            </span>
            <h1 className="hero-title landing-display mt-5 text-[clamp(40px,7vw,80px)] text-[var(--ink-900)]">
              See the revenue your contracts are leaking.
            </h1>
            <div className="relative inline-block mt-1">
              <span className="accent-rule block h-[5px] w-40 rounded-full bg-[var(--brand-primary-600)]" />
            </div>
            <p className="hero-fade mt-7 max-w-xl text-[17px] md:text-[19px] leading-relaxed text-[var(--ink-600)]">
              Blue-IQ reads every SOW, MSA, and amendment the moment you upload it — quantifying risk, recovering revenue, and cutting review cycles from weeks to minutes.
            </p>
            <div className="hero-fade mt-9 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Link href="/signup" className="inline-flex items-center gap-2 h-12 px-7 rounded-lg bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-[15px] font-semibold shadow-md transition-colors">
                Start free <ArrowRight size={16} />
              </Link>
              <a href="#outcomes" className="group inline-flex items-center gap-1.5 h-12 px-5 rounded-lg border border-[var(--ink-200)] bg-white text-[15px] font-semibold text-[var(--ink-800)] hover:border-[var(--brand-primary-300)] transition-colors">
                See the ROI <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
            <p className="hero-fade mt-4 text-[12.5px] text-[var(--ink-500)]">No credit card · SOC 2 Type II · live in 90 seconds</p>
          </div>

          <div className="lg:col-span-5 hero-fade">
            <div ref={visual} className="will-change-transform">
              <HeroMock />
            </div>
          </div>
        </div>

        {/* clause marquee */}
        <div className="border-y border-[var(--ink-100)] bg-white/60 overflow-hidden py-4">
          <div ref={marquee} className="flex w-max gap-3 whitespace-nowrap">
            {[...MARQUEE, ...MARQUEE].map((c, i) => (
              <span key={i} className="inline-flex items-center gap-2 rounded-md border border-[var(--ink-100)] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[var(--ink-600)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-primary-400)]" />{c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Outcomes ─────────────────────────────────── */}
      <section id="outcomes" className="mx-auto max-w-6xl px-5 md:px-8 py-24 md:py-32">
        <div data-reveal className="max-w-2xl">
          <span className="landing-label text-[var(--brand-primary-600)]">The bottom line</span>
          <h2 className="landing-h1 mt-3 text-[clamp(30px,4.5vw,48px)] text-[var(--ink-900)]">Risk you can see. Revenue you keep.</h2>
          <p className="mt-4 text-[17px] leading-relaxed text-[var(--ink-600)]">Three numbers every GC, CRO, and CFO cares about — measured on contracts you already have.</p>
        </div>

        <div data-reveal-group className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
          {OUTCOMES.map((o) => (
            <div key={o.label} className="group relative h-full rounded-2xl border border-[var(--ink-100)] bg-white p-7 shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden">
              <span className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${ACCENT[o.accent]}`}><o.icon size={22} strokeWidth={1.75} /></span>
              <div className="landing-display mt-6 text-[clamp(30px,4vw,46px)] text-[var(--ink-900)]">{o.stat}</div>
              <div className="mt-1 text-[13.5px] font-medium text-[var(--ink-500)]">{o.label}</div>
              <p className="mt-4 text-[14px] leading-relaxed text-[var(--ink-600)]">{o.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature showcase ─────────────────────────── */}
      <section id="product" className="bg-white border-y border-[var(--ink-100)]">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-24 md:py-32 space-y-28">
          <ShowcaseRow label="Risk, quantified" icon={BarChart3} title="A risk score on every clause — in seconds." body="Bluely classifies each clause, assesses its commercial risk from the actual wording, and rolls it up into a single portfolio score. No templates, no manual tagging." visual={<RiskVisual />} />
          <ShowcaseRow reverse label="Change, tracked" icon={GitBranch} title="Every amendment, diffed and priced." body="See exactly what changed between versions, who it favors, and the dollar impact — so a quiet redline never costs you six months later." visual={<DiffVisual />} />
          <ShowcaseRow label="Answers, grounded" icon={Sparkles} title="Ask your contracts anything." body="Bluely answers from your clauses and cites the exact section. Find a liability cap, compare to your playbook, or draft a counter — in plain language." visual={<ChatVisual />} />
        </div>
      </section>

      {/* ── Proof band (navy, count-up) ──────────────── */}
      <section className="relative bg-[var(--brand-primary-950)] text-white overflow-hidden">
        <div className="holo-grid pointer-events-none absolute inset-0 opacity-[0.12]" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-5 md:px-8 py-20">
          <div data-reveal-group className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {PROOF.map((p) => (
              <div key={p.label}>
                <div className="landing-display text-[clamp(36px,5vw,60px)] text-white"
                  data-count={p.count} data-prefix={p.prefix ?? ""} data-suffix={p.suffix ?? ""} data-decimals={p.decimals ?? 0}>
                  {p.prefix ?? ""}0{p.suffix ?? ""}
                </div>
                <div className="mt-1 text-[14px] text-white/70">{p.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security ─────────────────────────────────── */}
      <section id="security" className="mx-auto max-w-6xl px-5 md:px-8 py-24 text-center">
        <div data-reveal>
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--success-soft)] text-[var(--success)]"><ShieldCheck size={26} /></span>
          <h2 className="landing-h1 mt-5 text-[clamp(28px,4vw,42px)] text-[var(--ink-900)]">Built for the contracts you can&apos;t afford to leak.</h2>
          <p className="mt-3 mx-auto max-w-xl text-[15px] text-[var(--ink-600)]">Encrypted, tenant-isolated, and never used to train shared models.</p>
        </div>
        <div data-reveal-group className="mt-9 flex flex-wrap items-center justify-center gap-3">
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

      {/* ── CTA ──────────────────────────────────────── */}
      <section className="relative border-t border-[var(--ink-100)] bg-[var(--brand-primary-950)] text-white overflow-hidden">
        <div className="holo-grid pointer-events-none absolute inset-0 opacity-[0.14]" aria-hidden />
        <div data-reveal className="relative mx-auto max-w-4xl px-5 md:px-8 py-28 text-center">
          <h2 className="landing-display text-[clamp(34px,5.5vw,60px)] leading-[1.06]">Bring every contract into focus.</h2>
          <p className="mt-5 mx-auto max-w-xl text-[16px] text-white/70">Turn contracts into decisions — and risk into recovered revenue.</p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup" className="inline-flex items-center gap-2 h-12 px-8 rounded-lg bg-white text-[var(--brand-primary-700)] text-[15px] font-semibold hover:bg-[var(--ink-100)] transition-colors">Start free <ArrowRight size={16} /></Link>
            <Link href="/login" className="inline-flex items-center h-12 px-6 rounded-lg border border-white/25 text-[15px] font-semibold text-white hover:bg-white/10 transition-colors">Sign in</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

/* ───────────────── nav ───────────────── */

function SiteNav({ mobile, setMobile }: { mobile: boolean; setMobile: (v: boolean) => void }) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--ink-100)] bg-[var(--paper)]/85 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-5 md:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/logo-icon.svg" alt="" width={30} height={30} priority className="block h-[30px] w-[30px]" />
          <span className="landing-h3 text-[19px] text-[var(--ink-900)]">Blue-IQ</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          <NavDropdown label="Product">
            <div className="grid grid-cols-2 gap-1 w-[440px]">
              {PRODUCT.map((p) => (
                <Link key={p.title} href="/signup" className="flex items-start gap-3 rounded-lg p-3 hover:bg-[var(--ink-50)] transition-colors">
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
            <div className="w-[260px]">{SOLUTIONS.map((s) => (
              <Link key={s.title} href="/signup" className="block rounded-lg p-3 hover:bg-[var(--ink-50)] transition-colors">
                <span className="block text-[13.5px] font-semibold text-[var(--ink-900)]">{s.title}</span>
                <span className="block text-[12px] text-[var(--ink-500)]">{s.desc}</span>
              </Link>
            ))}</div>
          </NavDropdown>
          <NavDropdown label="Resources">
            <div className="w-[260px]">{RESOURCES.map((s) => (
              <Link key={s.title} href="#" className="block rounded-lg p-3 hover:bg-[var(--ink-50)] transition-colors">
                <span className="block text-[13.5px] font-semibold text-[var(--ink-900)]">{s.title}</span>
                <span className="block text-[12px] text-[var(--ink-500)]">{s.desc}</span>
              </Link>
            ))}</div>
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
        <div className="lg:hidden border-t border-[var(--ink-100)] bg-[var(--paper)] px-5 py-4 space-y-1">
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

function NavDropdown({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group">
      <button className="px-3.5 h-9 inline-flex items-center gap-1 text-[14px] font-medium text-[var(--ink-600)] group-hover:text-[var(--ink-900)] transition-colors">
        {label}<ChevronDown size={14} className="group-hover:rotate-180 transition-transform duration-200" />
      </button>
      <div className="absolute left-0 top-full pt-2 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200">
        <div className="rounded-2xl border border-[var(--ink-100)] bg-white p-2 shadow-xl">{children}</div>
      </div>
    </div>
  );
}

/* ───────────────── visuals ───────────────── */

function HeroMock() {
  return (
    <div className="rounded-2xl border border-[var(--ink-200)] bg-white shadow-2xl overflow-hidden">
      <div className="h-9 border-b border-[var(--ink-100)] bg-[var(--ink-25)] flex items-center gap-1.5 px-4">
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--ink-200)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--ink-200)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--ink-200)]" />
      </div>
      <div className="p-5 space-y-3 bg-[var(--ink-25)]/30">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[var(--ink-100)] bg-white p-3.5">
            <div className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-400)]">Revenue protected</div>
            <div className="landing-display mt-1 text-[22px] text-[var(--success)]">$8.2M</div>
          </div>
          <div className="rounded-xl border border-[var(--ink-100)] bg-white p-3.5">
            <div className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-400)]">Risk caught</div>
            <div className="landing-display mt-1 text-[22px] text-[var(--danger)]">$3.4M</div>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--ink-100)] bg-white p-3.5 space-y-2.5">
          {[["Limitation of Liability", "critical", "bg-[var(--danger)]", "bg-[var(--danger-soft)] text-[var(--danger)]"], ["IP assignment", "high", "bg-[var(--warning)]", "bg-[var(--warning-soft)] text-[var(--warning)]"], ["Payment terms", "medium", "bg-[var(--ink-400)]", "bg-[var(--ink-100)] text-[var(--ink-600)]"], ["Confidentiality", "low", "bg-[var(--success)]", "bg-[var(--success-soft)] text-[var(--success)]"]].map(([t, r, dot, pill]) => (
            <div key={t as string} className="flex items-center gap-2.5">
              <span className={`h-2 w-2 rounded-full ${dot}`} />
              <span className="text-[12px] font-medium flex-1 truncate text-[var(--ink-800)]">{t}</span>
              <span className={`text-[10px] font-semibold capitalize px-1.5 py-0.5 rounded-full ${pill}`}>{r}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
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
      <div data-reveal className={reverse ? "lg:order-2" : ""}>
        <span className="landing-label inline-flex items-center gap-2 text-[var(--brand-primary-600)]"><Icon size={15} />{label}</span>
        <h3 className="landing-h1 mt-3 text-[clamp(26px,3.5vw,40px)] text-[var(--ink-900)]">{title}</h3>
        <p className="mt-4 text-[16px] leading-relaxed text-[var(--ink-600)]">{body}</p>
        <Link href="/signup" className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] transition-colors">Explore <ArrowRight size={15} /></Link>
      </div>
      <div data-reveal className={reverse ? "lg:order-1" : ""}>{visual}</div>
    </div>
  );
}

/* ───────────────── footer ───────────────── */

function SiteFooter() {
  return (
    <footer className="border-t border-[var(--ink-100)] bg-[var(--paper)]">
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
