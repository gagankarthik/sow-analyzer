"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Tab = { label: string; href: string; count?: number; badge?: React.ReactNode };

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname() ?? "";
  const base = `/projects/${projectId}`;
  const tabs: Tab[] = [
    { label: "Overview", href: base },
    { label: "SOW", href: `${base}/sow` },
    { label: "Amendments", href: `${base}/amendments` },
    { label: "Insights", href: `${base}/insights`, badge: <Badge variant="ai" size="sm">AI</Badge> },
    { label: "Timeline", href: `${base}/timeline` },
    { label: "Audit", href: `${base}/audit` },
    { label: "Team", href: `${base}/team` },
    { label: "Documents", href: `${base}/documents` },
  ];

  return (
    <div className="border-b border-border bg-card">
      <div className="app-container">
        <nav
          className="flex items-center gap-6 overflow-x-auto -mb-px scrollbar-none"
          aria-label="Project sections"
        >
          {tabs.map((t) => {
            const active = t.href === base ? pathname === base : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                data-active={active || undefined}
                className={cn(
                  "h-9 px-1 -mb-px inline-flex items-center gap-1.5 text-[13px] font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap",
                  "data-[active=true]:text-foreground data-[active=true]:border-[var(--brand-primary-600)]",
                )}
              >
                {t.label}
                {typeof t.count === "number" && (
                  <span className="numeric text-[10.5px] tabular-nums font-mono text-muted-foreground/70 ml-0.5">
                    {t.count}
                  </span>
                )}
                {t.badge}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
