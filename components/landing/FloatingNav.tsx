"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
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
  Lock,
} from "@/components/ui/icons";
import { Logo } from "@/components/landing/primitives";

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
      { label: "SOW Analyzer", href: "/library", description: "Clause extraction and risk scoring", icon: FileText },
      { label: "Amendments", href: "/projects", description: "Diff each version against the original", icon: GitBranch },
      { label: "Workflow", href: "/workflow", description: "See where every contract is stuck", icon: Kanban },
      { label: "Insights", href: "/insights", description: "Total contract value and risk", icon: BarChart3 },
      { label: "Playbook", href: "/settings/playbook", description: "Your firm's standard positions", icon: BookMarked },
      { label: "Clause Library", href: "/settings/clauses", description: "Pre-approved counter-language", icon: Briefcase },
    ],
    footer: {
      label: "Open the workspace →",
      href: "/dashboard",
      description: "First analysis in 15 seconds. SOC 2 aligned.",
    },
  },
  {
    label: "Customers",
    href: "#customers",
    items: [
      { label: "Legal Counsel", href: "#customers", description: "In-house counsel and GC teams", icon: ShieldCheck },
      { label: "Sales Ops", href: "#customers", description: "Get deals signed sooner", icon: GitBranch },
      { label: "Finance / CFO", href: "#customers", description: "Track value across amendments", icon: PieChart },
      { label: "Procurement", href: "#customers", description: "Watch SLAs and renewal dates", icon: FileSignature },
    ],
    footer: {
      label: "Read customer stories →",
      href: "#customers",
      description: "How contract teams actually use Blue-IQ",
    },
  },
  {
    label: "Pricing",
    href: "#pricing",
  },
  {
    label: "Resources",
    href: "#features",
    items: [
      { label: "Workflow", href: "/workflow", description: "See where every contract is stuck", icon: GitBranch },
      { label: "Security", href: "#security", description: "SOC 2, GDPR, and HIPAA aligned", icon: Lock },
      { label: "Playbook", href: "/settings/playbook", description: "Your firm's standard positions", icon: Users },
    ],
    footer: {
      label: "Open the workspace →",
      href: "/dashboard",
      description: "Most teams analyze a contract in under a minute",
    },
  },
];

/* ──────────────────────────────────────────────── */
/*  Floating nav with dropdowns + mobile sheet      */
/* ──────────────────────────────────────────────── */
export function FloatingNav() {
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
        "fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ease-out",
        scrolled
          ? "border-border bg-[var(--background)]/85 backdrop-blur-xl"
          : "border-border/60 bg-[var(--background)]/60 backdrop-blur-md",
      ].join(" ")}>
        <div
          className="relative mx-auto w-full max-w-[1200px] px-5 md:px-8"
          onMouseLeave={handleLeave}
        >
        <motion.div
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className={`flex items-center justify-between transition-[height] duration-300 ${scrolled ? "h-[60px]" : "h-[72px]"}`}
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
                      "inline-flex items-center gap-1 h-9 px-3 rounded-full text-[13.5px] font-medium transition-colors",
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
          <div className="flex items-center gap-1.5 shrink-0">
            {authed ? (
              <Link
                href="/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13.5px] font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
              >
                Go to dashboard <ArrowUpRight size={14} strokeWidth={2} />
              </Link>
            ) : (
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center h-9 px-3.5 rounded-full text-[13.5px] font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
              >
                Log in
              </Link>
            )}
            <Link
              href="/signup"
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-5 text-[13.5px] font-semibold rounded-full text-background bg-foreground hover:opacity-90 transition-opacity duration-200 whitespace-nowrap shrink-0"
            >
              Book a demo
              <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
              className="lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-full text-foreground hover:bg-muted transition-colors ml-1"
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
