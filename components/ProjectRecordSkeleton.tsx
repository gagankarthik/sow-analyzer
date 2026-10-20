"use client";

// The document record pages (/projects/[id] and its sub-pages) before their
// data: the ProjectHeader band (breadcrumb, H1 + "Project", highlights, Ask
// Sonar + Actions, the sub-page tabs with the right one active), then the
// body shape of that sub-page. The route's loading.tsx picks the sub-page
// from the URL; each page passes its own section on first load.

import { usePathname } from "next/navigation";
import { useEditionFeature } from "@/lib/govern/queries";
import { cn } from "@/lib/utils";
import { PROJECT_SECTIONS as SECTIONS, projectSectionFromPath, type ProjectSection } from "@/lib/project-section";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartSkeleton, PanelSkeleton, PathSkeleton, RecordHeaderSkeleton, RecordSidebarSkeleton, SkeletonLine, SkeletonRegion,
  SummaryTilesSkeleton,
} from "@/components/ds/skeletons";

/** The route-level shell: reads the sub-page from the URL. */
export function ProjectRouteSkeleton() {
  const pathname = usePathname() ?? "";
  return <ProjectRecordSkeleton section={projectSectionFromPath(pathname)} />;
}

export function ProjectRecordSkeleton({ section }: { section: ProjectSection }) {
  const showSow = useEditionFeature("sowDocuments");
  const labels: Record<Exclude<ProjectSection, "workspace">, string> = {
    overview: "Overview", sow: showSow ? "SOW" : "Clauses", amendments: "Amendments", insights: "Insights",
    timeline: "Timeline", audit: "Audit", team: "Parties", documents: "Documents",
  };
  const workspace = section === "workspace";
  return (
    <SkeletonRegion label={workspace ? "the project" : "the document"}>
      <RecordHeaderSkeleton objectTag="Project" actions={2} highlights={workspace ? 4 : 5}>
        {!workspace && (
          <div className="-mb-4">
            <div aria-hidden className="scrollbar-none flex min-w-0 items-end gap-1 overflow-hidden">
              {SECTIONS.map((s) => (
                <span
                  key={s.id}
                  className={cn(
                    "inline-flex h-10 shrink-0 items-center whitespace-nowrap border-b-2 px-2.5 text-sm max-md:h-11",
                    s.id === section ? "border-[var(--brand-primary-600)] font-medium text-foreground" : "border-transparent text-[var(--ink-600)]",
                  )}
                >
                  {labels[s.id]}
                </span>
              ))}
            </div>
          </div>
        )}
      </RecordHeaderSkeleton>
      <ProjectBodySkeleton section={section} />
    </SkeletonRegion>
  );
}

function ProjectBodySkeleton({ section }: { section: ProjectSection }) {
  if (section === "overview") {
    return (
      <div className="app-container flex flex-col gap-6 py-5 md:py-6">
        <PathSkeleton steps={5} />
        <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <PanelSkeleton title="Sonar summary" padded>
              <TextLines lines={3} />
            </PanelSkeleton>
            <PanelSkeleton title="Clauses that need attention" rows={4} />
          </div>
          <RecordSidebarSkeleton rows={6} />
        </div>
      </div>
    );
  }
  if (section === "workspace") {
    return (
      <div className="app-container flex flex-col gap-6 py-5 md:py-6">
        <SummaryTilesSkeleton count={4} />
        <PanelSkeleton rows={5} />
        <PanelSkeleton rows={3} />
      </div>
    );
  }
  if (section === "insights") {
    return (
      <div className="app-container flex flex-col gap-6 py-5 md:py-6">
        <SummaryTilesSkeleton count={4} />
        <PanelSkeleton padded actions={false}><ChartSkeleton height="h-40" bars={5} /></PanelSkeleton>
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
          <PanelSkeleton rows={4} />
          <PanelSkeleton padded actions={false}><ChartSkeleton height="h-48" /></PanelSkeleton>
        </div>
      </div>
    );
  }
  if (section === "audit") {
    return (
      <div className="app-container flex flex-col gap-6 py-5 md:py-6">
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12">
          <PanelSkeleton className="lg:col-span-4" padded actions={false}><TextLines lines={4} /></PanelSkeleton>
          <PanelSkeleton className="lg:col-span-8" padded actions={false}><TextLines lines={4} /></PanelSkeleton>
        </div>
        <PanelSkeleton rows={4} />
      </div>
    );
  }
  // sow, amendments, timeline, team, documents: an 8 + 4 split.
  const mainRows = section === "timeline" ? 5 : 4;
  return (
    <div className={cn("app-container py-5 md:py-6", section === "sow" && "flex flex-col gap-6")}>
      {section === "sow" && <SummaryTilesSkeleton count={4} />}
      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-4 md:gap-6 lg:col-span-8">
          {section === "documents" && <Skeleton className="h-10 w-full" />}
          <PanelSkeleton rows={mainRows} />
          <PanelSkeleton rows={3} />
        </div>
        <div className="grid min-w-0 grid-cols-1 content-start gap-4 sm:grid-cols-2 md:gap-6 lg:col-span-4 lg:grid-cols-1">
          <PanelSkeleton rows={4} row="key-value" actions={false} />
          <PanelSkeleton padded actions={false}><TextLines lines={3} /></PanelSkeleton>
        </div>
      </div>
    </div>
  );
}

function TextLines({ lines }: { lines: number }) {
  return (
    <div aria-hidden className="flex flex-col">
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonLine key={i} text="text-sm leading-relaxed" width={i === lines - 1 ? "w-3/5" : "w-full"} />
      ))}
    </div>
  );
}
