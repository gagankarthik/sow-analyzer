"use client";

import { useEditionFeature, useEditionTerms } from "@/lib/govern/queries";
import { useCallback, useId, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "@/components/ui/icons";
import { can, projectOwnerEmail, refreshProjects, useProjects, useProjectsSync } from "@/lib/projects-store";
import { ROLE_META } from "@/components/team/roles";
import { ContractIntakePanel } from "@/components/upload/ContractIntakePanel";
import { EMPTY_INTAKE, intakePatch, type IntakeValues } from "@/components/upload/contract-intake";

const NO_PROJECT = "none";

/** `?project=<id>` preselects a project (read once; the picker renders client-side only). */
function projectFromUrl(): string {
  if (typeof window === "undefined") return NO_PROJECT;
  return new URLSearchParams(window.location.search).get("project") || NO_PROJECT;
}

export default function UploadPage() {
  const terms = useEditionTerms();
  const showSow = useEditionFeature("sowDocuments");
  const pickerId = useId();
  const projects = useProjects();
  const sync = useProjectsSync();
  const loading = sync.status === "idle" || sync.status === "loading";
  const failed = sync.status === "error";

  // Only projects the signed-in user may upload to (owner or editor). The
  // server checks again when the upload starts.
  const uploadable = useMemo(
    () => projects.filter((p) => can(p.role, "upload")).sort((a, b) => a.name.localeCompare(b.name)),
    [projects],
  );
  const readOnlyCount = projects.length - uploadable.length;

  const [picked, setPicked] = useState<string>(projectFromUrl);
  // A project that was deleted, or where the role changed, falls back to "No project".
  const choice = uploadable.some((p) => p.id === picked) ? picked : NO_PROJECT;
  const project = uploadable.find((p) => p.id === choice);
  const owner = project && project.role !== "owner" ? projectOwnerEmail(project) : undefined;

  // Optional contract details for the next single file (Govern intake). Once a
  // file takes them the form clears, so they never leak onto the next upload.
  const [intake, setIntake] = useState<IntakeValues>(EMPTY_INTAKE);
  const [lastApplied, setLastApplied] = useState<string | null>(null);
  const details = useMemo(() => intakePatch(intake), [intake]);
  const onDetailsApplied = useCallback((fileName: string) => {
    setLastApplied(fileName);
    setIntake(EMPTY_INTAKE);
  }, []);
  const governIntake = useMemo(() => ({ details, onDetailsApplied }), [details, onDetailsApplied]);

  return (
    <>
      <PageHeader
        back={{ href: "/projects", label: `Back to ${terms.projects.toLowerCase()}` }}
        title="Add a document"
        subtitle={showSow ? "Upload a SOW, MSA or amendment for analysis." : "Upload an agreement: Sonar reads it and checks it against your review matrix."}
      />

      <div className="app-container py-6 md:py-8">
        <div className="max-w-3xl space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <label htmlFor={pickerId} className="mb-1.5 block text-sm font-medium text-foreground">Project</label>
            <Select value={choice} onValueChange={setPicked} disabled={loading}>
              <SelectTrigger id={pickerId} className="w-full sm:max-w-sm">
                <SelectValue placeholder={loading ? "Loading your projects" : undefined} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROJECT}>No project</SelectItem>
                {uploadable.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name || "Untitled project"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {loading
                ? "Loading the projects you can upload to."
                : project
                  ? `Files you add next go into ${project.name} and are shared with everyone on it.${owner ? ` It is owned by ${owner}; you are ${ROLE_META[project.role ?? "viewer"].label.toLowerCase()}.` : ""}`
                  : "Files you add next belong to no project. Only you can see them until you file them in one."}
              {!loading && readOnlyCount > 0 && (
                <> {readOnlyCount === 1 ? "One project is" : `${readOnlyCount} projects are`} not listed because you are a viewer there.</>
              )}
            </p>
            {failed && (
              <div role="alert" className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-3 py-2.5">
                <AlertTriangle size={15} className="shrink-0 text-[var(--warning)]" />
                <p className="min-w-0 flex-1 basis-48 break-words text-sm text-foreground">
                  Your projects could not be loaded, so only &ldquo;No project&rdquo; is offered.{sync.error ? ` ${sync.error}` : ""}
                </p>
                <Button variant="outline" className="h-10 md:h-9" onClick={() => void refreshProjects()}>
                  <RefreshCw size={14} />Try again
                </Button>
              </div>
            )}
          </div>

          <ContractIntakePanel values={intake} onChange={setIntake} lastApplied={lastApplied} />

          <UploadDropzone projectId={project?.id} governIntake={governIntake} />
        </div>
      </div>
    </>
  );
}
