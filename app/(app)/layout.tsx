import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import { AppProviders } from "@/components/providers/AppProviders";
import { NOINDEX } from "@/lib/seo";

// The signed-in workspace is private: keep every route under it out of search.
export const metadata: Metadata = { robots: NOINDEX };

// Runs before first paint: mirror the persisted rail state (same key as
// components/shell/Sidebar.tsx) onto <html data-sidebar>, which the sidebar's
// CSS reads, so a collapsed rail never flashes open. The root <html> carries
// suppressHydrationWarning for this attribute.
const SIDEBAR_PREPAINT = `try{document.documentElement.dataset.sidebar=localStorage.getItem("sidebar:collapsed")==="1"?"collapsed":"expanded"}catch(e){}`;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SIDEBAR_PREPAINT }} />
      <AppProviders>
        <AppShell>{children}</AppShell>
      </AppProviders>
    </>
  );
}
