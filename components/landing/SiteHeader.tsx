"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  ArrowRight,
  BarChart3,
  BookMarked,
  Briefcase,
  ChevronDown,
  DollarSign,
  DraftSow,
  FileText,
  GitCompare,
  Kanban,
  LayoutDashboard,
  Lock,
  Menu,
  Scale,
  Settings,
  ShieldCheck,
  User,
  Users,
  X,
  type LucideIcon,
} from "@/components/ui/icons";
import { Logo } from "@/components/landing/primitives";

type MenuItem = { label: string; href: string; desc: string; icon: LucideIcon };
type NavMenu = { label: string; items: MenuItem[]; foot: { label: string; href: string } };

const MENUS: NavMenu[] = [
  {
    label: "Product",
    items: [
      { label: "Clause extraction", href: "/product#extraction", desc: "Every clause read and filed by type", icon: FileText },
      { label: "Playbook scoring", href: "/product#scoring", desc: "Deviations flagged and cited to the section", icon: ShieldCheck },
      { label: "Amendment tracking", href: "/product#amendments", desc: "Version comparison and value recalculation", icon: GitCompare },
      { label: "SOW drafting", href: "/product#drafting", desc: "A first draft from a short questionnaire", icon: DraftSow },
      { label: "Workflow and insights", href: "/product#workflow", desc: "Pipeline, renewals and portfolio risk", icon: Kanban },
    ],
    foot: { label: "Platform overview", href: "/product" },
  },
  {
    label: "Solutions",
    items: [
      { label: "Legal", href: "/solutions#legal", desc: "General counsel and in-house teams", icon: BookMarked },
      { label: "Procurement", href: "/solutions#procurement", desc: "Payment terms and renewal dates", icon: Briefcase },
      { label: "Finance", href: "/solutions#finance", desc: "Contract value across amendments", icon: BarChart3 },
      { label: "Sales operations", href: "/solutions#sales", desc: "Redlines back the same day", icon: Kanban },
      { label: "Legal operations", href: "/solutions#legal-ops", desc: "One searchable contract record", icon: Users },
      { label: "Compliance", href: "/solutions#compliance", desc: "Clause-level audit history", icon: Scale },
    ],
    foot: { label: "All teams", href: "/solutions" },
  },
  {
    label: "Resources",
    items: [
      { label: "Savings calculator", href: "/calculator", desc: "Estimate review hours and cost saved", icon: DollarSign },
      { label: "Security overview", href: "/security", desc: "How contract data is protected", icon: Lock },
      { label: "Privacy policy", href: "/legal/privacy", desc: "What we process and why", icon: ShieldCheck },
      { label: "Data processing", href: "/legal/dpa", desc: "Processor terms and sub-processors", icon: FileText },
    ],
    foot: { label: "Terms of service", href: "/legal/terms" },
  },
];

const ACCOUNT_ID = "Account";

/** `overNight`: the page opens on the night hero, so the bar starts transparent
 *  and turns solid once the visitor scrolls. */
