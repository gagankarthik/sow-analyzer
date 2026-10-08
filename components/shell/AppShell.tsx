"use client";

import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { CopilotPanel } from "./CopilotPanel";
import { useUIStore } from "@/lib/stores/ui";
import { hydrateProjects, startProjectsSync } from "@/lib/projects-store";
import { useAuth } from "@/components/auth/AuthProvider";
import { clearSessionCookie } from "@/lib/auth/session";
import { useIdleSignOut } from "@/lib/auth/use-idle-sign-out";

export function AppShell({ children }: { children: React.ReactNode }) {
  const copilotOpen = useUIStore((s) => s.copilotOpen);
  const toggleCopilot = useUIStore((s) => s.toggleCopilot);
  const setCopilotOpen = useUIStore((s) => s.setCopilotOpen);
  const [mobileNav, setMobileNav] = useState(false);

  // Load the projects the signed-in user can see (their own and the ones shared
  // with them), then keep them fresh: re-read on window focus, on reconnect and
  // once a minute, so a project created, shared or changed on another device or
  // by a teammate appears here. Keyed on the user, so signing in as someone else
  // in the same tab never shows the previous person's list.
  const { status, user, signOut } = useAuth();
  const userId = user?.sub;

  // Sign out this device after 30 minutes with no activity in any tab (warns
  // at 28). Other devices keep their own sessions.
  const idleSignOut = useCallback(() => signOut(), [signOut]);
  useIdleSignOut({ enabled: status === "authenticated", onTimeout: idleSignOut });
  useEffect(() => {
    if (status !== "authenticated") return;
    void hydrateProjects(userId);
    return startProjectsSync();
  }, [status, userId]);

  // Second line behind the proxy: no Cognito session means no workspace. The
  // stale cookie is dropped first, or the proxy would bounce /login straight
  // back here.
  useEffect(() => {
    if (status !== "unauthenticated") return;
    clearSessionCookie();
    const back = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`/login?redirect=${back}`);
  }, [status]);

  useEffect(() => {
    if (mobileNav) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [mobileNav]);

  return (
    <div className="flex w-full min-h-screen bg-background">
      {/* Keyboard users can jump straight to content, bypassing the nav (WCAG 2.4.1). */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-[var(--brand-primary-600)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]"
      >
        Skip to main content
      </a>
      <Sidebar
        mobileOpen={mobileNav}
        onMobileClose={() => setMobileNav(false)}
        onOpenCopilot={toggleCopilot}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          onCopilotToggle={toggleCopilot}
          onMenuClick={() => setMobileNav(true)}
        />
        <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 focus:outline-none">{children}</main>
      </div>
      <CopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} />
    </div>
  );
}
