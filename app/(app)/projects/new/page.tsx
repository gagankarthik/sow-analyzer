"use client";

import { byEdition } from "@/lib/edition-runtime";
import { useEditionTerms } from "@/lib/govern/queries";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, AlertCircle, Loader2 } from "@/components/ui/icons";
import { createProject } from "@/lib/projects-store";

const FIELD =
  "h-11 border-[var(--ink-300)] bg-card text-base placeholder:text-[var(--ink-500)]";

export default function NewProjectPage() {
  const terms = useEditionTerms();
  const router = useRouter();
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [creating, setCreating] = useState(false);
  // Show the "required" message only after the user has left the field or tried to submit.
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const project = await createProject(name, client);
      router.push(`/projects/${project.id}`);
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

      <div className="app-container py-6 md:py-8">
        <form
          noValidate
          onSubmit={(e) => { e.preventDefault(); void create(); }}
          className="max-w-xl rounded-xl border border-border bg-card p-4 shadow-xs sm:p-6"
        >
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="project-name" className="block text-sm font-medium text-foreground">
                Project name <span className="text-[var(--danger)]" aria-hidden="true">*</span>
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
                <p id="project-name-error" role="alert" className="flex items-center gap-1.5 text-xs font-medium text-[var(--danger)]">
                  <AlertCircle size={13} className="shrink-0" />Enter a project name.
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
            <p role="alert" className="mt-5 flex items-start gap-2 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span className="min-w-0 break-words">{byEdition("The project was not created.", "The engagement was not created.")} {error}</span>
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">You will own the project. You upload documents and invite people in the next step.</p>
            <Button type="submit" size="lg" disabled={creating} className="w-full sm:w-auto">
              {creating ? <><Loader2 size={15} className="animate-spin motion-reduce:animate-none" />{byEdition("Creating project", "Creating engagement")}</> : <>{byEdition("Create project", "Create engagement")} <ArrowRight size={15} /></>}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
