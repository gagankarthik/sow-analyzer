"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ArrowRight, Briefcase, Upload, Sparkles } from "@/components/ui/icons";
import { createProject } from "@/lib/projects-store";
import { useAuth } from "@/components/auth/AuthProvider";

export default function NewProjectPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [creating, setCreating] = useState(false);

  const canCreate = name.trim().length > 0 && !creating;

  function create() {
    if (!canCreate) return;
    setCreating(true);
    const project = createProject(name, client, user?.email);
    router.push(`/projects/${project.id}`);
  }

  return (
    <>
      <PageHeader
        eyebrow="New project"
        title="Name your project"
        subtitle="Create a project, then upload the SOW (and any related contracts) inside it. Blue-IQ analyzes each document and rolls the risk up to the project."
        actions={
          <Link href="/projects" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted">
            <ChevronLeft size={14} />Back to projects
          </Link>
        }
      />

      <div className="app-container py-8 md:py-12">
        <div className="mx-auto max-w-xl">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs md:p-8">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-primary-50)] text-[var(--brand-primary-600)]">
              <Briefcase size={22} strokeWidth={1.75} />
            </span>

            <div className="mt-6 space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="project-name" className="text-[13px] font-medium text-foreground">
                  Project name <span className="text-[var(--danger)]">*</span>
                </label>
                <Input
                  id="project-name"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") create(); }}
                  placeholder="e.g. Acme Corp — Master Services 2026"
                  className="h-11 text-[14px]"
                />
                <p className="text-[11.5px] text-muted-foreground">Use the counterparty and engagement so it&apos;s easy to find later.</p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="project-client" className="text-[13px] font-medium text-foreground">
                  Client / counterparty <span className="text-muted-foreground">(optional)</span>
                </label>
                <Input
                  id="project-client"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") create(); }}
                  placeholder="e.g. Acme Corp"
                  className="h-11 text-[14px]"
                />
              </div>
            </div>

            <div className="mt-7 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <Upload size={13} /> Upload SOWs in the next step
              </span>
              <Button variant="primary" size="lg" disabled={!canCreate} onClick={create}>
                Create project <ArrowRight size={15} />
              </Button>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[var(--ai-border)] bg-[var(--ai-surface)]/50 px-4 py-3">
            <Sparkles size={14} className="mt-0.5 shrink-0 text-[var(--ai-ink)]" />
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              After you create the project, drop in your SOW and Blue-IQ extracts every clause, scores risk, and surfaces key findings — usually within 90 seconds.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
