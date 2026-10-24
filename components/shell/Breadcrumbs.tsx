"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "@/components/ui/icons";
import { useProjects } from "@/lib/projects-store";

/* ──────────────────────────────────────────────── */
/*  Breadcrumbs                                     */
/* ──────────────────────────────────────────────── */

/** Section names for the first path segment. */
const SECTION_LABEL: Record<string, string> = {
  home: "Dashboard", dashboard: "Dashboard", contracts: "Contracts", workflow: "Contracts", obligations: "Obligations",
  renewals: "Renewals", reports: "Reports", insights: "Insights", library: "Clause library",
  projects: "Projects", settings: "Settings", profile: "Profile", help: "Help", draft: "Draft SOW",
  notifications: "Notifications", design: "Design system", sonar: "Sonar",
};

/** Names for known second-level pages. */
const PAGE_LABEL: Record<string, string> = {
  documents: "Documents", amendments: "Amendments", insights: "Insights", team: "Team",
  timeline: "Timeline", audit: "Audit", sow: "SOW", signing: "E-signature", upload: "Upload", new: "New",
  bottlenecks: "Bottlenecks", value: "Value", capture: "Capture", trends: "Trends",
};

function titleCase(seg: string): string {
  return seg.replace(/[-_]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** Where you are, as Plane shows it: section › item › page. Project ids
 *  read as the project's name; other ids as the section's item. */
export function Breadcrumbs({ current }: { current?: string } = {}) {
  const pathname = usePathname() ?? "";
  const projects = useProjects();
  const segs = pathname.split("/").filter(Boolean);
  if (segs.length === 0) return null;
  const crumbs: { label: string; href: string }[] = [];
  const section = segs[0];
  crumbs.push({ label: SECTION_LABEL[section] ?? titleCase(section), href: section === "workflow" ? "/contracts" : `/${section}` });
  if (section === "workflow") crumbs.push({ label: "Board", href: "/workflow" });
  let href = `/${section}`;
  segs.slice(1).forEach((seg, i) => {
    href += `/${seg}`;
    let label = PAGE_LABEL[seg];
    if (!label && i === 0 && section === "projects") label = projects.find((p) => p.id === seg)?.name ?? "Project";
    if (!label && i === 0 && section === "contracts") label = "Contract";
    if (!label && i === 1 && segs[2] === undefined && section === "contracts") label = "E-signature";
    crumbs.push({ label: label ?? titleCase(seg), href });
  });
  if (current) crumbs[crumbs.length - 1] = { ...crumbs[crumbs.length - 1], label: current };
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-0.5 text-[13px] font-medium">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.href + i} className="flex min-w-0 items-center gap-1">
              {i > 0 && <ChevronRight size={12} aria-hidden className="shrink-0 text-[var(--ink-500)]" />}
              {last ? (
                <span aria-current="page" className="truncate px-1 text-[var(--ink-900)]">{c.label}</span>
              ) : (
                <Link href={c.href} className="inline-flex h-6 max-w-[150px] items-center truncate rounded-md px-1 text-[var(--ink-700)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--ink-900)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)]">
                  {c.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
