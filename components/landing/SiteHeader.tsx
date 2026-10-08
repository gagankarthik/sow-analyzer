"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ArrowRight, ChevronDown, Menu, X } from "@/components/ui/icons";
import { Logo } from "@/components/landing/primitives";
import { NAV_MENUS, PRODUCT_SECTIONS, landingHref, type NavItem, type NavMenu } from "@/components/landing/site-nav";
import { IconBadge } from "@/components/landing/IconBadge";
import { ComingSoonBadge } from "@/components/landing/ComingSoon";

/* Public site header: the mark on the left, the three menus centred, the
   actions on the right. A menu opens as a full-width sheet under the bar,
   on hover or click; Escape, an outside click or leaving the header closes
   it. On narrow screens the menus become an accordion in a drawer. */

const MOBILE_NAV_ID = "lp-mobile-nav";
const CLOSE_DELAY_MS = 160;

const menuId = (label: string) => `lp-menu-${label.toLowerCase()}`;

export function SiteHeader() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { status } = useAuth();
  const isSignedIn = status === "authenticated";

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

  return (
    <header
      ref={headerRef}
      className="lp-header sticky top-0 z-50"
      onMouseLeave={closeSoon}
      onMouseEnter={() => clearTimeout(closeTimer.current)}
      onBlur={closeOnBlur}
    >
      <div className="lp-wrap lp-header-bar">
        <Link href="/" aria-label="Blue-IQ Govern home" className="flex shrink-0 items-center gap-3" onClick={closeAll}>
          <Logo height={28} priority />
          <span className="lp-product-tag">Govern</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center justify-center gap-1 lg:flex">
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

        <div className="flex items-center justify-end gap-4">
          {isSignedIn ? (
            <Link href="/home" className="lp-btn lp-btn-primary lp-btn-sm hidden sm:inline-flex" onClick={closeAll}>
              Open Govern
            </Link>
          ) : (
            <>
              <Link href="/login" className="lp-navlink hidden font-medium sm:inline" onClick={closeAll}>
                Log in
              </Link>
              <Link href="/signup" className="lp-btn lp-btn-primary lp-btn-sm hidden sm:inline-flex" onClick={closeAll}>
                Request a demo
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

      {activeMenu ? <MenuSheet menu={activeMenu} onNavigate={closeAll} /> : null}

      {isDrawerOpen && (
        <nav id={MOBILE_NAV_ID} aria-label="Primary" className="lp-drawer lg:hidden">
          <div className="lp-wrap py-2">
            {NAV_MENUS.map((menu) => {
              const isOpen = openSection === menu.label;
              const sectionId = `lp-mobile-${menu.label.toLowerCase()}`;
              return (
                <div key={menu.label} className="border-b border-lp-line">
                  <button
                    type="button"
                    className="flex h-14 w-full items-center justify-between font-semibold text-lp-ink"
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
                      <Link href={menu.foot.href} className="lp-sheet-foot mt-2 px-3" onClick={closeAll}>
                        {menu.foot.label}
                        <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="flex gap-3 py-5">
              {isSignedIn ? (
                <Link href="/home" onClick={closeAll} className="lp-btn lp-btn-primary flex-1">
                  Open Govern
                </Link>
              ) : (
                <>
                  <Link href="/login" onClick={closeAll} className="lp-btn lp-btn-outline flex-1">
                    Log in
                  </Link>
                  <Link href="/signup" onClick={closeAll} className="lp-btn lp-btn-primary flex-1">
                    Request a demo
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}

/* The full-width sheet: what the menu covers on the left, its links
   grouped on the right. */
function MenuSheet({ menu, onNavigate }: { menu: NavMenu; onNavigate: () => void }) {
  const isGrouped = menu.groups.length > 1;
  return (
    <div id={menuId(menu.label)} className="lp-sheet hidden lg:block">
      <div className="lp-wrap lp-sheet-grid">
        <div>
          <p className="lp-sheet-title">{menu.label}</p>
          <p className="mt-2 text-sm text-lp-ink-2">{menu.intro}</p>
          <Link href={menu.foot.href} className="lp-sheet-foot mt-5" onClick={onNavigate}>
            {menu.foot.label}
            <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
        <div className={isGrouped ? "grid grid-cols-2 gap-8" : undefined}>
          {menu.groups.map((group) => (
            <div key={group.label}>
              {isGrouped ? <p className="lp-sheet-label px-3">{group.label}</p> : null}
              <ul className={isGrouped ? "mt-2 grid gap-1" : "grid grid-cols-2 gap-1"}>
                {group.items.map((item) => (
                  <li key={item.href}>
                    <MenuLink item={item} onNavigate={onNavigate} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Only product areas carry an icon (the area badge); teams, industries and
// resources are words.
const PRODUCT_AREA_BY_HREF = new Map<string, string>(PRODUCT_SECTIONS.map((s) => [landingHref(s.id), s.id]));

function MenuLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const area = PRODUCT_AREA_BY_HREF.get(item.href);
  return (
    <Link href={item.href} className="lp-menu-item" onClick={onNavigate}>
      {area ? <IconBadge icon={item.icon} area={area} /> : null}
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-lp-ink">
          {item.label}
          {item.feature ? <ComingSoonBadge feature={item.feature} /> : null}
        </span>
        <span className="mt-0.5 block text-sm text-lp-ink-2">{item.description}</span>
      </span>
    </Link>
  );
}