export function SiteHeader({ overNight = false }: { overNight?: boolean }) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { status } = useAuth();
  const authed = status === "authenticated";

  useEffect(() => {
    if (!overNight) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overNight]);

  // Escape and outside clicks close whatever is open.
  useEffect(() => {
    if (!openMenu && !mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpenMenu(null);
      setMobileOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [openMenu, mobileOpen]);

  const hoverOpen = (label: string) => {
    clearTimeout(closeTimer.current);
    setOpenMenu(label);
  };
  const hoverClose = () => {
    closeTimer.current = setTimeout(() => setOpenMenu(null), 140);
  };
  const closeAll = () => {
    setOpenMenu(null);
    setMobileOpen(false);
  };
  // Tabbing out of a menu closes it.
  const onBlurMenu = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpenMenu(null);
  };

  const accountItems: MenuItem[] = authed
    ? [
        { label: "Dashboard", href: "/dashboard", desc: "Your contracts and what needs attention", icon: LayoutDashboard },
        { label: "Settings", href: "/settings", desc: "Playbook, team and compliance packs", icon: Settings },
      ]
    : [
        { label: "Log in", href: "/login", desc: "Open your Govern workspace", icon: User },
        { label: "Create an account", href: "/signup", desc: "Your first analysis is free", icon: Users },
        { label: "Reset password", href: "/reset", desc: "Get a code by email", icon: Lock },
      ];
  const accountLabel = authed ? "Account" : "Log in";

  // Transparent only while resting on the night hero with nothing open.
  const night = overNight && !scrolled && !mobileOpen && !openMenu;

  return (
    <header ref={headerRef} className="lp-header fixed inset-x-0 top-0 z-50" data-over-night={night}>
      <div className="lp-wrap flex h-18 items-center justify-between gap-6">
        <Link href="/" aria-label="Blue-IQ Govern home" className="flex shrink-0 items-center gap-3" onClick={closeAll}>
          <Logo height={28} priority variant={night ? "dark" : "light"} />
          <span className="lp-product-tag">Govern</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {MENUS.map((m) => {
            const isOpen = openMenu === m.label;
            const id = `lp-menu-${m.label.toLowerCase()}`;
            return (
              <div
                key={m.label}
                className="relative"
                onMouseEnter={() => hoverOpen(m.label)}
                onMouseLeave={hoverClose}
                onBlur={onBlurMenu}
              >
                <button
                  type="button"
                  className="lp-navbtn"
                  aria-expanded={isOpen}
                  aria-controls={id}
                  onClick={() => setOpenMenu(isOpen ? null : m.label)}
                >
                  {m.label}
                  <ChevronDown size={14} strokeWidth={2} className="lp-navbtn-chevron" aria-hidden="true" />
                </button>
                {isOpen && (
                  <div id={id} className="lp-menu lp-menu-wide">
                    <ul className="grid grid-cols-2 gap-1">
                      {m.items.map((it) => (
                        <li key={it.label}>
                          <MenuLink item={it} onNavigate={closeAll} />
                        </li>
                      ))}
                    </ul>
                    <Link href={m.foot.href} className="lp-menu-foot" onClick={closeAll}>
                      {m.foot.label}
                      <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div
            className="relative hidden sm:block"
            onMouseEnter={() => hoverOpen(ACCOUNT_ID)}
            onMouseLeave={hoverClose}
            onBlur={onBlurMenu}
          >
            <button
              type="button"
              className="lp-navbtn"
              aria-expanded={openMenu === ACCOUNT_ID}
              aria-controls="lp-menu-account"
              onClick={() => setOpenMenu(openMenu === ACCOUNT_ID ? null : ACCOUNT_ID)}
            >
              {accountLabel}
              <ChevronDown size={14} strokeWidth={2} className="lp-navbtn-chevron" aria-hidden="true" />
            </button>
            {openMenu === ACCOUNT_ID && (
              <div id="lp-menu-account" className="lp-menu lp-menu-end w-72">
                <ul className="flex flex-col gap-1">
                  {accountItems.map((it) => (
                    <li key={it.label}>
                      <MenuLink item={it} onNavigate={closeAll} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <Link
            href={authed ? "/dashboard" : "/signup"}
            className={`lp-btn lp-btn-sm hidden sm:inline-flex ${night ? "lp-btn-light" : "lp-btn-primary"}`}
            onClick={closeAll}
          >
            {authed ? "Open Govern" : "Start free"}
          </Link>
          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-controls="lp-mobile-nav"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((v) => !v)}
            className="lp-header-icon inline-flex h-11 w-11 items-center justify-center rounded-full lg:hidden"
          >
            {mobileOpen ? <X size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          id="lp-mobile-nav"
          aria-label="Primary"
          className="max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-lp-line bg-lp-sheet lg:hidden"
        >
          <div className="lp-wrap py-2">
            {MENUS.map((m) => {
              const isOpen = mobileSection === m.label;
              const id = `lp-mobile-${m.label.toLowerCase()}`;
              return (
                <div key={m.label} className="border-b border-lp-line">
                  <button
                    type="button"
                    className="flex h-14 w-full items-center justify-between text-lg font-semibold text-lp-ink"
                    aria-expanded={isOpen}
                    aria-controls={id}
                    onClick={() => setMobileSection(isOpen ? null : m.label)}
                  >
                    {m.label}
                    <ChevronDown
                      size={18}
                      strokeWidth={2}
                      className={`lp-navbtn-chevron ${isOpen ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                  {isOpen && (
                    <ul id={id} className="flex flex-col gap-1 pb-4">
                      {m.items.map((it) => (
                        <li key={it.label}>
                          <MenuLink item={it} onNavigate={closeAll} />
                        </li>
                      ))}
                      <li>
                        <Link href={m.foot.href} className="lp-menu-foot" onClick={closeAll}>
                          {m.foot.label}
                          <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
                        </Link>
                      </li>
                    </ul>
                  )}
                </div>
              );
            })}
            <div className="flex gap-3 py-5">
              <Link href={authed ? "/dashboard" : "/login"} onClick={closeAll} className="lp-btn lp-btn-quiet flex-1">
                {authed ? "Dashboard" : "Log in"}
              </Link>
              {!authed && (
                <Link href="/signup" onClick={closeAll} className="lp-btn lp-btn-primary flex-1">
                  Start free
                </Link>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}

function MenuLink({ item, onNavigate }: { item: MenuItem; onNavigate: () => void }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className="lp-menu-item" onClick={onNavigate}>
      <span className="lp-icon-tile lp-menu-icon">
        <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-lp-ink">{item.label}</span>
        <span className="block text-sm text-lp-ink-3">{item.desc}</span>
      </span>
    </Link>
  );
}
