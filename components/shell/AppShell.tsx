"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { CommandPalette } from "./CommandPalette";
import { CopilotPanel } from "./CopilotPanel";
import { recordRecentDoc } from "@/lib/recent";
import { useUIStore } from "@/lib/stores/ui";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [paletteOpen, setPaletteOpen] = useState(false);
  const copilotOpen = useUIStore((s) => s.copilotOpen);
  const toggleCopilot = useUIStore((s) => s.toggleCopilot);
  const setCopilotOpen = useUIStore((s) => s.setCopilotOpen);
  const [mobileNav, setMobileNav] = useState(false);

  // Global keyboard shortcuts: ⌘K palette, ⌘/ copilot, and the "go to"
  // sequences (g then d / p) à la Linear.
  useEffect(() => {
    let lastG = 0;
    function isTyping() {
      const el = document.activeElement;
      return (
        el instanceof HTMLElement &&
        (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)
      );
    }
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (mod && e.key === "/") {
        e.preventDefault();
        toggleCopilot();
        return;
      }
      if (mod || e.altKey || isTyping()) return;

      // Sequence: "g" primes, then "d"/"p"/"l"/"w" within 800ms navigates.
      const now = Date.now();
      if (e.key.toLowerCase() === "g") {
        lastG = now;
        return;
      }
      if (now - lastG < 800) {
        const map: Record<string, string> = { d: "/dashboard", p: "/projects", l: "/library", w: "/workflow" };
        const dest = map[e.key.toLowerCase()];
        if (dest) {
          e.preventDefault();
          router.push(dest);
        }
        lastG = 0;
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router, toggleCopilot]);

  // Record opened documents for the palette's "Recent" group.
  useEffect(() => {
    const m = /^\/projects\/([^/]+)/.exec(pathname);
    if (m && m[1] !== "new") recordRecentDoc(m[1]);
  }, [pathname]);

  useEffect(() => {
    if (mobileNav) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [mobileNav]);

  return (
    <div className="sf-app flex w-full min-h-screen bg-background">
      {/* Keyboard users can jump straight to content, bypassing the nav (WCAG 2.4.1). */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-[var(--brand-primary-600)] focus:px-4 focus:py-2 focus:text-[13px] focus:font-semibold focus:text-white focus:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]"
      >
        Skip to main content
      </a>
      <Sidebar
        mobileOpen={mobileNav}
        onMobileClose={() => setMobileNav(false)}
        onOpenSearch={() => setPaletteOpen(true)}
        onOpenCopilot={toggleCopilot}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          onCommandOpen={() => setPaletteOpen(true)}
          onCopilotToggle={toggleCopilot}
          onMenuClick={() => setMobileNav(true)}
        />
        <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 focus:outline-none">{children}</main>
      </div>
      <CopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
