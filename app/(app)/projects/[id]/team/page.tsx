"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProjectHeader } from "@/components/ProjectHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SonarMark } from "@/components/ui/SonarMark";
import { Mail, Building2, Users, Files } from "@/components/ui/icons";
import { apiDocToProject, errorStatus } from "@/lib/api";
import { useDocument } from "@/lib/queries/documents";

export default function TeamPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();

  const { data: detail, isLoading, isError, error } = useDocument(id);

  if (isLoading) return <TeamSkeleton />;
  if (isError && errorStatus(error) === 404) return <NotFound />;
  if (isError) {
    return (
      <div className="app-container py-20 flex flex-col items-center text-center">
        <p className="text-[14px] text-[var(--danger)]">
          {error instanceof Error ? error.message : "Failed to load document"}
        </p>
        <Button variant="outline" size="md" className="mt-4" onClick={() => router.refresh()}>
          Try again
        </Button>
      </div>
    );
  }
  if (!detail) return null;

  const project = apiDocToProject(detail.document);
  const doc = detail.document;
  const parties = doc.parties ?? [];
  const isReady = doc.status === "READY";

  return (
    <>
      <ProjectHeader project={project as Parameters<typeof ProjectHeader>[0]["project"]} />

      <div className="app-container py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <main className="lg:col-span-8 space-y-6">
            {/* Header */}
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-[18px] font-semibold tracking-tight text-foreground">
                  Document parties
                </h2>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Organisations and signatories Sonar identified on this engagement.
                </p>
              </div>
            </div>

            {/* Parties grid */}
            {parties.length > 0 ? (
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {parties.map((party, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-card p-5 shadow-xs flex items-start gap-3"
                  >
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)] shrink-0">
                      <Building2 size={16} strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-foreground truncate">
                        {party}
                      </div>
                      <div className="text-[11.5px] text-muted-foreground mt-0.5">
                        {i === 0 ? "Primary party" : "Counterparty"}
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            ) : (
              <section className="rounded-xl border border-dashed border-border bg-card p-12 shadow-xs flex flex-col items-center text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
                  <Users size={22} strokeWidth={1.5} />
                </span>
                <p className="text-[13.5px] font-semibold text-foreground mb-1">
                  No parties extracted yet
                </p>
                <p className="text-[12.5px] text-muted-foreground max-w-sm">
                  {isReady
                    ? "Sonar did not identify any named parties in this document. They will appear here automatically if a future version includes them."
                    : "Parties will appear here once Sonar finishes processing and extracts them from the document."}
                </p>
              </section>
            )}
          </main>

          <aside className="lg:col-span-4 space-y-5">
            {/* Sonar team read */}
            <div className="rounded-xl border border-[var(--ai-border)] bg-[var(--ai-surface)]/60 p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <SonarMark size="sm" />
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ai-ink)]">
                  Sonar · team read
                </span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-foreground">
                Ask Sonar who the key stakeholders are for this engagement.
              </p>
              <Button variant="ai" size="sm" className="mt-4 w-full">
                Ask Sonar
              </Button>
            </div>

            {/* Owner */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">
                Owner
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground text-[12px] font-semibold">
                  {project.owner.initials}
                </span>
                <div>
                  <div className="text-[13.5px] font-semibold text-foreground">
                    {project.owner.name}
                  </div>
                  <div className="text-[11.5px] text-muted-foreground">
                    {project.owner.role}
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full">
                <Mail size={12} /> Send message
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

function NotFound() {
  return (
    <div className="app-container py-20 flex flex-col items-center text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-5">
        <Files size={24} strokeWidth={1.5} />
      </span>
      <h1 className="text-foreground text-[28px] font-bold tracking-tight">Project not found</h1>
      <p className="mt-2 text-[14px] text-muted-foreground max-w-sm">
        This engagement may have been archived, or the link is out of date.
      </p>
      <Link href="/projects" className="mt-6 inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-[13px] font-semibold transition-colors">
        Back to projects
      </Link>
    </div>
  );
}

function TeamSkeleton() {
  return (
    <>
      <div className="border-b border-border bg-card">
        <div className="app-container pt-5 md:pt-6 pb-4 space-y-3">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <div className="border-b border-border bg-card">
        <div className="app-container">
          <div className="flex items-center gap-6 h-9">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-16" />
            ))}
          </div>
        </div>
      </div>
      <div className="app-container py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            <Skeleton className="h-10 w-1/2" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="lg:col-span-4 space-y-5">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
          </div>
        </div>
      </div>
    </>
  );
}
