"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Menu, X } from "@/components/ui/icons";
import { Logo } from "@/components/landing/primitives";
import { NAV_MENUS, PRODUCT_SECTIONS, productHref, type NavItem, type NavMenu } from "@/components/landing/site-nav";
import { ComingSoonBadge } from "@/components/landing/ComingSoon";
import { AccountMenu, AccountSummary, useVisitor } from "@/components/landing/AccountMenu";

/* Public site header: a full-width bar with the mark on the left, the
   three menus centred and the actions on the right. A menu opens as a
   mega menu under the bar, on hover or click; Escape, an outside click or
   leaving the header closes it. On narrow screens the menus become an
   accordion in a drawer. */

const MOBILE_NAV_ID = "lp-mobile-nav";
// The account menu shares the header's open-menu state with the three menus.
const ACCOUNT_MENU = "Account";
const CLOSE_DELAY_MS = 160;

const menuId = (label: string) => `lp-menu-${label.toLowerCase()}`;

export function SiteHeader() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [isScrolled, setIsScrolled] = useState(false);
  // Who is signed in, read from the session cookies (null when nobody is).
  const visitor = useVisitor();

  useEffect(() => {
    if (!openMenu && !isDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpenMenu(null);
      setIsDrawerOpen(false);
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
  }, [openMenu, isDrawerOpen]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  // The mobile menu is a full-screen panel: the page behind it must not scroll.
  useEffect(() => {
    if (!isDrawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isDrawerOpen]);

  // At the top the bar is part of the page; once content scrolls under it,
  // it becomes a white bar with a hairline.
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const open = (label: string) => {
    clearTimeout(closeTimer.current);
    setOpenMenu(label);
  };
  const closeSoon = () => {
    closeTimer.current = setTimeout(() => setOpenMenu(null), CLOSE_DELAY_MS);
  };
  const closeAll = () => {
    setOpenMenu(null);
    setIsDrawerOpen(false);
  };
  // Tabbing out of the header closes the sheet.
  const closeOnBlur = (e: React.FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpenMenu(null);
  };

  const activeMenu = NAV_MENUS.find((menu) => menu.label === openMenu);
  // The sheet fades out on close: hold the last menu until the fade ends.
  const [shownMenu, setShownMenu] = useState<NavMenu | null>(null);
  if (activeMenu && activeMenu !== shownMenu) setShownMenu(activeMenu);
  useEffect(() => {
    if (activeMenu || !shownMenu) return;
    const t = window.setTimeout(() => setShownMenu(null), SHEET_CLOSE_MS);
    return () => window.clearTimeout(t);
  }, [activeMenu, shownMenu]);

  return (
    <header
      ref={headerRef}
      className="lp-header sticky top-0 z-50"
      data-raised={isScrolled || Boolean(openMenu) || isDrawerOpen ? "true" : undefined}
      onMouseLeave={closeSoon}
      onMouseEnter={() => clearTimeout(closeTimer.current)}
      onBlur={closeOnBlur}
    >
      <div className="lp-wrap lp-header-bar">
        <Link href="/" aria-label="Blue-IQ Govern home" className="flex shrink-0 items-center gap-3" onClick={closeAll}>
          <Logo height={28} priority />
          <span className="lp-product-tag">Govern</span>
        </Link>

        <nav aria-label="Primary" className="lp-navgroup hidden lg:flex">
          {NAV_MENUS.map((menu) => {
            const isOpen = openMenu === menu.label;
            return (
              <button
                key={menu.label}
                type="button"
                className="lp-navbtn"
                aria-expanded={isOpen}
                aria-controls={menuId(menu.label)}
                onMouseEnter={() => open(menu.label)}
                onClick={() => (isOpen ? setOpenMenu(null) : open(menu.label))}
              >
                {menu.label}
                <ChevronDown size={16} strokeWidth={2} className="lp-navbtn-chevron" aria-hidden="true" />
              </button>
            );
          })}
        </nav>

        <div className="flex items-center justify-end gap-2">
          {visitor ? (
            <div className="hidden sm:block">
              <AccountMenu
                visitor={visitor}
                isOpen={openMenu === ACCOUNT_MENU}
                onOpen={() => open(ACCOUNT_MENU)}
                onToggle={() => (openMenu === ACCOUNT_MENU ? setOpenMenu(null) : open(ACCOUNT_MENU))}
                onNavigate={closeAll}
              />
            </div>
          ) : (
            <>
              <Link href="/login" className="lp-btn lp-btn-quiet lp-btn-sm hidden sm:inline-flex" onClick={closeAll}>
                Sign in
              </Link>
              <Link href="/signup" className="lp-btn lp-btn-primary lp-btn-sm hidden sm:inline-flex" onClick={closeAll}>
                Request a demo
                <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
              </Link>
            </>
          )}
          <button
            type="button"
            aria-expanded={isDrawerOpen}
            aria-controls={MOBILE_NAV_ID}
            aria-label={isDrawerOpen ? "Close menu" : "Open menu"}
            onClick={() => setIsDrawerOpen((isOpen) => !isOpen)}
            className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-lp-control text-lp-ink lg:hidden"
          >
            {isDrawerOpen ? <X size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
          </button>
        </div>
      </div>

      {shownMenu ? <MenuSheet menu={shownMenu} closing={!activeMenu} onNavigate={closeAll} /> : null}

      {isDrawerOpen && (
        <nav id={MOBILE_NAV_ID} aria-label="Primary" className="lp-drawer lg:hidden">
          <div className="lp-drawer-bar lp-wrap">
            <Link href="/" aria-label="Blue-IQ Govern home" className="flex items-center gap-3" onClick={closeAll}>
              <Logo height={26} />
              <span className="lp-product-tag">Govern</span>
            </Link>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setIsDrawerOpen(false)}
              className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-lp-ink hover:bg-lp-subtle"
            >
              <X size={22} strokeWidth={2} />
            </button>
          </div>
          <div className="lp-drawer-body lp-wrap">
            {NAV_MENUS.map((menu) => {
              const isOpen = openSection === menu.label;
              const sectionId = `lp-mobile-${menu.label.toLowerCase()}`;
              return (
                <div key={menu.label} className="border-b border-lp-line">
                  <button
                    type="button"
                    className="lp-drawer-row"
                    aria-expanded={isOpen}
                    aria-controls={sectionId}
                    onClick={() => setOpenSection(isOpen ? null : menu.label)}
                  >
                    {menu.label}
                    <ChevronDown size={18} strokeWidth={2} className="lp-navbtn-chevron" aria-hidden="true" />
                  </button>
                  {isOpen && (
                    <div id={sectionId} className="pb-4">
                      {menu.groups.map((group) => (
                        <div key={group.label} className="mt-2">
                          {menu.groups.length > 1 ? <p className="lp-sheet-label px-3">{group.label}</p> : null}
                          <ul className="mt-1 flex flex-col">
                            {group.items.map((item) => (
                              <li key={item.href}>
                                <MenuLink item={item} onNavigate={closeAll} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="lp-drawer-actions lp-wrap">
              {visitor ? (
                <>
                  <AccountSummary visitor={visitor} />
                  <Link href="/dashboard" onClick={closeAll} className="lp-btn lp-btn-primary lp-btn-lg w-full">
                    Go to platform
                    <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/signup" onClick={closeAll} className="lp-btn lp-btn-primary lp-btn-lg w-full">
                    Request a demo
                    <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                  </Link>
                  <Link href="/login" onClick={closeAll} className="lp-btn lp-btn-outline lp-btn-lg w-full">
                    Sign in
                  </Link>
                </>
              )}
          </div>
        </nav>
      )}
    </header>
  );
}

/* The mega menu: a full-width panel under the bar. Its link groups sit in
   columns on the left, every link with its icon, title and one line; on
   the right, one next step in the bar's own colours under the rating ribbon.
   Switching menus while one is open swaps the content in place (the key
   remounts it, replaying the CSS entrance). */
const SHEET_CLOSE_MS = 140;

function MenuSheet({ menu, closing, onNavigate }: { menu: NavMenu; closing: boolean; onNavigate: () => void }) {
  const isSingle = menu.groups.length === 1;
  return (
    <div id={menuId(menu.label)} className="lp-sheet site-sheet hidden lg:block" data-state={closing ? "closing" : "open"} inert={closing ? true : undefined}>
      <div key={menu.label} className="lp-wrap site-mega">
        <div className="site-mega-groups">
          {menu.groups.map((group) => {
            // A long group, or the menu's only group, spreads over two columns.
            const isWide = isSingle || group.items.length > 4;
            return (
              <div key={group.label} className="site-mega-group" data-wide={isSingle ? "all" : isWide || undefined}>
                {isSingle ? null : <p className="site-mega-label">{group.label}</p>}
                <ul>
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <MenuLink item={item} onNavigate={onNavigate} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <Link href={menu.feature.href} className="site-mega-feature" onClick={onNavigate}>
          <span className="site-mega-feature-title">{menu.feature.title}</span>
          <span className="site-mega-feature-text">{menu.feature.text}</span>
          <span className="site-mega-feature-cta">
            {menu.feature.cta}
            <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
          </span>
        </Link>
      </div>
    </div>
  );
}

// Product areas take their area colour; every other link's icon is ink.
const PRODUCT_AREA_BY_HREF = new Map<string, string>(PRODUCT_SECTIONS.map((s) => [productHref(s.id), s.id]));

function MenuLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const area = PRODUCT_AREA_BY_HREF.get(item.href);
  return (
    <Link href={item.href} className="lp-menu-item" onClick={onNavigate}>
      <span className={cn("lp-menu-icon", area ? `lp-area-${area}` : "site-mega-icon")} aria-hidden="true">
        <item.icon size={18} />
      </span>
      <span className="min-w-0">
        <span className="lp-menu-title flex flex-wrap items-center gap-x-2 text-sm font-semibold text-lp-ink">
          {item.label}
          {item.feature ? <ComingSoonBadge feature={item.feature} /> : null}
        </span>
        <span className="mt-0.5 block text-sm text-lp-ink-2">{item.description}</span>
      </span>
      <ArrowRight size={16} strokeWidth={2} className="lp-menu-arrow" aria-hidden="true" />
    </Link>
  );
}
