"use client";

import { byEdition, noun } from "@/lib/edition-runtime";
import { SonarName } from "@/components/ui/SonarText";
import { useEditionTerms } from "@/lib/govern/queries";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, AlertCircle, Loader2 } from "@/components/ui/icons";
import { createProject, type LocalProject } from "@/lib/projects-store";
import { Panel } from "@/components/ds/Panel";
import { InviteForm } from "@/components/team/InviteForm";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { StepBar, StepFooter, StepTitle } from "@/components/ds/Steps";

/* Three steps: the project (created on "Continue", so the next two have an id
   to work with), then people (optional), then documents (optional). */
const STEPS = [{ label: "Details" }, { label: "Team", optional: true }, { label: "Documents", optional: true }];

const FIELD = "bg-card placeholder:text-[var(--ink-500)]";

export default function NewProjectPage() {
  const terms = useEditionTerms();
  const router = useRouter();
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [creating, setCreating] = useState(false);
  // Show the "required" message only after the user has left the field or tried to submit.
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [project, setProject] = useState<LocalProject | null>(null);
  const finish = () => project && router.push(`/projects/${project.id}`);

  const canCreate = name.trim().length > 0 && !creating;
  const nameError = touched && name.trim().length === 0;

  // The project exists once the server has stored it: only then move on. You
  // become its owner; the server takes that from your session.
  async function create() {
    setTouched(true);
    if (!canCreate) return;
    setCreating(true);
    setError(null);
    try {
      setProject(await createProject(name, client));
      setStep(1);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "The server did not accept the request.");
      setCreating(false);
    }
  }

  return (
    <>
      <PageHeader
        back={{ href: "/projects", label: `Back to ${terms.projects.toLowerCase()}` }}
        title={byEdition("New project", "New engagement")}
      />

      {/* Onboarding: one centred column, a heading per step. */}
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:py-14">
        <StepBar steps={STEPS} step={step} />

        {step === 0 && (
        <form
          noValidate
          onSubmit={(e) => { e.preventDefault(); void create(); }}
          className="mx-auto w-full max-w-lg"
        >
        <StepTitle title={byEdition("Name your project", "Name your engagement")} body="Use the counterparty and the work, so it is easy to find later." />
        <Panel as="h2" title="Details">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="project-name" className="block text-sm font-medium text-foreground">
                {byEdition("Project name", "Engagement name")} <span className="text-[var(--danger)]" aria-hidden="true">*</span>
                <span className="sr-only">(required)</span>
              </label>
              <Input
                id="project-name"
                autoFocus
                required
                aria-invalid={nameError}
                aria-describedby={nameError ? "project-name-error" : "project-name-hint"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="e.g. Acme Corp: Master Services 2026"
                className={FIELD}
              />
              {nameError ? (
                <p id="project-name-error" role="alert" className="flex items-center gap-1.5 text-xs font-medium text-[var(--danger-fg)]">
                  <AlertCircle size={12} aria-hidden className="shrink-0" />{byEdition("Enter a project name.", "Enter an engagement name.")}
                </p>
              ) : (
                <p id="project-name-hint" className="text-xs text-muted-foreground">
                  Use the counterparty and engagement so it&apos;s easy to find later.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="project-client" className="block text-sm font-medium text-foreground">
                Client / counterparty <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="project-client"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="e.g. Acme Corp"
                className={FIELD}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-4 flex items-start gap-2 rounded-md border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">
              <AlertCircle size={16} aria-hidden className="mt-0.5 shrink-0" />
              <span className="min-w-0 break-words">{byEdition("The project was not created.", "The engagement was not created.")} {error}</span>
            </p>
          )}

          <div className="mt-4 flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[var(--ink-600)]">{byEdition("You will own the project.", "You will own the engagement.")} Add people and documents next.</p>
            <Button type="submit" disabled={creating} className="w-full sm:w-auto">
              {creating ? <><Loader2 size={16} aria-hidden className="animate-spin motion-reduce:animate-none" />{byEdition("Creating project…", "Creating engagement…")}</> : <>Create and continue <ArrowRight size={16} aria-hidden /></>}
            </Button>
          </div>
        </Panel>
        </form>
        )}

        {step === 1 && project && (
          <div className="mx-auto w-full max-w-lg">
            <StepTitle title="Invite your team" body={`Who works on ${project.name}? Invite them now, or skip and do it later from the ${noun("project")}'s Team tab.`} />
            <Panel as="h2" title="People">
              <InviteForm projects={[{ id: project.id, name: project.name }]} lockedProjectId={project.id} />
            </Panel>
            <StepFooter onSkip={() => setStep(2)} onNext={() => setStep(2)} next="Continue" />
          </div>
        )}

        {step === 2 && project && (
          <div className="w-full">
            <StepTitle title="Add documents" body={<>Upload the agreement and any amendments. <SonarName /> reads each one as it lands.</>} />
            <Panel as="h2" title="Documents">
              <UploadDropzone projectId={project.id} compact />
            </Panel>
            <StepFooter onSkip={finish} onNext={finish} next={byEdition("Open project", "Open engagement")} />
          </div>
        )}
      </div>
    </>
  );
}
