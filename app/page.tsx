"use client";

import Link from "next/link";
import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { motion, useReducedMotion, useScroll, useTransform, type Variants } from "framer-motion";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  GitBranch,
  FileSignature,
  PieChart,
  Menu,
  X,
  ChevronDown,
  FileText,
  Kanban,
  BookMarked,
  BarChart3,
  Briefcase,
  Users,
  Globe2,
  Mail,
  CheckCircle2,
  Lock,
  Gavel,
  ShoppingCart,
  Laptop,
  TrendingUp,
  Repeat,
} from "@/components/ui/icons";

const META = {
  product: "Blue-IQ",
  tagline: "Contract Intelligence",
  hero: "Bring every contract into focus.",
  sub: "The workspace where Legal, Sales, Finance, and Procurement work the same contract — surfacing risk, accelerating cycles, and preventing revenue leakage before it lands on your P&L.",
};

/* ──────────────────────────────────────────────── */
/*  Framer-motion variants                          */
/* ──────────────────────────────────────────────── */
const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      delay: i * 0.07,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

function MotionFade({
  children,
  delay = 0,
  className,
  style,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) {
    return <div className={className} style={style}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      style={style}
      variants={fadeUpVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10% 0px -5% 0px" }}
      custom={delay}
    >
      {children}
    </motion.div>
  );
}

/* Brand logo — used wherever the wordmark appears */
function Logo({
  height = 28,
  className,
  variant = "light",
}: {
  height?: number;
  className?: string;
  variant?: "light" | "dark";
}) {
  return (
    <span className={`relative inline-flex items-center ${className ?? ""}`}>
      <Image
        src="/logo.svg"
        alt="Blue-IQ"
        width={Math.round(height * 3)}
        height={height}
        priority
        className={`select-none ${variant === "dark" ? "brightness-0 invert" : ""}`}
        style={{ height, width: "auto" }}
      />
    </span>
  );
}

/* ──────────────────────────────────────────────── */
/*  Nav data — content for dropdowns                */
/* ──────────────────────────────────────────────── */
type NavMenuItem = {
  label: string;
  href: string;
  description: string;
  icon: typeof FileText;
};

type NavMenu = {
  label: string;
  href: string;
  items?: NavMenuItem[];
  footer?: { label: string; href: string; description: string };
};

const NAV_MENUS: NavMenu[] = [
  {
    label: "Product",
    href: "/dashboard",
    items: [
      { label: "SOW Analyzer", href: "/library", description: "Clause-level deviation detection", icon: FileText },
      { label: "Amendments", href: "/projects", description: "Track redlines across versions", icon: GitBranch },
      { label: "Workflow", href: "/workflow", description: "Pipeline velocity by stage", icon: Kanban },
      { label: "Insights", href: "/insights", description: "Portfolio risk + revenue at risk", icon: BarChart3 },
      { label: "Playbook", href: "/settings/playbook", description: "Your firm's standard positions", icon: BookMarked },
      { label: "Clause Library", href: "/settings/clauses", description: "Pre-approved language", icon: Briefcase },
    ],
    footer: {
      label: "Open the workspace →",
      href: "/dashboard",
      description: "8-day median cycle. SOC2 Type II.",
    },
  },
  {
    label: "Customers",
    href: "#customers",
    items: [
      { label: "Legal Counsel", href: "#customers", description: "In-house counsel & GC teams", icon: ShieldCheck },
      { label: "Sales Ops", href: "#customers", description: "Quote-to-cash velocity", icon: GitBranch },
      { label: "Finance / CFO", href: "#customers", description: "Portfolio revenue at risk", icon: PieChart },
      { label: "Procurement", href: "#customers", description: "Vendor SLA monitoring", icon: FileSignature },
    ],
    footer: {
      label: "Read customer stories →",
      href: "#customers",
      description: "Obelisk · Northwind · Vector Bio",
    },
  },
  {
    label: "Pricing",
    href: "#pricing",
  },
  {
    label: "Resources",
    href: "#how",
    items: [
      { label: "How it works", href: "#how", description: "The 5-stage intelligence pipeline", icon: FileText },
      { label: "Workflow", href: "/workflow", description: "Pipeline velocity by stage", icon: GitBranch },
      { label: "Security", href: "#security", description: "SOC2 · ISO 27001 · GDPR", icon: Lock },
      { label: "Playbook", href: "/settings/playbook", description: "Your firm's standard positions", icon: Users },
    ],
    footer: {
      label: "Open the workspace →",
      href: "/dashboard",
      description: "Average insight · under 90 seconds",
    },
  },
];

export default function LandingPage() {
  return (
    <div className="landing min-h-screen text-[14px] leading-[1.6] antialiased selection:bg-[var(--brand-primary-600)] selection:text-white">
      <ScrollProgress />
      <FloatingNav />

      <main>
        <Hero />
        <TrustStrip />
        <LeadSection />
        <HowItWorks />
        <VisualCollage />
        <Manifesto />
        <FeatureOne />
        <ControlSection />
        <FeatureTwo />
        <AILiftSection />
        <PersonasSection />
        <ProofSection />
        <Updates />
        <FAQsSection />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}

/* ──────────────────────────────────────────────── */
/*  Lead section — pain point + solution teaser      */
/* ──────────────────────────────────────────────── */
function LeadSection() {
  const stats = [
    { value: "21 → 8 days", label: "median contract cycle" },
    { value: "$3.4M", label: "liability caught per portfolio" },
    { value: "14 / month", label: "anomalies surfaced" },
  ];
  return (
    <section className="py-16 md:py-24 px-5 md:px-10 bg-[var(--brand-primary-50)] border-y border-[var(--brand-primary-100)]">
      <div className="max-w-[1100px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <MotionFade>
              <h2 className="landing-h2 text-[clamp(26px,3vw,40px)] text-foreground leading-[1.12] mb-5">
                Every missed clause is revenue<br className="hidden md:block" /> you didn&apos;t protect.
              </h2>
            </MotionFade>
            <MotionFade delay={1}>
              <p className="text-[15px] leading-[1.65] text-[var(--ink-600)] max-w-[480px]">
                Legal teams review the same boilerplate clauses on a 21-day cycle. Sales closes on time; Finance finds the exposure six months later. Blue-IQ closes that gap — automatically.
              </p>
            </MotionFade>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4">
            {stats.map((s, i) => (
              <MotionFade key={s.label} delay={i + 1}>
                <div className="bg-card border border-[var(--brand-primary-100)] rounded-xl px-5 py-6 shadow-xs">
                  <div className="landing-display text-[clamp(20px,2.5vw,28px)] text-[var(--brand-primary-700)] mb-1">
                    {s.value}
                  </div>
                  <div className="text-[12px] text-[var(--ink-500)] leading-snug">{s.label}</div>
                </div>
              </MotionFade>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────── */
/*  How it works — colorful SVG pipeline diagram     */
/* ──────────────────────────────────────────────── */

const PIPELINE_STEPS = [
  { icon: FileText,    label: "Upload",          desc: "Drop a SOW, MSA, NDA, or amendment — any format.",            from: "#2563EB", to: "#60A5FA" },
  { icon: BookMarked,  label: "Parse & classify", desc: "Bluely reads every clause and labels it by type.",           from: "#4F46E5", to: "#818CF8" },
  { icon: ShieldCheck, label: "Check playbook",   desc: "Deviations from your standard positions surface instantly.", from: "#7C3AED", to: "#A78BFA" },
  { icon: GitBranch,   label: "Trace & diff",     desc: "Lineage, versions, and every change mapped end to end.",     from: "#0891B2", to: "#22D3EE" },
  { icon: BarChart3,   label: "Decide",           desc: "Risk, timeline, and insights — ready in ~90 seconds.",       from: "#059669", to: "#34D399" },
];

const PIPELINE_STATS = [
  { value: "~90s", label: "median time to insight" },
  { value: "8-stage", label: "extraction pipeline" },
  { value: "Clause-level", label: "granularity" },
  { value: "SOC 2", label: "aligned controls" },
];

function HowItWorks() {
  return (
    <section id="how" className="relative isolate overflow-hidden py-20 md:py-28 scroll-mt-20">
      {/* Colorful backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, var(--background) 0%, color-mix(in srgb, var(--brand-primary-50) 70%, var(--background)) 45%, color-mix(in srgb, var(--ai-surface) 50%, var(--background)) 75%, var(--background) 100%)",
        }}
      />
      <div aria-hidden className="absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl opacity-30 -z-10" style={{ background: "radial-gradient(circle, #60A5FA, transparent 70%)" }} />
      <div aria-hidden className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full blur-3xl opacity-30 -z-10" style={{ background: "radial-gradient(circle, #A78BFA, transparent 70%)" }} />

      <div className="w-full max-w-[1200px] mx-auto px-5 md:px-10">
        {/* Heading */}
        <MotionFade className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-primary-200)] bg-[var(--brand-primary-50)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-primary-700)]">
            <span className="ai-pulse" /> How it works
          </span>
          <h2 className="landing-display mt-4 text-[clamp(30px,5vw,46px)] tracking-tight text-foreground">
            From contract to clarity,{" "}
            <span className="bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#06B6D4] bg-clip-text text-transparent">
              automatically
            </span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Every document runs through Bluely&apos;s intelligence pipeline — parsed,
            classified, compared to your playbook, and traced — so your team gets
            answers instead of PDFs.
          </p>
        </MotionFade>

        {/* Pipeline diagram */}
        <div className="relative mt-16">
          {/* Desktop connector — real SVG with gradient + flowing dashes */}
          <svg
            aria-hidden
            className="hidden lg:block absolute left-0 right-0 top-[36px] w-full h-3 overflow-visible"
            viewBox="0 0 1000 12"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="pipe-grad" x1="0" y1="0" x2="1000" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#2563EB" />
                <stop offset="33%" stopColor="#7C3AED" />
                <stop offset="66%" stopColor="#06B6D4" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>
            <line x1="100" y1="6" x2="900" y2="6" stroke="var(--border)" strokeWidth="2" />
            <line x1="100" y1="6" x2="900" y2="6" stroke="url(#pipe-grad)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 10">
              <animate attributeName="stroke-dashoffset" from="32" to="0" dur="1.4s" repeatCount="indefinite" />
            </line>
          </svg>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-4">
            {PIPELINE_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <MotionFade
                  key={step.label}
                  delay={i}
                  className="relative flex flex-col items-center text-center"
                >
                  {/* Node */}
                  <div className="relative">
                    <span
                      className="inline-flex h-[72px] w-[72px] items-center justify-center rounded-2xl text-white shadow-lg ring-4 ring-[var(--background)]"
                      style={{ background: `linear-gradient(135deg, ${step.from}, ${step.to})` }}
                    >
                      <Icon size={26} strokeWidth={1.9} />
                    </span>
                    <span
                      className="absolute -top-1.5 -right-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--background)] border border-border text-[11px] font-bold text-foreground shadow-sm"
                    >
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-[15px] font-semibold tracking-tight text-foreground">
                    {step.label}
                  </h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground max-w-[200px]">
                    {step.desc}
                  </p>
                </MotionFade>
              );
            })}
          </div>
        </div>

        {/* Stat chips */}
        <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-border bg-border">
          {PIPELINE_STATS.map((s) => (
            <div key={s.label} className="bg-card px-5 py-6 text-center">
              <div className="landing-display text-[28px] tracking-tight bg-gradient-to-r from-[#2563EB] to-[#7C3AED] bg-clip-text text-transparent">
                {s.value}
              </div>
              <div className="mt-1 text-[12px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────── */
/*  Scroll progress indicator                       */
/* ──────────────────────────────────────────────── */
function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      setProgress(total > 0 ? Math.min(1, doc.scrollTop / total) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-[70] h-[2px] bg-transparent pointer-events-none"
    >
      <div
        className="h-full bg-[var(--brand-primary-600)]"
        style={{
          width: `${progress * 100}%`,
          transition: "width 60ms linear",
        }}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────── */
/*  Reveal-on-scroll                                */
/* ──────────────────────────────────────────────── */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.reveal = "in";
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

function Reveal({
  children,
  delay,
  as: As = "div",
  className,
  style,
}: {
  children: ReactNode;
  delay?: 1 | 2 | 3 | 4 | 5;
  as?: "div" | "section" | "span" | "h2" | "h3" | "p";
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useReveal<HTMLElement>();
  const props = {
    ref: ref as React.Ref<HTMLElement>,
    "data-reveal": "",
    "data-reveal-stagger": delay,
    className,
    style,
  } as Record<string, unknown>;
  return <As {...(props as object)}>{children}</As>;
}

/* ──────────────────────────────────────────────── */
/*  Animated count-up                               */
/* ──────────────────────────────────────────────── */
function CountUp({
  to,
  prefix = "",
  suffix = "",
  duration = 1400,
  decimals = 0,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
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
/*  Tilt + Spotlight card                           */
/* ──────────────────────────────────────────────── */
function TiltCard({
  children,
  className,
  intensity = 3,
}: {
  children: ReactNode;
  className?: string;
  intensity?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const onMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    el.style.setProperty("--rx", `${(x * intensity).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(-y * intensity).toFixed(2)}deg`);
    el.style.setProperty("--sx", `${((x + 1) / 2) * 100}%`);
    el.style.setProperty("--sy", `${((y + 1) / 2) * 100}%`);
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`tilt spot ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────── */
/*  Deterministic noise (avoids SSR mismatch)       */
/* ──────────────────────────────────────────────── */
function noise(i: number) {
  const x = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
  return x - Math.floor(x);
}

/* ──────────────────────────────────────────────── */
/*  Bluely — AI assistant mark (logo-icon)           */
/* ──────────────────────────────────────────────── */
function Mark({
  size = 24,
  pulse = false,
  className,
}: {
  size?: number;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-label="Bluely"
      className={`relative inline-flex items-center justify-center shrink-0 ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo-icon.svg"
        alt=""
        width={size}
        height={size}
        priority
        className="select-none pointer-events-none"
        style={{ display: "block", width: size, height: size }}
      />
      {pulse && (
        <span className="ai-pulse absolute -top-0.5 -right-0.5 ring-2 ring-white" />
      )}
    </span>
  );
}

/* ──────────────────────────────────────────────── */
/*  Floating nav with dropdowns + mobile sheet      */
/* ──────────────────────────────────────────────── */
function FloatingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { status } = useAuth();
  const authed = status === "authenticated";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile sheet on Esc, lock body scroll
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const handleEnter = (label: string) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setOpenMenu(label);
  };
  const handleLeave = () => {
    closeTimerRef.current = setTimeout(() => setOpenMenu(null), 140);
  };

  return (
    <>
      <header className={[
        "fixed top-0 left-0 right-0 z-50 border-b bg-card/90 backdrop-blur-xl",
        "transition-[box-shadow,border-color] duration-300 ease-out",
        scrolled ? "border-border shadow-sm" : "border-transparent",
      ].join(" ")}>
        <div
          className="relative mx-auto w-full max-w-[1200px] px-5 md:px-8"
          onMouseLeave={handleLeave}
        >
        <motion.div
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-between h-[76px]"
        >
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 group shrink-0" aria-label="Blue-IQ home">
            <Logo height={30} />
          </Link>

          {/* Primary nav (lg+) — kept off tablet so the pill never overflows */}
          <nav
            className="hidden lg:flex items-center gap-0.5 mx-6"
          >
            {NAV_MENUS.map((m) => {
              const hasMenu = !!m.items;
              const isOpen = openMenu === m.label;
              return (
                <div
                  key={m.label}
                  className="relative"
                  onMouseEnter={() => hasMenu && handleEnter(m.label)}
                >
                  <Link
                    href={m.href}
                    className={[
                      "inline-flex items-center gap-1 h-10 px-3.5 rounded-lg text-[14px] font-medium transition-colors",
                      isOpen
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                    ].join(" ")}
                    aria-expanded={hasMenu ? isOpen : undefined}
                    aria-haspopup={hasMenu ? "menu" : undefined}
                  >
                    {m.label}
                    {hasMenu && (
                      <ChevronDown
                        size={12}
                        strokeWidth={2}
                        className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      />
                    )}
                  </Link>
                </div>
              );
            })}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-2 shrink-0">
            {authed ? (
              <Link
                href="/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-[var(--ink-200)] bg-card text-[14px] font-semibold text-[var(--ink-800)] hover:border-[var(--brand-primary-300)] transition-colors whitespace-nowrap"
              >
                Go to dashboard <ArrowUpRight size={14} strokeWidth={2} />
              </Link>
            ) : (
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center h-10 px-4 rounded-lg border border-[var(--ink-200)] bg-card text-[14px] font-semibold text-[var(--ink-800)] hover:border-[var(--brand-primary-300)] transition-colors whitespace-nowrap"
              >
                Login
              </Link>
            )}
            <Link
              href="/signup"
              className="hidden sm:inline-flex items-center gap-1.5 h-10 px-5 text-[14px] font-semibold rounded-lg text-white bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] transition-colors duration-200 whitespace-nowrap shrink-0"
            >
              Book a demo
              <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
              className="lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg text-foreground hover:bg-muted transition-colors ml-1"
            >
              <Menu size={18} strokeWidth={2} />
            </button>
          </div>
        </motion.div>

        {/* Dropdown panel (lg+) — positioned relative to the pill wrapper */}
        <AnimatedDropdown open={openMenu} onMouseEnter={() => openMenu && handleEnter(openMenu)} onMouseLeave={handleLeave} />
        </div>
      </header>

      {/* Mobile sheet */}
      <MobileNavSheet open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}

function AnimatedDropdown({
  open,
  onMouseEnter,
  onMouseLeave,
}: {
  open: string | null;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const menu = NAV_MENUS.find((m) => m.label === open && !!m.items);
  if (!menu) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="pointer-events-auto hidden lg:block absolute left-1/2 -translate-x-1/2 top-[calc(100%+12px)] w-[min(640px,calc(100vw-32px))]"
    >
      <div className="rounded-2xl border border-border bg-card shadow-lg p-5">
        <div className="grid grid-cols-2 gap-1.5">
          {menu.items!.map((it) => {
            const Icon = it.icon;
            return (
              <Link
                key={it.label}
                href={it.href}
                className="group flex items-start gap-3 rounded-xl p-3 hover:bg-muted/70 transition-colors"
              >
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-[var(--brand-primary-600)] group-hover:bg-[var(--brand-primary-50)] transition-colors">
                  <Icon size={16} strokeWidth={1.75} />
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="text-[13px] font-semibold text-foreground inline-flex items-center gap-1">
                    {it.label}
                    <ArrowRight size={11} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[var(--brand-primary-600)]" />
                  </span>
                  <span className="text-[12px] text-muted-foreground leading-snug mt-0.5">{it.description}</span>
                </span>
              </Link>
            );
          })}
        </div>
        {menu.footer && (
          <Link
            href={menu.footer.href}
            className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-muted/50 hover:bg-muted p-3 transition-colors"
          >
            <span className="flex flex-col min-w-0">
              <span className="text-[13px] font-semibold text-foreground">{menu.footer.label}</span>
              <span className="text-[11.5px] text-muted-foreground mt-0.5">{menu.footer.description}</span>
            </span>
            <ArrowUpRight size={14} strokeWidth={2} className="text-[var(--brand-primary-600)] shrink-0" />
          </Link>
        )}
      </div>
    </motion.div>
  );
}

function MobileNavSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { status } = useAuth();
  const authed = status === "authenticated";
  return (
    <>
      <motion.div
        aria-hidden
        initial={false}
        animate={{ opacity: open ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className={`lg:hidden fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-sm ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        onClick={onClose}
      />
      <motion.aside
        initial={false}
        animate={{ x: open ? 0 : "100%" }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="lg:hidden fixed top-0 right-0 bottom-0 z-[61] w-[88%] max-w-sm bg-card border-l border-border shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-border">
          <Logo height={24} />
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-muted transition-colors"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
        <nav className="overflow-y-auto h-[calc(100%-3.5rem)] px-2 py-4">
          {NAV_MENUS.map((m) => (
            <div key={m.label} className="mb-2">
              <div className="px-3 mb-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                {m.label}
              </div>
              {m.items ? (
                <ul className="flex flex-col">
                  {m.items.map((it) => {
                    const Icon = it.icon;
                    return (
                      <li key={it.label}>
                        <Link
                          href={it.href}
                          onClick={onClose}
                          className="flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-muted transition-colors"
                        >
                          <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted text-[var(--brand-primary-600)] shrink-0">
                            <Icon size={14} />
                          </span>
                          <span className="flex flex-col min-w-0">
                            <span className="text-[13px] font-medium text-foreground">{it.label}</span>
                            <span className="text-[11.5px] text-muted-foreground leading-snug truncate">{it.description}</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <Link
                  href={m.href}
                  onClick={onClose}
                  className="block px-3 py-2.5 rounded-md hover:bg-muted text-[14px] font-medium text-foreground transition-colors"
                >
                  {m.label}
                </Link>
              )}
            </div>
          ))}
          <div className="border-t border-border mt-3 pt-3 px-3 space-y-2">
            {authed ? (
              <Link
                href="/dashboard"
                onClick={onClose}
                className="flex items-center justify-between h-12 px-4 rounded-lg border border-border text-[14px] font-semibold hover:bg-muted transition-colors"
              >
                Go to dashboard
                <ArrowUpRight size={14} />
              </Link>
            ) : (
              <Link
                href="/login"
                onClick={onClose}
                className="flex items-center justify-center h-12 px-4 rounded-lg border border-border text-[14px] font-semibold hover:bg-muted transition-colors"
              >
                Login
              </Link>
            )}
            <Link
              href="/signup"
              onClick={onClose}
              className="flex items-center justify-center gap-1 h-12 px-4 rounded-lg text-white bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-[14px] font-semibold transition-colors"
            >
              Book a demo <ArrowRight size={13} strokeWidth={2.5} />
            </Link>
          </div>
        </nav>
      </motion.aside>
    </>
  );
}

/* ──────────────────────────────────────────────── */
/*  HeroTextBg — interactive animated SVG backdrop   */
/* ──────────────────────────────────────────────── */
function HeroTextBg() {
  const spotlightRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const section = el.parentElement;
    if (!section) return;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const sp = spotlightRef.current;
        if (!sp) return;
        const rect = section.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        sp.style.background = `radial-gradient(700px circle at ${x}% ${y}%, rgba(37,99,235,0.10) 0%, rgba(139,92,246,0.06) 38%, transparent 65%)`;
      });
    };
    const onLeave = () => {
      const sp = spotlightRef.current;
      if (sp) sp.style.background = "";
    };
    section.addEventListener("mousemove", onMove);
    section.addEventListener("mouseleave", onLeave);
    return () => {
      section.removeEventListener("mousemove", onMove);
      section.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  const dots = [
    { cx: "8%",  cy: "30%", r: 2.5, color: "#2563EB", delay: "0s" },
    { cx: "88%", cy: "20%", r: 2,   color: "#8B5CF6", delay: "1.2s" },
    { cx: "62%", cy: "75%", r: 2.5, color: "#06B6D4", delay: "2.4s" },
    { cx: "24%", cy: "68%", r: 2,   color: "#2563EB", delay: "0.8s" },
    { cx: "76%", cy: "52%", r: 1.5, color: "#8B5CF6", delay: "1.8s" },
    { cx: "42%", cy: "15%", r: 1.5, color: "#06B6D4", delay: "3.0s" },
  ] as const;

  return (
    <div ref={containerRef} aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Dot grid + lines */}
      <svg className="absolute inset-0 w-full h-full" aria-hidden>
        <defs>
          <pattern id="htb-dot" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1" fill="rgba(99,102,241,0.17)" />
          </pattern>
          <linearGradient id="htb-la" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"   stopColor="#2563EB" stopOpacity="0" />
            <stop offset="40%"  stopColor="#2563EB" stopOpacity="0.32" />
            <stop offset="70%"  stopColor="#8B5CF6" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="htb-lb" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"   stopColor="#06B6D4" stopOpacity="0" />
            <stop offset="50%"  stopColor="#06B6D4" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#htb-dot)" />
        <path
          d="M -80 70% Q 25% 55%, 50% 65% T 100% 55%"
          stroke="url(#htb-la)"
          strokeWidth="1.2"
          fill="none"
          strokeDasharray="5 12"
          style={{ animation: "dash-flow 22s linear infinite" }}
        />
        <path
          d="M -80 25% Q 30% 35%, 55% 22% T 110% 30%"
          stroke="url(#htb-lb)"
          strokeWidth="1"
          fill="none"
          strokeDasharray="3 16"
          style={{ animation: "dash-flow 30s linear infinite reverse" }}
        />
        {dots.map((p, i) => (
          <g key={i}>
            <circle cx={p.cx} cy={p.cy} r={p.r} fill={p.color} opacity="0.7" />
            <circle
              cx={p.cx}
              cy={p.cy}
              r={p.r}
              fill="none"
              stroke={p.color}
              strokeWidth="1.5"
              opacity="0.5"
              style={{
                transformBox: "fill-box",
                transformOrigin: "center",
                animation: `ping-ring 3.5s ease-out ${p.delay} infinite`,
              }}
            />
          </g>
        ))}
      </svg>
      {/* Floating orbs */}
      <div
        className="absolute rounded-full"
        style={{
          width: "55vw", height: "55vw",
          top: "-22%", left: "-14%",
          background: "radial-gradient(circle, rgba(37,99,235,0.13) 0%, transparent 65%)",
          animation: "float-y 18s ease-in-out infinite",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: "45vw", height: "45vw",
          top: "-12%", right: "-10%",
          background: "radial-gradient(circle, rgba(139,92,246,0.11) 0%, transparent 65%)",
          animation: "float-y 14s ease-in-out infinite -5s",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: "34vw", height: "34vw",
          bottom: "8%", left: "28%",
          background: "radial-gradient(circle, rgba(6,182,212,0.09) 0%, transparent 65%)",
          animation: "float-y 24s ease-in-out infinite -10s",
        }}
      />
      {/* Mouse spotlight */}
      <div ref={spotlightRef} className="absolute inset-0" />
    </div>
  );
}

/* ──────────────────────────────────────────────── */
/*  Hero                                             */
/* ──────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="pt-[150px] md:pt-[200px] py-24 md:py-32 px-5 md:px-10 max-w-[1728px] mx-auto flex flex-col items-center text-center relative overflow-hidden">
      <HeroTextBg />

      <h1 className="landing-display text-[clamp(48px,8.2vw,96px)] text-balance max-w-[1100px] mb-8 text-foreground fade-up relative z-10">
        Bring every contract <br className="hidden md:block" />
        into <span className="text-[var(--brand-primary-700)]">focus</span>.
      </h1>

      <p
        className="text-[16px] md:text-[17px] leading-[1.55] text-[var(--ink-600)] max-w-[600px] mb-8 fade-up relative z-10"
        style={{ animationDelay: "0.08s" }}
      >
        Your contracts are scattered across inboxes, drives, and legacy tools. Blue-IQ brings them into one workspace — automatically parsed, compared to your playbook, and ready for a decision in 90 seconds.
      </p>

      <div
        className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mb-10 fade-up relative z-10"
        style={{ animationDelay: "0.13s" }}
      >
        {[
          { label: "60% shorter cycles" },
          { label: "$8.2M in risk surfaced" },
          { label: "240+ contracting teams" },
        ].map((b) => (
          <span key={b.label} className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--ink-700)]">
            <CheckCircle2 size={14} className="text-[var(--brand-primary-600)]" strokeWidth={2} />
            {b.label}
          </span>
        ))}
      </div>

      <div
        className="flex flex-col sm:flex-row gap-3 fade-up relative z-10"
        style={{ animationDelay: "0.16s" }}
      >
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white rounded-md h-11 px-6 text-[13px] font-semibold tracking-normal transition-colors duration-200"
        >
          Open the workspace
          <ArrowRight
            size={14}
            strokeWidth={2.25}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
        <Link
          href="/signup"
          className="inline-flex items-center justify-center gap-2 bg-card/80 backdrop-blur border border-border hover:bg-muted text-foreground rounded-md h-11 px-6 text-[13px] font-semibold transition-colors duration-200"
        >
          <span className="inline-block w-2 h-2 rounded-full bg-[var(--success)]" />
          Start free — no card
        </Link>
      </div>

      <p className="mt-4 text-[11px] text-muted-foreground fade-up relative z-10" style={{ animationDelay: "0.22s" }}>
        No credit card required · SOC 2 Type II · 90-second setup
      </p>
    </section>
  );
}


/* ──────────────────────────────────────────────── */
/*  Trust strip                                      */
/* ──────────────────────────────────────────────── */
function TrustStrip() {
  const brands = [
    "Northwind Logistics", "Obelisk Capital", "Vector Bio", "Almac Pharma",
    "Cresso Cloud", "Holmgate Defense", "Finline Mutual", "Wickline Foods",
  ];
  return (
    <section className="py-16 px-5 md:px-10 border-t border-border max-w-[1728px] mx-auto flex flex-col items-center">
      <MotionFade className="eyebrow mb-8 text-center">
        Trusted by contracting teams at
      </MotionFade>
      <div className="relative overflow-hidden w-full mask-fade">
        <div className="marquee-track gap-[100px] items-center">
          {[...brands, ...brands].map((b, i) => (
            <span
              key={i}
              className="landing-h3 text-[22px] tracking-tight font-semibold whitespace-nowrap text-[var(--ink-600)] hover:text-foreground transition-colors"
            >
              {b}
            </span>
          ))}
        </div>
        <style jsx>{`
          .mask-fade {
            mask-image: linear-gradient(90deg, transparent, black 12%, black 88%, transparent);
            -webkit-mask-image: linear-gradient(90deg, transparent, black 12%, black 88%, transparent);
          }
        `}</style>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────── */
/*  Visual collage                                   */
/* ──────────────────────────────────────────────── */
function VisualCollage() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const y1 = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  const y2 = useTransform(scrollYProgress, [0, 1], ["5%", "-10%"]);
  const y3 = useTransform(scrollYProgress, [0, 1], ["-12%", "6%"]);
  const y4 = useTransform(scrollYProgress, [0, 1], ["8%", "-8%"]);
  const y5 = useTransform(scrollYProgress, [0, 1], ["-5%", "12%"]);
  const y6 = useTransform(scrollYProgress, [0, 1], ["10%", "-6%"]);

  return (
    <section ref={sectionRef} className="lg:min-h-[1400px] w-full max-w-[1728px] mx-auto relative overflow-hidden py-12 lg:py-20 px-5 md:px-10">
      {/* Central anchor */}
      <div className="relative lg:absolute lg:inset-0 flex justify-center items-center pointer-events-none lg:mt-12">
        <h2 className="landing-display text-[clamp(56px,12vw,160px)] text-foreground text-center">
          Contract<br />
          <span className="text-[var(--brand-primary-700)]">Intelligence</span>
        </h2>
      </div>

      {/* Mobile / tablet fallback — the desktop collage is hidden below lg */}
      <div className="lg:hidden mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--ai-ink)]">SOW ANALYZER</span>
            <span className="font-mono text-[10px] text-muted-foreground">§4.2</span>
          </div>
          <div className="mt-3 text-[13px] font-semibold text-foreground">Service Level Agreement</div>
          <p className="mt-2 font-serif text-[12.5px] leading-[1.55] text-muted-foreground line-clamp-3">
            Provider warrants that the Services shall meet an uptime availability of{" "}
            <span className="bg-[var(--ai-surface)] rounded px-1">99.5%</span> measured monthly…
          </p>
          <div className="mt-4 flex items-center justify-between pt-3 border-t border-border">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--warning)]">HIGH RISK</span>
            <span className="text-[10px] font-mono text-muted-foreground">deviation · −0.4pp</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="eyebrow text-[9px]">CYCLE TIME</span>
            <span className="text-[10px] font-mono text-[var(--success)]">▼ −13d YoY</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[44px] font-bold tracking-tight text-foreground leading-none">8</span>
            <span className="text-[14px] text-muted-foreground">days · median</span>
          </div>
          <p className="mt-3 text-[12px] text-muted-foreground leading-snug">
            Median deal cycle, down from 21 days before Bluely.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm sm:col-span-2">
          <div className="flex items-center gap-3">
            <Mark size={36} pulse />
            <div>
              <div className="text-[12px] font-semibold text-foreground">Bluely · Lens</div>
              <div className="text-[11px] text-muted-foreground">12 contracts · 14 anomalies surfaced</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border text-[12px] text-foreground/85 leading-snug">
            Surface revenue at risk for <span className="font-semibold">$8.24M</span> across the portfolio.
          </div>
        </div>
      </div>

      {/* 1. Clause card (top-left) */}
      <motion.div
        style={{ left: "8%", top: "10%", width: 360, height: 240, zIndex: 5, y: y1 }}
        className="hidden lg:block absolute bg-card border border-border rounded-xl overflow-hidden shadow-sm"
      >
        <div className="p-5 h-full flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--ai-ink)]">SOW ANALYZER</span>
            <span className="font-mono text-[10px] text-muted-foreground">§4.2</span>
          </div>
          <div className="mt-3 text-[13px] font-semibold text-foreground">Service Level Agreement</div>
          <p className="mt-2 font-serif text-[12.5px] leading-[1.55] text-muted-foreground line-clamp-3">
            Provider warrants that the Services shall meet an uptime availability of{" "}
            <span className="bg-[var(--ai-surface)] rounded px-1">99.5%</span> measured monthly…
          </p>
          <div className="mt-auto flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-1">
              {[1, 2, 3].map((i) => (
                <span key={i} className={`h-1.5 w-1.5 rounded-full ${i <= 3 ? "bg-[var(--warning)]" : "bg-muted"}`} />
              ))}
              <span className="ml-1 text-[9px] font-semibold uppercase tracking-wider text-[var(--warning)]">HIGH RISK</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">deviation · −0.4pp</span>
          </div>
        </div>
      </motion.div>

      {/* 2. Portfolio donut card (top-right) */}
      <motion.div
        style={{ right: "10%", top: "12%", width: 300, height: 320, zIndex: 5, y: y2 }}
        className="hidden lg:block absolute bg-card border border-border rounded-xl overflow-hidden shadow-sm p-5"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="eyebrow text-[9px]">PORTFOLIO MIX</span>
          <PieChart size={11} className="text-muted-foreground" />
        </div>
        <div className="mt-3 flex items-center justify-center">
          <DonutMock />
        </div>
        <div className="mt-4 space-y-2">
          {[
            { label: "Life Sciences", pct: 26, color: "var(--brand-primary-600)" },
            { label: "Financial",     pct: 19, color: "var(--brand-primary-400)" },
            { label: "Defense",       pct: 14, color: "var(--ink-700)" },
            { label: "Other",         pct: 41, color: "var(--ink-300)" },
          ].map((s) => (
            <div key={s.label} className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-foreground/75">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="font-mono text-[10px] text-foreground/80">{s.pct}%</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* 3. Lens toggle card (mid-left) */}
      <motion.div
        style={{ left: "4%", top: "44%", width: 280, zIndex: 15, y: y3 }}
        className="hidden lg:block absolute bg-card border border-border rounded-xl overflow-hidden shadow-sm p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-[12.5px] font-semibold text-foreground">Bluely · Lens</span>
          <div className="w-10 h-6 bg-[var(--brand-primary-600)] rounded-full relative">
            <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-xs" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Mark size={40} pulse />
          <div>
            <div className="text-[11px] font-semibold text-foreground">Bluely v2.4</div>
            <div className="text-[11px] text-muted-foreground">12 contracts · 14 anomalies</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border">
          <div className="eyebrow text-[9px]">SUGGESTED</div>
          <div className="mt-1.5 text-[11.5px] text-foreground/85 leading-snug">
            Surface revenue at risk for <span className="font-semibold">$8.24M</span> across portfolio.
          </div>
        </div>
      </motion.div>

      {/* 4. Risk heatmap (mid-right) */}
      <motion.div
        style={{ right: "6%", top: "50%", width: 340, height: 200, zIndex: 5, y: y4 }}
        className="hidden lg:block absolute bg-card border border-border rounded-xl overflow-hidden shadow-sm p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="eyebrow text-[9px]">RISK HEATMAP</span>
          <span className="text-[10px] font-mono text-[var(--ai-ink)] flex items-center gap-1">
            <span className="ai-pulse" /> live
          </span>
        </div>
        <div className="grid grid-cols-12 gap-[3px]">
          {Array.from({ length: 84 }).map((_, i) => {
            const r = noise(i + 1);
            const cls =
              r < 0.5 ? "bg-muted"
              : r < 0.7 ? "bg-amber-300/60"
              : r < 0.85 ? "bg-orange-500/70"
              : "bg-red-500/80";
            return <span key={i} className={`h-3 rounded-[2px] ${cls}`} />;
          })}
        </div>
        <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <span>low</span>
          <div className="flex gap-0.5">
            <span className="h-1.5 w-2.5 rounded-sm bg-muted" />
            <span className="h-1.5 w-2.5 rounded-sm bg-amber-300" />
            <span className="h-1.5 w-2.5 rounded-sm bg-orange-500" />
            <span className="h-1.5 w-2.5 rounded-sm bg-red-500" />
          </div>
          <span>critical</span>
        </div>
      </motion.div>

      {/* 5. Copilot conversation (bottom-left) */}
      <motion.div
        style={{ left: "14%", top: "72%", width: 380, height: 260, zIndex: 5, y: y5 }}
        className="hidden lg:block absolute bg-card border border-border rounded-xl overflow-hidden shadow-sm p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Mark size={22} />
          <span className="text-[12px] font-semibold text-foreground">Bluely · §7.2 review</span>
        </div>
        <div className="bg-[var(--brand-primary-600)] text-white text-[11.5px] leading-relaxed rounded-md px-3 py-2 max-w-[80%] ml-auto">
          Draft a counter for the 3× cap.
        </div>
        <div className="mt-2 bg-muted border border-border text-[11.5px] leading-relaxed rounded-md px-3 py-2 text-foreground/85">
          Restoring 1× annual fees with mutual carve-outs for gross negligence.{" "}
          <span className="text-[var(--ai-text)] font-semibold">Apply →</span>
        </div>
      </motion.div>

      {/* 6. Velocity card (bottom-right) */}
      <motion.div
        style={{ right: "16%", top: "76%", width: 320, height: 200, zIndex: 5, y: y6 }}
        className="hidden lg:block absolute bg-card border border-border rounded-xl overflow-hidden shadow-sm p-5"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="eyebrow text-[9px]">CYCLE TIME</span>
          <span className="text-[10px] font-mono text-[var(--success)]">▼ −13d YoY</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[44px] font-bold tracking-tight text-foreground leading-none">
            <CountUp to={8} />
          </span>
          <span className="text-[14px] text-muted-foreground">days · median</span>
        </div>
        <svg viewBox="0 0 200 50" className="mt-2 w-full">
          <defs>
            <linearGradient id="lp-grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 32 L20 30 L40 27 L60 24 L80 22 L100 18 L120 16 L140 13 L160 11 L180 9 L200 8 L200 50 L0 50 Z" fill="url(#lp-grad)" />
          <path d="M0 32 L20 30 L40 27 L60 24 L80 22 L100 18 L120 16 L140 13 L160 11 L180 9 L200 8" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </motion.div>

      {/* 7. Floating user comment */}
      <div
        className="hidden lg:flex absolute bg-card border border-border rounded-md items-center gap-3 p-2.5 pr-4 shadow-sm z-20"
        style={{ left: "45%", top: "92%" }}
      >
        <div className="w-9 h-9 rounded-full bg-[var(--brand-primary-600)] flex items-center justify-center text-white font-semibold text-[11px]">
          IR
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold text-foreground">Imani Reeves</span>
          <span className="text-[12.5px] text-foreground/85">Approved A-01 → routing to ops.</span>
        </div>
      </div>
    </section>
  );
}

function DonutMock() {
  const segs = [
    { from: 0,    to: 0.26, color: "#2563EB" },
    { from: 0.26, to: 0.45, color: "#60A5FA" },
    { from: 0.45, to: 0.59, color: "#344054" },
    { from: 0.59, to: 1,    color: "#D0D5DD" },
  ];
  const size = 150;
  const r = 60;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(16,24,40,0.05)" strokeWidth="14" />
      {segs.map((s, i) => {
        const len = (s.to - s.from) * c;
        const offset = -s.from * c;
        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="14"
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
      })}
      <text x={size / 2} y={size / 2 - 2} textAnchor="middle" className="text-[18px] font-bold" fill="#101828">$67M</text>
      <text x={size / 2} y={size / 2 + 14} textAnchor="middle" className="text-[9px] uppercase tracking-wider" fill="#667085">portfolio</text>
    </svg>
  );
}

/* ──────────────────────────────────────────────── */
/*  Manifesto                                        */
/* ──────────────────────────────────────────────── */
function Manifesto() {
  return (
    <section className="relative isolate py-24 md:py-36 px-5 md:px-10 overflow-hidden">
      {/* Dark navy background */}
      <div aria-hidden className="absolute inset-0 -z-10" style={{
        background: "linear-gradient(135deg, #050c1a 0%, #0d1a35 40%, #091528 70%, #050c1a 100%)"
      }} />
      {/* Subtle grid */}
      <div aria-hidden className="absolute inset-0 -z-10 opacity-[0.04]" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)",
        backgroundSize: "56px 56px"
      }} />
      {/* Blue glow top-left */}
      <div aria-hidden className="absolute -top-32 -left-32 w-[600px] h-[500px] rounded-full -z-10 pointer-events-none" style={{
        background: "radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 65%)",
        filter: "blur(70px)"
      }} />
      {/* Purple glow bottom-right */}
      <div aria-hidden className="absolute -bottom-24 -right-24 w-[500px] h-[400px] rounded-full -z-10 pointer-events-none" style={{
        background: "radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 65%)",
        filter: "blur(60px)"
      }} />

      <div className="max-w-[1280px] mx-auto flex flex-col items-center text-center">
        <MotionFade className="text-[10.5px] font-semibold uppercase tracking-wider mb-8 text-white/55">
          The thesis
        </MotionFade>
        <MotionFade delay={1} className="landing-h1 text-[clamp(36px,4.4vw,56px)] text-balance max-w-[920px] text-white">
          As contract volume explodes across the enterprise, the cost of every{" "}
          <span style={{ color: "#60A5FA" }}>missed clause</span> grows with it.
          Blue-IQ turns <span className="font-semibold">21-day cycles</span> into{" "}
          <span className="font-semibold">8</span> — and surfaces the revenue you were leaving on the table.
        </MotionFade>

        <motion.div
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-12 w-full max-w-[900px]"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-5%" }}
        >
          {[
            { stat: <><span style={{ color: "rgba(255,255,255,0.35)" }}>−</span><CountUp to={60} suffix="%" /></>, label: "Cycle time" },
            { stat: <CountUp to={8.2} decimals={1} prefix="$" suffix="M" />, label: "Revenue at risk surfaced" },
            { stat: <CountUp to={14} />, label: "Anomalies / month" },
            { stat: <CountUp to={100} suffix="%" />, label: "Audit-ready trail" },
          ].map((s, i) => (
            <motion.div
              key={i}
              variants={fadeUpVariants}
              custom={i}
              className="flex flex-col items-center"
            >
              <span className="landing-display text-[40px] tracking-tight" style={{ color: "#fff" }}>{s.stat}</span>
              <span className="text-[12px] mt-2 text-center" style={{ color: "rgba(255,255,255,0.6)" }}>{s.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────── */
/*  Feature 1                                        */
/* ──────────────────────────────────────────────── */
function FeatureOne() {
  return (
    <section className="py-16 md:py-24 px-5 md:px-10 max-w-[1480px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        {/* Left: SOW analyzer mockup card */}
        <motion.div
          initial={{ opacity: 0, x: -32 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: 1.015 }}
          className="bg-muted rounded-xl p-8 h-[640px] flex items-center justify-center relative overflow-hidden border border-border shadow-xs"
        >
          <div className="w-full max-w-md bg-card rounded-xl shadow-sm border border-border p-6">
            <div className="flex items-center justify-between mb-5">
              <span className="eyebrow text-[10px]">CLAUSES · NORTHWIND</span>
              <span className="text-[10px] font-mono text-muted-foreground">10</span>
            </div>
            <div className="space-y-2">
              {[
                { num: "§1.1", title: "Definitions", risk: "low" },
                { num: "§3.4", title: "Payment Terms", risk: "med" },
                { num: "§4.2", title: "Service Level Agreement", risk: "high" },
                { num: "§5.1", title: "Background IP", risk: "low" },
                { num: "§7.2", title: "Limitation of Liability", risk: "critical" },
                { num: "§10.3", title: "Termination for Convenience", risk: "high" },
              ].map((c) => (
                <div
                  key={c.num}
                  className="flex items-center gap-3 p-2.5 hover:bg-muted rounded-md transition-colors group/clause"
                >
                  <span className="font-mono text-[10px] text-muted-foreground w-12 shrink-0">{c.num}</span>
                  <span className="text-[13px] text-foreground flex-1 truncate">{c.title}</span>
                  <span
                    className={`h-1.5 w-1.5 rounded-full shrink-0 transition-transform group-hover/clause:scale-150 ${
                      c.risk === "low" ? "bg-[var(--risk-1)]" :
                      c.risk === "med" ? "bg-[var(--risk-2)]" :
                      c.risk === "high" ? "bg-[var(--risk-3)]" :
                      "bg-[var(--risk-4)]"
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right: copy */}
        <div className="flex flex-col justify-center h-full max-w-lg">
          <Reveal as="span" className="eyebrow mb-4">01 — Source of truth</Reveal>
          <Reveal as="h3" className="landing-h2 text-[clamp(32px,3.4vw,44px)] mb-10 text-foreground" delay={1}>
            Every clause,
            <br /> in one searchable workspace.
          </Reveal>
          <div className="relative pl-8 border-l-[3px] border-border space-y-10">
            <div className="absolute left-[-3px] top-0 w-[3px] h-1/3 bg-[var(--brand-primary-600)]" />
            <Reveal delay={2}>
              <FeatureRow
                eyebrow="Active"
                title="Playbook deviation detection"
                body="Bluely compares every clause to your firm's playbook automatically and scores deviation severity at the moment of upload."
              />
            </Reveal>
            <Reveal delay={3}>
              <FeatureRow
                dim
                title="OCR for scanned contracts"
                body="PDF, DOCX, and image-only documents are parsed and indexed down to the individual clause."
              />
            </Reveal>
            <Reveal delay={4}>
              <FeatureRow
                dim
                title="Audit-ready provenance"
                body="Full version history, approval chains, and a who-changed-what log per clause — built for SOC2, GDPR, HIPAA."
              />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureRow({
  eyebrow,
  title,
  body,
  dim,
}: {
  eyebrow?: string;
  title: string;
  body: string;
  dim?: boolean;
}) {
  return (
    <div className={dim ? "opacity-55 hover:opacity-100 transition-opacity" : ""}>
      {eyebrow && (
        <span className="text-[9.5px] font-semibold uppercase tracking-wider text-[var(--brand-primary-700)] mb-2 inline-block">{eyebrow}</span>
      )}
      <h4 className="landing-h3 text-[20px] font-semibold mb-2 text-foreground">{title}</h4>
      <p className="text-[14px] text-muted-foreground leading-[1.6]">{body}</p>
    </div>
  );
}

/* ──────────────────────────────────────────────── */
/*  Feature 2                                        */
/* ──────────────────────────────────────────────── */
function FeatureTwo() {
  return (
    <section className="py-16 md:py-24 px-5 md:px-10 max-w-[1480px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <div className="flex flex-col justify-center h-full max-w-lg order-2 lg:order-1">
          <Reveal as="span" className="eyebrow mb-4">02 — Copilot</Reveal>
          <Reveal as="h3" className="landing-h2 text-[clamp(32px,3.4vw,44px)] mb-10 text-foreground" delay={1}>
            Draft counter-language
            <br /> in <span className="text-[var(--brand-primary-700)]">seconds</span>.
          </Reveal>
          <div className="relative pl-8 border-l-[3px] border-border space-y-10">
            <div className="absolute left-[-3px] top-0 w-[3px] h-1/3 bg-[var(--brand-primary-600)]" />
            <Reveal delay={2}>
              <FeatureRow
                eyebrow="Cited"
                title="Every claim links to a source clause"
                body="Bluely never asserts without citing. Hover any suggestion to see the exact §, playbook rule, or peer contract it derived from."
              />
            </Reveal>
            <Reveal delay={3}>
              <FeatureRow
                dim
                title="Confidence indicators, not raw percentages"
                body="●●●○ — a visual scale that tells you when to trust the model and when to keep a human in the loop."
              />
            </Reveal>
            <Reveal delay={4}>
              <FeatureRow
                dim
                title="Streaming generation, no spinners"
                body="Summaries render as the model writes them. No loading bars. No black-box delays. Stop generation mid-stream when you've got what you need."
              />
            </Reveal>
          </div>
        </div>

        {/* Right: Copilot mockup */}
        <motion.div
          initial={{ opacity: 0, x: 32 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: 1.015 }}
          className="bg-muted rounded-xl p-8 h-[640px] flex items-center justify-center relative overflow-hidden border border-border shadow-xs order-1 lg:order-2"
        >
          <div className="relative w-full max-w-lg bg-card rounded-xl shadow-sm p-7 border border-border">
            <div className="flex items-center gap-3 mb-5">
              <Mark size={28} />
              <div>
                <div className="text-[12.5px] font-semibold text-foreground">Bluely · Copilot</div>
                <div className="text-[10.5px] font-mono text-muted-foreground">context · §7.2 Northwind MSA</div>
              </div>
              <span className="ai-pulse ml-auto" />
            </div>

            <div className="bg-[var(--brand-primary-600)] text-white rounded-md px-3 py-2 text-[13px] max-w-[88%] ml-auto mb-3">
              Walk me through the risk in §7.2 and draft a counter.
            </div>

            <div className="bg-[var(--ai-surface)] border border-[var(--ai-border)] rounded-md px-3 py-2.5 text-[13px] leading-relaxed text-foreground">
              §7.2 sits <span className="font-semibold">2× above</span> the firm playbook cap. On Northwind&apos;s $4.28M envelope this exposes <span className="font-semibold">$3.36M</span> versus the standard 1× cap. The carve-outs (confidentiality, IP indemnity) are unlimited — typical, but worth reviewing alongside §9.1.
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2">
              <button className="flex items-center gap-2 text-left rounded-md border border-[var(--ai-border)] bg-[var(--ai-surface)] px-3 py-2 hover:border-[var(--ai-ink)] transition-colors duration-200">
                <span className="font-mono text-[var(--ai-text)] font-bold text-[12px]">›</span>
                <span className="text-[13px] font-medium text-foreground">Insert counter-language</span>
                <span className="text-[10.5px] font-mono text-muted-foreground ml-auto">restore 1× cap</span>
              </button>
              <button className="flex items-center gap-2 text-left rounded-md border border-[var(--ai-border)] bg-[var(--ai-surface)] px-3 py-2 hover:border-[var(--ai-ink)] transition-colors duration-200">
                <GitBranch size={13} className="text-[var(--ai-ink)]" />
                <span className="text-[13px] font-medium text-foreground">Compare to playbook §G.1</span>
                <ArrowRight size={11} className="text-[var(--ai-ink)] ml-auto" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────── */
/*  Control all contracts in one place              */
/* ──────────────────────────────────────────────── */
function ControlSection() {
  const bullets = [
    {
      title: "Get answers instantly",
      body: "Ask Bluely anything across the portfolio — clause language, deviations, renewal exposure — and get cited answers in seconds.",
    },
    {
      title: "Unlock actionable insights",
      body: "Patterns that humans miss: which clients consistently push limit-of-liability, where margin leaks, which paper closes faster.",
    },
    {
      title: "Centralize data for visibility",
      body: "One canonical home for every SOW, MSA, amendment, and side letter — searchable down to the clause.",
    },
  ];
  return (
    <section className="py-20 md:py-28 px-5 md:px-10 max-w-[1480px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
        <div className="lg:col-span-5 flex flex-col gap-5 lg:sticky lg:top-[110px]">
          <Reveal as="span" className="eyebrow text-muted-foreground">One platform</Reveal>
          <Reveal as="h2" className="landing-h2 text-[clamp(28px,3.2vw,44px)] text-foreground leading-[1.1]" delay={1}>
            Control all contracts <br />
            in one place.
          </Reveal>
          <Reveal as="p" className="text-[15px] text-muted-foreground leading-[1.6] max-w-prose" delay={2}>
            Gain a better view of contract data and insights across all
            departments in a single platform.
          </Reveal>
          <Reveal delay={3} className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--brand-primary-700)] hover:text-[var(--brand-primary-800)] group"
            >
              Tour the workspace
              <ArrowRight
                size={13}
                strokeWidth={2.5}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </Reveal>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-3">
          {bullets.map((b, i) => (
            <Reveal key={b.title} delay={((i + 1) as 1 | 2 | 3)}>
              <article className="group relative rounded-xl border border-border bg-card p-6 md:p-7 hover:border-[var(--brand-primary-300)] hover:shadow-sm transition-all flex items-start gap-5">
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)] shrink-0 ring-1 ring-[var(--brand-primary-100)] group-hover:scale-105 transition-transform"
                  aria-hidden
                >
                  <span
                    className="font-display font-bold text-[15px] tabular-nums"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    0{i + 1}
                  </span>
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[16px] font-semibold text-foreground tracking-tight">
                    {b.title}
                  </h3>
                  <p className="mt-1.5 text-[13.5px] text-muted-foreground leading-[1.55]">
                    {b.body}
                  </p>
                </div>
                <ArrowRight
                  size={14}
                  strokeWidth={2}
                  className="text-[var(--brand-primary-600)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all mt-1 shrink-0"
                />
              </article>
            </Reveal>
          ))}

          {/* Closing body */}
          <Reveal
            delay={4}
            className="mt-4 rounded-xl bg-muted/50 border border-border p-5 md:p-6 text-[13.5px] text-foreground/70 leading-[1.6] max-w-prose"
          >
            Bring contract information together into a single platform to
            break down silos and empower teams to be proactive.
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────── */
/*  AI handles the heavy lifting                    */
/* ──────────────────────────────────────────────── */
function AILiftSection() {
  const bullets = [
    {
      title: "Draft and review smarter",
      body: "Bluely drafts counter-language grounded in your playbook, redlines counterparty edits, and explains every change in plain English.",
    },
    {
      title: "Analyze risks and performance",
      body: "Multi-agent analysis surfaces exposure across liability caps, indemnity carve-outs, SLA shortfalls — before you sign, not after.",
    },
    {
      title: "Boost productivity with AI assistance",
      body: "Routine clause review, status check-ins, and reporting handled automatically — your team focuses on the judgment calls.",
    },
  ];
  return (
    <section className="relative isolate py-20 md:py-32 px-5 md:px-10 overflow-hidden">
      {/* Deep violet-navy gradient */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background: "linear-gradient(160deg, #08071a 0%, #120d2e 35%, #0d1530 65%, #08071a 100%)",
        }}
      />
      {/* Violet glow center */}
      <div aria-hidden className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] -z-10 pointer-events-none" style={{
        background: "radial-gradient(ellipse, rgba(124,58,237,0.16) 0%, transparent 65%)",
        filter: "blur(80px)"
      }} />
      {/* Dot grid */}
      <div aria-hidden className="absolute inset-0 -z-10 opacity-[0.04]" style={{
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
        backgroundSize: "32px 32px"
      }} />

      <div className="max-w-[1480px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
        <div className="lg:col-span-7 order-2 lg:order-1 flex flex-col gap-3">
          {bullets.map((b, i) => (
            <Reveal key={b.title} delay={((i + 2) as 2 | 3 | 4)}>
              <article className="group relative rounded-xl border border-border bg-card p-6 md:p-7 hover:border-[var(--ai-border)] hover:shadow-sm transition-all flex items-start gap-5">
                <span className="inline-flex h-10 w-10 items-center justify-center shrink-0">
                  <Image
                    src="/logo-icon.svg"
                    alt=""
                    width={32}
                    height={32}
                    className="select-none pointer-events-none"
                    style={{ display: "block", width: 32, height: 32 }}
                  />
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[16px] font-semibold text-foreground tracking-tight">
                    {b.title}
                  </h3>
                  <p className="mt-1.5 text-[13.5px] text-muted-foreground leading-[1.55]">
                    {b.body}
                  </p>
                </div>
                <ArrowRight
                  size={14}
                  strokeWidth={2}
                  className="text-[var(--ai-ink)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all mt-1 shrink-0"
                />
              </article>
            </Reveal>
          ))}

          <Reveal
            delay={5}
            className="mt-4 rounded-xl bg-card border border-[var(--ai-border)] p-5 md:p-6 text-[13.5px] text-foreground leading-[1.6] max-w-prose flex items-start gap-3"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center shrink-0">
              <Image
                src="/logo-icon.svg"
                alt=""
                width={28}
                height={28}
                className="select-none pointer-events-none"
                style={{ display: "block", width: 28, height: 28 }}
              />
            </span>
            <span>
              Reduce administrative work and accelerate contracting cycles with
              <span className="font-semibold text-[var(--ai-ink)]"> Bluely </span>
              embedded into every step.
            </span>
          </Reveal>
        </div>

        <div className="lg:col-span-5 order-1 lg:order-2 flex flex-col gap-5 lg:sticky lg:top-[110px]">
          <MotionFade className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: "rgba(167,139,250,0.85)" }}>
            <span className="inline-flex items-center gap-2">
              <Image
                src="/logo-icon.svg"
                alt=""
                width={14}
                height={14}
                className="select-none"
                style={{ display: "inline-block", width: 14, height: 14 }}
              />
              Bluely · Multi-agent AI
            </span>
          </MotionFade>
          <MotionFade
            delay={1}
            className="landing-h2 text-[clamp(28px,3.2vw,44px)] leading-[1.1]"
            style={{ color: "#fff" }}
          >
            AI handles the <br />
            heavy lifting.
          </MotionFade>
          <MotionFade delay={2} className="text-[15px] leading-[1.6] max-w-prose" style={{ color: "rgba(255,255,255,0.7)" }}>
            Multi-agent AI assists with every stage of contracting, from
            drafting and redlining to risk analysis and performance insights.
          </MotionFade>
          <MotionFade delay={3} className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold group"
              style={{ color: "rgb(167,139,250)" }}
            >
              Meet Bluely
              <ArrowRight
                size={13}
                strokeWidth={2.5}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </MotionFade>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────── */
/*  Personas grid — one card per role               */
/* ──────────────────────────────────────────────── */
function PersonasSection() {
  const personas: {
    title: string;
    body: string;
    icon: typeof Gavel;
    accent: string;
    iconBg: string;
    iconColor: string;
  }[] = [
    {
      title: "General Counsel",
      body: "Strategic oversight without the overload.",
      icon: Gavel,
      accent: "var(--ai-ink)",
      iconBg: "var(--ai-surface)",
      iconColor: "var(--ai-ink)",
    },
    {
      title: "Procurement",
      body: "Control spend, minimize risk.",
      icon: ShoppingCart,
      accent: "var(--warning)",
      iconBg: "var(--warning-soft)",
      iconColor: "var(--warning)",
    },
    {
      title: "IT",
      body: "Deploy an adoptable, scalable CLM.",
      icon: Laptop,
      accent: "var(--info)",
      iconBg: "var(--info-soft)",
      iconColor: "var(--info)",
    },
    {
      title: "Sales",
      body: "Faster contracts, more revenue.",
      icon: TrendingUp,
      accent: "var(--success)",
      iconBg: "var(--success-soft)",
      iconColor: "var(--success)",
    },
    {
      title: "Legal Ops",
      body: "Streamline contracts from end to end.",
      icon: Repeat,
      accent: "var(--brand-primary-600)",
      iconBg: "var(--brand-primary-50)",
      iconColor: "var(--brand-primary-700)",
    },
    {
      title: "Compliance",
      body: "Stay audit-ready across every clause.",
      icon: ShieldCheck,
      accent: "#0EA5E9",
      iconBg: "#E0F2FE",
      iconColor: "#0369A1",
    },
  ];

  return (
    <section className="py-20 md:py-28 px-5 md:px-10 max-w-[1480px] mx-auto">
      <div className="flex flex-col items-center text-center mb-12 md:mb-14 gap-4">
        <Reveal as="span" className="eyebrow text-muted-foreground">
          Built for every team
        </Reveal>
        <Reveal
          as="h2"
          className="landing-h2 text-[clamp(28px,3.2vw,44px)] text-foreground leading-[1.1] max-w-[820px]"
          delay={1}
        >
          One contract.<br className="hidden sm:block" />{" "}
          <span className="text-muted-foreground">A workspace for every role.</span>
        </Reveal>
        <Reveal
          as="p"
          className="text-[15px] text-muted-foreground leading-[1.6] max-w-[640px]"
          delay={2}
        >
          From the desk that signs it to the team that delivers on it — every
          stakeholder gets the view they need, with the same source of truth.
        </Reveal>
      </div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-5%" }}
      >
        {personas.map((p, i) => {
          const Icon = p.icon;
          return (
            <motion.article
              key={p.title}
              variants={fadeUpVariants}
              custom={i}
              className="group relative h-full rounded-xl border border-border bg-card p-6 md:p-7 hover:shadow-sm transition-all overflow-hidden"
            >
                <span
                  className="absolute top-0 left-6 right-6 h-[3px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: p.accent }}
                />
                <div className="flex items-start justify-between gap-3 mb-5">
                  <span
                    className="inline-flex h-12 w-12 items-center justify-center rounded-lg shrink-0 ring-1 transition-transform group-hover:scale-105"
                    style={{
                      background: p.iconBg,
                      color: p.iconColor,
                      boxShadow: `inset 0 0 0 1px ${p.accent}1A`,
                    }}
                  >
                    <Icon size={20} strokeWidth={1.75} />
                  </span>
                  <span
                    className="font-mono text-[10px] text-muted-foreground tabular-nums"
                    aria-hidden
                  >
                    0{i + 1}
                  </span>
                </div>
                <h3 className="text-[18px] font-semibold tracking-tight text-foreground">
                  {p.title}
                </h3>
                <p className="mt-2 text-[14px] text-muted-foreground leading-[1.55]">
                  {p.body}
                </p>
                <span
                  className="mt-5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors"
                >
                  See the workflow
                  <ArrowRight
                    size={12}
                    strokeWidth={2.25}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </motion.article>
          );
        })}
      </motion.div>
    </section>
  );
}

/* ──────────────────────────────────────────────── */
/*  Proof section — testimonials + media mentions    */
/* ──────────────────────────────────────────────── */
function ProofSection() {
  const testimonials = [
    {
      quote: "We cut cycle time from 21 days to 8 — and caught $3.4M in liability exposure we'd have missed. Every GC should see this.",
      name: "Mira Holm",
      title: "Head of Contracts · Obelisk Capital",
      initials: "MH",
    },
    {
      quote: "Our average quote-to-sign dropped by 11 days in the first quarter. Bluely drafts our counter-language before I finish my coffee.",
      name: "James Okoye",
      title: "VP Sales Ops · Northwind Logistics",
      initials: "JO",
    },
    {
      quote: "Portfolio anomaly detection caught a $1.2M SLA gap across three vendor contracts in the same week we onboarded. That alone paid for Blue-IQ.",
      name: "Priya Mehta",
      title: "Legal Ops Lead · Vector Bio",
      initials: "PM",
    },
  ];

  const mediaLogos = ["Financial Times", "TechCrunch", "The Recorder", "Business Insider"];

  return (
    <section id="customers" className="py-20 md:py-28 px-5 md:px-10 max-w-[1480px] mx-auto scroll-mt-20">
      <div className="flex flex-col items-center text-center mb-12 gap-4">
        <Reveal as="span" className="eyebrow text-muted-foreground">Proof</Reveal>
        <Reveal
          as="h2"
          className="landing-h2 text-[clamp(28px,3.2vw,44px)] text-foreground leading-[1.1] max-w-[680px]"
          delay={1}
        >
          What teams say after their first contract.
        </Reveal>
      </div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-5%" }}
      >
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            variants={fadeUpVariants}
            custom={i}
            className="flex flex-col bg-card border border-border rounded-xl p-7 shadow-xs hover:shadow-sm transition-shadow"
          >
            <p className="text-[14.5px] leading-[1.65] text-foreground/85 flex-1 mb-6">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div className="flex items-center gap-3 pt-5 border-t border-border">
              <div className="w-10 h-10 rounded-full bg-[var(--brand-primary-600)] inline-flex items-center justify-center text-white font-semibold text-[12px] shrink-0">
                {t.initials}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">{t.name}</p>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">{t.title}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <MotionFade>
        <div className="flex flex-col items-center gap-5">
          <span className="eyebrow text-muted-foreground">Featured in</span>
          <div className="flex flex-wrap items-center justify-center gap-0">
            {mediaLogos.map((logo, i) => (
              <span key={logo} className="flex items-center">
                <span className="px-6 py-2 text-[14px] font-semibold tracking-tight text-[var(--ink-400)] hover:text-[var(--ink-600)] transition-colors cursor-default">
                  {logo}
                </span>
                {i < mediaLogos.length - 1 && (
                  <span className="h-4 w-px bg-border" />
                )}
              </span>
            ))}
          </div>
        </div>
      </MotionFade>
    </section>
  );
}

/* ──────────────────────────────────────────────── */
/*  Updates                                          */
/* ──────────────────────────────────────────────── */
function Updates() {
  const items = [
    {
      tag: "Product · May 18",
      title: "Portfolio anomaly detection ships to GA",
      bg: "bg-[var(--ai-surface)]",
      numColor: "rgba(124, 58, 237, 0.30)",
      num: "01",
    },
    {
      tag: "Insights · Apr 30",
      title: "Why your liability cap is silently eating margin",
      bg: "bg-amber-50",
      numColor: "rgba(217, 119, 6, 0.30)",
      num: "02",
    },
    {
      tag: "News · Apr 14",
      title: "Blue-IQ raises $52M Series B to accelerate the legal stack",
      bg: "bg-emerald-50",
      numColor: "rgba(5, 150, 105, 0.30)",
      num: "03",
    },
  ];
  return (
    <section className="py-16 md:py-24 px-5 md:px-10 max-w-[1480px] mx-auto">
      <div className="flex justify-between items-end mb-12">
        <Reveal as="h2" className="landing-h2 text-[clamp(28px,3vw,40px)] text-foreground">
          From the team
        </Reveal>
        <Link
          href="/insights"
          className="text-[12px] font-semibold border-b border-foreground pb-0.5 hover:text-[var(--brand-primary-700)] hover:border-[var(--brand-primary-700)] transition-colors"
        >
          View all
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {items.map((it, i) => (
          <Reveal key={it.title} delay={((i + 1) as 1 | 2 | 3)}>
            <Link href="/dashboard" className="group cursor-pointer block">
              <TiltCard
                className={`w-full h-[380px] rounded-xl mb-6 overflow-hidden shadow-xs border border-border ${it.bg} relative`}
                intensity={3}
              >
                <div className="absolute inset-0 grid place-content-center tilt-inner">
                  <span
                    className="font-display font-extrabold leading-none tracking-tight"
                    style={{ fontSize: 220, color: it.numColor }}
                  >
                    {it.num}
                  </span>
                </div>
                <div className="absolute top-4 left-4 text-[9.5px] font-semibold uppercase tracking-wider text-foreground bg-card/80 backdrop-blur px-2 py-1 rounded-md border border-border tilt-inner">
                  {it.tag.split(" · ")[0]}
                </div>
                <div className="absolute bottom-4 right-4 inline-flex h-9 w-9 rounded-md bg-card border border-border items-center justify-center group-hover:bg-[var(--brand-primary-600)] transition-colors duration-200 tilt-inner">
                  <ArrowUpRight size={14} className="text-foreground group-hover:text-white transition-colors" />
                </div>
              </TiltCard>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{it.tag}</p>
              <h4 className="landing-h3 text-[18px] text-foreground group-hover:text-[var(--brand-primary-700)] transition-colors">
                {it.title}
              </h4>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────── */
/*  FAQs                                             */
/* ──────────────────────────────────────────────── */
function FAQsSection() {
  const [open, setOpen] = useState<number | null>(null);

  const faqs = [
    {
      q: "How long does setup take?",
      a: "Most teams are analyzing their first contract within 90 seconds of upload. Playbook configuration typically takes one afternoon with your legal lead.",
    },
    {
      q: "Do you integrate with our existing tools?",
      a: "Blue-IQ connects to common DMS platforms, DocuSign, Salesforce, and Microsoft 365. API access is available on all plans.",
    },
    {
      q: "How is this different from a traditional CLM?",
      a: "Traditional CLMs are repositories. Blue-IQ is an intelligence layer — it reads every clause, scores deviation from your playbook, and surfaces decisions. Most CLMs require weeks of configuration before they surface any insight.",
    },
    {
      q: "Is our contract data secure?",
      a: "Yes. Blue-IQ is SOC 2 Type II aligned, GDPR and HIPAA ready. Your data is encrypted at rest and in transit, and never used to train shared models.",
    },
    {
      q: "What document types are supported?",
      a: "SOW, MSA, NDA, amendments, and side letters. PDFs (including scanned/image-only), DOCX, and most common formats are supported via OCR.",
    },
    {
      q: "Is there a free trial?",
      a: "Yes — no credit card required. Sign up and analyze your first contract free. Pricing scales with document volume and team size.",
    },
  ];

  return (
    <section className="py-20 md:py-28 px-5 md:px-10 max-w-[800px] mx-auto">
      <div className="flex flex-col items-center text-center mb-12 gap-4">
        <Reveal as="span" className="eyebrow text-muted-foreground">Got questions?</Reveal>
        <Reveal
          as="h2"
          className="landing-h2 text-[clamp(28px,3vw,40px)] text-foreground leading-[1.1]"
          delay={1}
        >
          Everything you need to know.
        </Reveal>
      </div>

      <div className="flex flex-col divide-y divide-border border border-border rounded-xl overflow-hidden bg-card">
        {faqs.map((faq, i) => (
          <MotionFade key={faq.q} delay={i}>
            <div>
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-muted/50 transition-colors"
                aria-expanded={open === i}
              >
                <span className="text-[14.5px] font-semibold text-foreground">{faq.q}</span>
                <ChevronDown
                  size={16}
                  strokeWidth={2}
                  aria-hidden
                  className="shrink-0 text-muted-foreground transition-transform duration-200"
                  style={{ transform: open === i ? "rotate(180deg)" : "rotate(0deg)" }}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-5">
                  <p className="text-[14px] leading-[1.65] text-muted-foreground">{faq.a}</p>
                </div>
              )}
            </div>
          </MotionFade>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────── */
/*  Final CTA                                        */
/* ──────────────────────────────────────────────── */
function FinalCTA() {
  return (
    <section id="pricing" className="py-20 md:py-28 px-5 md:px-10 bg-[var(--paper)] scroll-mt-20">
      <div className="max-w-[860px] mx-auto">
        <MotionFade>
          <div className="relative rounded-2xl border border-[var(--brand-primary-100)] bg-white/70 backdrop-blur-xl shadow-[0_2px_32px_-4px_rgba(37,99,235,0.10),0_0_0_1px_rgba(37,99,235,0.06)] px-8 md:px-14 py-14 md:py-18 flex flex-col items-center text-center overflow-hidden">
            {/* Subtle brand tint wash */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(37,99,235,0.055) 0%, transparent 70%)" }}
            />

            <div className="relative flex flex-col items-center">
              <div className="inline-flex items-center gap-2 mb-6 rounded-full border border-[var(--brand-primary-200)] bg-[var(--brand-primary-50)] px-3.5 py-1.5">
                <Mark size={16} />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-primary-700)]">Blue-IQ · Contract Intelligence</span>
              </div>

              <h2 className="landing-display text-[clamp(32px,5vw,58px)] leading-[1.05] mb-5 max-w-[700px] text-balance text-foreground">
                Stop leaving revenue<br className="hidden md:block" /> on the{" "}
                <span className="text-[var(--brand-primary-700)]">table</span>.
              </h2>

              <p className="text-[15px] text-muted-foreground max-w-[480px] mb-8 leading-[1.65]">
                Join 240+ contracting teams. Eight days from first draft to countersignature. Real audit trail. Zero black-box decisions.
              </p>

              <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center mb-10">
                {[
                  "Clause-level deviation detection",
                  "Bluely AI copilot included",
                  "Full audit trail",
                  "SOC 2 aligned",
                  "No credit card to start",
                ].map((item) => (
                  <span key={item} className="flex items-center gap-1.5 text-[13px] text-[var(--ink-600)]">
                    <CheckCircle2 size={13} className="text-[var(--brand-primary-600)]" />
                    {item}
                  </span>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white rounded-md h-11 px-6 text-[13px] font-semibold transition-colors duration-200"
                >
                  Open the workspace
                  <ArrowRight size={14} strokeWidth={2.25} />
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 bg-card border border-border hover:bg-muted text-foreground rounded-md h-11 px-6 text-[13px] font-semibold transition-colors duration-200"
                >
                  <span className="inline-block w-2 h-2 rounded-full bg-[var(--success)]" />
                  Book a demo
                </Link>
              </div>

              <p className="mt-5 text-[11px] text-muted-foreground">
                No credit card required · SOC 2 Type II · 90-second setup
              </p>
            </div>
          </div>
        </MotionFade>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────── */
/*  Footer                                           */
/* ──────────────────────────────────────────────── */
function Footer() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setSubmitted(true);
    setEmail("");
  };

  return (
    <footer className="relative bg-[var(--ink-900)] text-white pt-16 md:pt-24 pb-8 md:pb-10 px-5 md:px-10 rounded-t-3xl z-20 overflow-hidden">
      {/* Subtle paper-grid wash for texture */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative max-w-[1480px] mx-auto">
        {/* ── CTA + newsletter row ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 pb-12 md:pb-16 border-b border-white/10">
          <div className="lg:col-span-7">
            <div className="text-[10.5px] uppercase tracking-wider font-semibold text-white/50 mb-4">
              {META.tagline}
            </div>
            <h3 className="text-[clamp(28px,3.6vw,42px)] font-bold tracking-tight leading-[1.1] text-white max-w-xl">
              Eight days from first draft to countersignature.
            </h3>
            <p className="mt-5 text-[14px] text-white/65 max-w-md leading-relaxed">
              Join 240+ contracting teams who&apos;ve eliminated revenue leakage and shortened cycles with Blue-IQ.
            </p>
          </div>
          <div className="lg:col-span-5">
            <div className="text-[10.5px] uppercase tracking-wider font-semibold text-white/50 mb-3">
              Weekly briefing
            </div>
            <p className="text-[13px] text-white/65 mb-4 leading-relaxed">
              Trends in contract velocity, AI redlining benchmarks, and what we&apos;re shipping. No fluff.
            </p>
            <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2">
              <label className="sr-only" htmlFor="footer-email">Email</label>
              <div className="relative flex-1">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                <input
                  id="footer-email"
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setSubmitted(false); }}
                  className="h-11 w-full rounded-md bg-white/[0.06] border border-white/10 pl-9 pr-3 text-[13px] text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 focus:bg-white/[0.10] transition-colors"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-md bg-white text-[var(--ink-900)] text-[13px] font-semibold hover:bg-white/90 transition-colors shrink-0"
              >
                Subscribe <ArrowRight size={13} strokeWidth={2.5} />
              </button>
            </form>
            <div className="mt-3 min-h-[18px] text-[11.5px]">
              {submitted ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-300/90">
                  <CheckCircle2 size={12} /> Thanks — check your inbox.
                </span>
              ) : (
                <span className="text-white/40">No spam. Unsubscribe anytime.</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Brand + columns ──────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-10 lg:gap-12 py-12 md:py-16">
          <div className="col-span-2 flex flex-col gap-6">
            <Logo height={28} variant="dark" />
            <p className="text-[13px] text-white/65 max-w-xs leading-relaxed">
              The contract-intelligence workspace. Surface risk, accelerate cycles, prevent leakage.
            </p>
            <div className="flex items-center gap-2 text-[11.5px] text-white/55">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 ai-pulse" />
                All systems normal
              </span>
            </div>
          </div>

          <FooterCol
            title="Product"
            items={[
              { label: "Overview", href: "/dashboard" },
              { label: "SOW Analyzer", href: "/library" },
              { label: "Amendments", href: "/projects" },
              { label: "Workflow", href: "/workflow" },
              { label: "Insights", href: "/insights" },
              { label: "Playbook", href: "/settings/playbook" },
            ]}
          />
          <FooterCol
            title="Workspace"
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Projects", href: "/projects" },
              { label: "Clause library", href: "/settings/clauses" },
              { label: "Settings", href: "/settings" },
            ]}
          />
          <FooterCol
            title="Get started"
            items={[
              { label: "Create account", href: "/signup" },
              { label: "Sign in", href: "/login" },
              { label: "How it works", href: "#how" },
              { label: "Customers", href: "#customers" },
            ]}
          />
          <FooterCol
            title="Account"
            items={[
              { label: "Sign up", href: "/signup" },
              { label: "Log in", href: "/login" },
              { label: "Reset password", href: "/reset" },
            ]}
          />
        </div>

        {/* ── Legal row ────────────────────────────────────── */}
        <div className="pt-6 md:pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <p className="text-[11px] text-white/50 font-mono">© 2026 Blue-IQ Inc. — all contracts considered.</p>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-white/55 border border-white/10 rounded-md h-8 px-2.5">
              <Globe2 size={12} /> English · US
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-white/55 border border-white/10 rounded-md h-8 px-2.5">
              <ShieldCheck size={12} /> SOC 2–aligned
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

type FooterItem = { label: string; href: string; badge?: string };
function FooterCol({ title, items }: { title: string; items: FooterItem[] }) {
  return (
    <div>
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-white mb-4">{title}</h4>
      <ul className="flex flex-col gap-2.5">
        {items.map((it) => (
          <li key={it.label}>
            <Link
              href={it.href}
              className="inline-flex items-center gap-2 text-[13px] text-white/65 hover:text-white transition-colors"
            >
              {it.label}
              {it.badge && (
                <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                  {it.badge}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}