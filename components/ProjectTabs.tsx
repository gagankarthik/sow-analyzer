"use client";

import { useEditionFeature } from "@/lib/govern/queries";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Tab = { label: string; href: string; count?: number };

const NUMBER = new Intl.NumberFormat("en-US");

/** The document's sub-page tabs (UI_SPEC section 3.4): underline tabs in one
 *  row that scroll sideways when they overflow, never wrapping. Rendered
 *  inside the record header band, whose bottom border is the tab baseline. */
export function ProjectTabs({ projectId }: { projectId: string }) {
  const showSow = useEditionFeature("sowDocuments");
  const pathname = usePathname() ?? "";
  const base = `/projects/${projectId}`;
  const tabs: Tab[] = [
    { label: "Overview", href: base },
    { label: showSow ? "SOW" : "Clauses", href: `${base}/sow` },
    { label: "Amendments", href: `${base}/amendments` },
    { label: "Insights", href: `${base}/insights` },
    { label: "Timeline", href: `${base}/timeline` },
    { label: "Audit", href: `${base}/audit` },
    // The route keeps its old `/team` path; what it lists is the contract's parties.
    { label: "Parties", href: `${base}/team` },
    { label: "Documents", href: `${base}/documents` },
  ];

  return (
    <nav
      className="scrollbar-none flex min-w-0 items-end gap-1 overflow-x-auto"
      aria-label="Project sections"
    >
      {tabs.map((t) => {
        const active = t.href === base ? pathname === base : pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 text-sm transition-colors duration-150 max-md:h-11",
              "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--brand-primary-600)]",
              active
                ? "border-[var(--brand-primary-600)] font-medium text-foreground"
                : "border-transparent text-[var(--ink-600)] hover:text-foreground",
            )}
          >
            {t.label}
            {typeof t.count === "number" && (
              <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums text-[var(--ink-600)]">
                {NUMBER.format(t.count)}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
