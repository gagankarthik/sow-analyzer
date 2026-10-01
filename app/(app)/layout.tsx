import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import { NOINDEX } from "@/lib/seo";

// The signed-in workspace is private: keep every route under it out of search.
export const metadata: Metadata = { robots: NOINDEX };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
