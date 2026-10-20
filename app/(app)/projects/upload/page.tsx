"use client";

import { byEdition, noun } from "@/lib/edition-runtime";
import { useEditionTerms } from "@/lib/govern/queries";
import { useCallback, useId, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "@/components/ui/icons";
import { can, projectOwnerEmail, refreshProjects, useProjects, useProjectsSync } from "@/lib/projects-store";
import { ROLE_META } from "@/components/team/roles";
import { ContractIntakePanel } from "@/components/upload/ContractIntakePanel";
import { Panel } from "@/components/ds/Panel";
import { EMPTY_INTAKE, intakePatch, type IntakeValues } from "@/components/upload/contract-intake";

const NO_PROJECT = "none";

/** `?project=<id>` preselects a project (read once; the picker renders client-side only). */
function projectFromUrl(): string {
  if (typeof window === "undefined") return NO_PROJECT;
  return new URLSearchParams(window.location.search).get("project") || NO_PROJECT;
}

export default function UploadPage() {
  const terms = useEditionTerms();
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
        title="Upload a contract"
      />

      <div className="app-container app-page">
        <div className="flex max-w-3xl flex-col gap-6">
          <Panel as="h2" title={noun("Project")}>
            <label htmlFor={pickerId} className="sr-only">{noun("Project")}</label>
            <Select value={choice} onValueChange={setPicked} disabled={loading}>
              <SelectTrigger id={pickerId} className="w-full sm:max-w-sm">
                <SelectValue placeholder={loading ? byEdition("Loading your projects…", "Loading your engagements…") : undefined} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROJECT}>{byEdition("No project", "No engagement")}</SelectItem>
                {uploadable.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name || byEdition("Untitled project", "Untitled engagement")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs leading-relaxed text-[var(--ink-600)]">
              {loading
                ? byEdition("Loading the projects you can upload to…", "Loading the engagements you can upload to…")
                : project
                  ? `Files you add next go into ${project.name} and are shared with everyone on it.${owner ? ` It is owned by ${owner}; you are ${ROLE_META[project.role ?? "viewer"].label.toLowerCase()}.` : ""}`
                  : byEdition("Files you add next belong to no project. Only you can see them until you file them in one.", "Files you add next belong to no engagement. Only you can see them until you file them in one.")}
              {!loading && readOnlyCount > 0 && (
                <> {readOnlyCount === 1 ? `One ${noun("project")} is` : `${readOnlyCount} ${noun("projects")} are`} not listed because you are a viewer there.</>
              )}
            </p>
            {failed && (
              <div role="alert" className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-[var(--warning-border)] bg-[var(--warning-soft)] px-3 py-2">
                <AlertTriangle size={16} aria-hidden className="shrink-0 text-[var(--warning-fg)]" />
                <p className="min-w-0 flex-1 basis-48 break-words text-sm text-foreground">
                  {byEdition("Your projects could not be loaded, so only “No project” is offered.", "Your engagements could not be loaded, so only “No engagement” is offered.")}{sync.error ? ` ${sync.error}` : ""}
                </p>
                <Button variant="outline" onClick={() => void refreshProjects()}>
                  <RefreshCw size={16} aria-hidden />Try again
                </Button>
              </div>
            )}
          </Panel>

          <ContractIntakePanel values={intake} onChange={setIntake} lastApplied={lastApplied} />

          <UploadDropzone projectId={project?.id} governIntake={governIntake} />
        </div>
      </div>
    </>
  );
}
