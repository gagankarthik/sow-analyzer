"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, ArrowRight, CheckCircle2, ChevronLeft, Loader2 } from "@/components/ui/icons";
import { createProject, type LocalProject } from "@/lib/projects-store";
import { cn } from "@/lib/utils";
import { StepCard } from "./StepCard";

const NEW = "new";
const FIELD = "h-11 border-[var(--ink-300)] bg-card text-base placeholder:text-[var(--ink-500)]";
const OPTION =
  "flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--brand-primary-300)]";

export function ProjectStep({
  projects,
  selectedId,
  onContinue,
  onBack,
}: {
  /** The projects the user may upload to (their own, and ones shared with them as editor). */
  projects: LocalProject[];
  /** The project chosen earlier in setup, if it still exists. */
  selectedId?: string;
  onContinue: (projectId: string) => void;
  onBack: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  // The "required" message waits until the user leaves the field or submits.
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const hasProjects = projects.length > 0;
  const fallback = projects.some((p) => p.id === selectedId) ? selectedId! : (projects[0]?.id ?? NEW);
  const choice = picked && (picked === NEW || projects.some((p) => p.id === picked)) ? picked : fallback;
  const creating = choice === NEW;
  const nameError = creating && touched && name.trim().length === 0;

  // Setup moves on only once the server has stored the project (it makes the
  // signed-in user its owner); a refusal is shown here instead.
  async function submit() {
    if (!creating) return onContinue(choice);
    setTouched(true);
    if (name.trim().length === 0 || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const project = await createProject(name, client);
      onContinue(project.id);
    } catch (e) {
      setSaveError(e instanceof Error && e.message ? e.message : "The server did not accept the request.");
      setSaving(false);
    }
  }

  const form = (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="onboarding-project-name" className="block text-sm font-medium text-foreground">
          Project name <span className="text-[var(--danger)]" aria-hidden="true">*</span>
          <span className="sr-only">(required)</span>
        </label>
        <Input
          id="onboarding-project-name"
          required
          maxLength={120}
          autoComplete="off"
          aria-invalid={nameError}
          aria-describedby={nameError ? "onboarding-project-name-error" : "onboarding-project-name-hint"}
          value={name}
          onChange={(e) => { setName(e.target.value); setPicked(NEW); }}
          onBlur={() => setTouched(true)}
          placeholder="e.g. Acme Corp: Master Services 2026"
          className={FIELD}
        />
        {nameError ? (
          <p id="onboarding-project-name-error" role="alert" className="flex items-center gap-1.5 text-xs font-medium text-[var(--danger)]">
            <AlertCircle size={13} className="shrink-0" />Enter a project name.
          </p>
        ) : (
          <p id="onboarding-project-name-hint" className="text-xs text-muted-foreground">
            Use the counterparty and the engagement, so it is easy to find later.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="onboarding-project-client" className="block text-sm font-medium text-foreground">
          Client or counterparty <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Input
          id="onboarding-project-client"
          maxLength={120}
          autoComplete="organization"
          value={client}
          onChange={(e) => { setClient(e.target.value); setPicked(NEW); }}
          placeholder="e.g. Acme Corp"
          className={FIELD}
        />
      </div>

      {saveError && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">The project was not created. {saveError}</span>
        </p>
      )}
    </div>
  );

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <StepCard
        title="Create your first project"
        lead={
          hasProjects
            ? "This step is already done: you have a project you can upload to. Continue with it, pick another, or create a new one."
            : "A project groups a contract with its amendments, so value and risk roll up in one place."
        }
        footer={
          <>
            <Button type="button" variant="outline" size="lg" className="w-full sm:w-auto" onClick={onBack}>
              <ChevronLeft size={15} />Back
            </Button>
            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={saving}>
              {saving
                ? <><Loader2 size={15} className="animate-spin motion-reduce:animate-none" />Creating project</>
                : <>{creating ? "Create project" : "Continue with this project"} <ArrowRight size={15} /></>}
            </Button>
          </>
        }
      >
        {hasProjects ? (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-foreground">Project for this contract</legend>
            <div className="max-h-72 space-y-2 overflow-y-auto p-0.5">
              {projects.map((p) => {
                const on = choice === p.id;
                return (
                  <label key={p.id} className={cn(OPTION, on ? "border-[var(--brand-primary-600)] bg-[var(--brand-primary-50)]" : "border-border hover:bg-[var(--panel)]")}>
                    <input
                      type="radio"
                      name="onboarding-project"
                      checked={on}
                      onChange={() => setPicked(p.id)}
                      className="h-4 w-4 shrink-0 accent-[var(--brand-primary-600)] focus-visible:outline-none"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-semibold text-foreground">{p.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {p.client ? `${p.client} · ` : ""}{p.docIds.length} document{p.docIds.length === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[var(--success)]">
                      <CheckCircle2 size={13} />{p.role === "owner" ? "Yours" : "Shared with you"}
                    </span>
                  </label>
                );
              })}
              <label className={cn(OPTION, creating ? "border-[var(--brand-primary-600)] bg-[var(--brand-primary-50)]" : "border-border hover:bg-[var(--panel)]")}>
                <input
                  type="radio"
                  name="onboarding-project"
                  checked={creating}
                  onChange={() => setPicked(NEW)}
                  className="h-4 w-4 shrink-0 accent-[var(--brand-primary-600)] focus-visible:outline-none"
                />
                <span className="text-base font-semibold text-foreground">Create a new project</span>
              </label>
            </div>
            {creating && <div className="mt-5">{form}</div>}
          </fieldset>
        ) : (
          form
        )}
      </StepCard>
    </form>
  );
}
