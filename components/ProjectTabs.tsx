"use client";

import { useEditionFeature } from "@/lib/govern/queries";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Tab = { label: string; href: string; count?: number; badge?: React.ReactNode };

export function ProjectTabs({ projectId }: { projectId: string }) {
  const showSow = useEditionFeature("sowDocuments");
  const pathname = usePathname() ?? "";
  const base = `/projects/${projectId}`;
  const tabs: Tab[] = [
    { label: "Overview", href: base },
    { label: showSow ? "SOW" : "Clauses", href: `${base}/sow` },
    { label: "Amendments", href: `${base}/amendments` },
    { label: "Insights", href: `${base}/insights`, badge: <Badge variant="ai" size="sm" className="text-xs">AI</Badge> },
    { label: "Timeline", href: `${base}/timeline` },
    { label: "Audit", href: `${base}/audit` },
    // The route keeps its old `/team` path; what it lists is the contract's parties.
    { label: "Parties", href: `${base}/team` },
    { label: "Documents", href: `${base}/documents` },
  ];

  return (
    // Rendered inside ProjectHeader, whose bottom border is the tab baseline.
    <div className="app-container">
        {/* Scrolls sideways on narrow screens; trailing padding keeps the last tab clear of the edge. */}
        <nav
          className="-mb-px flex items-center gap-5 overflow-x-auto pr-4 scrollbar-none md:gap-6"
          aria-label="Project sections"
        >
          {tabs.map((t) => {
            const active = t.href === base ? pathname === base : pathname === t.href || pathname.startsWith(t.href + "/");
            return (
              <Link
                key={t.href}
                href={t.href}
                data-active={active || undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-1 text-base font-medium text-[var(--ink-600)] transition-colors hover:border-[var(--ink-300)] hover:text-foreground",
                  "rounded-t-md outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  "data-[active=true]:border-[var(--brand-primary-600)] data-[active=true]:font-semibold data-[active=true]:text-[var(--brand-primary-700)]",
                )}
              >
                {t.label}
                {typeof t.count === "number" && (
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums text-[var(--ink-600)]">
                    {t.count}
                  </span>
                )}
                {t.badge}
              </Link>
            );
          })}
        </nav>
    </div>
  );
}
