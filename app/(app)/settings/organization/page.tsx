"use client";

// Organization setup: the checklist an admin works through once so Govern
// fits the organization. Steps that are facts about the data (a name, a home
// state, a reviewer, a contract) complete themselves; the two judgement calls
// (the matrix positions, the stage targets) the admin confirms. Progress is
// stored with the organization's settings, not in this browser.

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { SettingsLayout } from "@/components/settings/SettingsNav";
import { useAdminAccess } from "@/components/govern/admin/shared";
import { HomeStateSetting } from "@/components/govern/matrix/HomeStateSetting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Check, CheckCircle2, Loader2 } from "@/components/ui/icons";
import { STAGE_LABEL, plural } from "@/lib/govern/labels";
import { useContracts, useEdition, useMatrix, useSaveWorkflowSettings, useWorkflowSettings } from "@/lib/govern/queries";
import { EDITION_LABEL } from "@/lib/edition";
import { EditionChoice } from "@/components/govern/EditionChoice";
import { ModulesChoice } from "@/components/govern/ModulesChoice";
import type { OrganizationSettings, Stage } from "@/lib/govern/types";
import { cn } from "@/lib/utils";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "JPY", "CHF", "SGD"];
const MONTHS = Array.from({ length: 12 }, (_, i) => new Date(2026, i, 1).toLocaleDateString(undefined, { month: "long" }));
const TARGET_STAGES: Stage[] = ["draft", "review", "negotiation", "approval"];

type StepId = "details" | "law" | "matrix" | "workflow" | "team" | "contract";

export default function OrganizationSetupPage() {
  const { isAdmin, loading: roleLoading } = useAdminAccess();
  const settingsQ = useWorkflowSettings();
  const matrixQ = useMatrix();
  const contractsQ = useContracts();
  const save = useSaveWorkflowSettings();

  // Older API builds don't return the organization yet: start from the defaults.
  const org: OrganizationSettings | undefined = settingsQ.data
    ? (settingsQ.data.organization ?? { name: null, defaultCurrency: "USD", fiscalYearStartMonth: 7, confirmedSteps: [], setupCompletedAt: null })
    : undefined;
  const matrix = matrixQ.data?.current;
  const confirmed = new Set(org?.confirmedSteps ?? []);
  const done: Record<StepId, boolean> = {
    details: !!org?.name,
    law: !!matrix?.homeState,
    matrix: confirmed.has("matrix"),
    workflow: confirmed.has("workflow"),
    team: (settingsQ.data?.reviewers.length ?? 0) > 0,
    contract: (contractsQ.data?.contracts.length ?? 0) > 0,
  };
  const total = Object.keys(done).length;
  const complete = Object.values(done).filter(Boolean).length;
  const canEdit = isAdmin && !roleLoading;
  const edition = useEdition();

  const saveOrg = (organization: Partial<OrganizationSettings>, success: string) =>
    save.mutate({ organization }, {
      onSuccess: () => toast.success(success),
      onError: (e) => toast.error("Couldn't save", { description: e instanceof Error ? e.message : "Please try again." }),
    });
  const confirm = (step: "matrix" | "workflow", success: string) =>
    saveOrg({ confirmedSteps: [...new Set([...(org?.confirmedSteps ?? []), step])] }, success);

  const loading = settingsQ.isLoading || matrixQ.isLoading || contractsQ.isLoading;

  return (
    <>
      <PageHeader
        title="Organization setup"
        subtitle="Six steps so reviews, targets and reports fit your organization. Most take a minute."
        back={{ href: "/settings", label: "Settings" }}
      />
      <SettingsLayout>
        {loading ? (
          <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading setup">
            <Skeleton className="h-20 rounded-xl" />
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : settingsQ.isError || !org ? (
          <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-soft)] px-5 py-12 text-center">
            <p className="font-semibold text-foreground">Couldn&apos;t load your organization settings</p>
            <Button variant="outline" onClick={() => void settingsQ.refetch()}>Try again</Button>
          </div>
        ) : (
          <>
            {/* Progress */}
            <section aria-label="Progress" className="rounded-xl border border-border bg-card p-5 shadow-xs">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-base font-semibold text-foreground">
                  {org.setupCompletedAt ? "Setup complete" : `${complete} of ${total} steps done`}
                </p>
                {!canEdit && !roleLoading && <p className="text-sm text-[var(--ink-600)]">Only an admin can change these settings.</p>}
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--ink-100)]" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={complete} aria-label="Setup progress">
                <div className="h-full rounded-full bg-[var(--brand-primary-600)] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${(complete / total) * 100}%` }} />
              </div>
            </section>

            <ol className="flex flex-col gap-3">
              <Step n={1} title="Organization details" done={done.details}
                body="Your organization's name, the currency values are reported in, when your financial year starts, and the kind of agreements you review.">
                <DetailsForm org={org} canEdit={canEdit} saving={save.isPending} onSave={(o) => saveOrg(o, "Organization details saved")} />
                <EditionChoice
                  current={edition}
                  chosen={org.edition ?? null}
                  canEdit={canEdit}
                  saving={save.isPending}
                  contractTypes={(contractsQ.data?.contracts ?? []).map((c) => c.agreementType)}
                  onChoose={(e) => save.mutateAsync({ organization: { edition: e } }).then(
                    () => { toast.success(`${EDITION_LABEL[e]} edition is on for everyone in ${org.name || "your organization"}`); },
                    (err: unknown) => {
                      toast.error("Couldn't switch the edition", { description: err instanceof Error ? err.message : "Please try again." });
                      throw err;
                    },
                  )}
                />
                <ModulesChoice enabled={org.enabledModules ?? null} canEdit={canEdit} />
              </Step>

              <Step n={2} title="Governing law" done={done.law}
                body="The state whose law your contracts should use. Governing-law clauses are checked against it.">
                {matrix && <HomeStateSetting key={matrix.version} matrix={matrix} canEdit={canEdit} blocked={false} />}
              </Step>

              <Step n={3} title="Review matrix" done={done.matrix}
                body={`Your accepted positions, clause by clause: ${plural(Object.values(matrix?.playbooks ?? {}).reduce((s, p) => s + (p?.clauses?.length ?? 0), 0), "position")} across every agreement type. Edit any, or import your own from Excel.`}>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline"><Link href="/settings/matrix">Open the matrix <ArrowRight size={14} /></Link></Button>
                  {!done.matrix && canEdit && (
                    <Button onClick={() => confirm("matrix", "Matrix confirmed")} disabled={save.isPending}>
                      <Check size={14} />These positions are right
                    </Button>
                  )}
                </div>
              </Step>

              <Step n={4} title="Stage targets" done={done.workflow}
                body="How many days a contract may sit in each step before it counts as running late.">
                <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {TARGET_STAGES.map((s) => (
                    <div key={s} className="rounded-lg border border-border px-3 py-2">
                      <dt className="truncate text-xs text-[var(--ink-600)]">{STAGE_LABEL[s]}</dt>
                      <dd className="text-lg font-semibold tabular-nums text-foreground">
                        {settingsQ.data?.stageTargetDays[s] == null ? "—" : plural(settingsQ.data.stageTargetDays[s] as number, "day")}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline"><Link href="/settings/workflow">Change targets <ArrowRight size={14} /></Link></Button>
                  {!done.workflow && canEdit && (
                    <Button onClick={() => confirm("workflow", "Stage targets confirmed")} disabled={save.isPending}>
                      <Check size={14} />Keep these targets
                    </Button>
                  )}
                </div>
              </Step>

              <Step n={5} title="Reviewers and team" done={done.team}
                body={done.team
                  ? `${plural(settingsQ.data?.reviewers.length ?? 0, "reviewer")} in the directory. Add more, or invite people to projects.`
                  : "Add the people who review agreements, and the offices and agreement types each handles, so new contracts are assigned automatically."}>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant={done.team ? "outline" : "default"}><Link href="/settings/workflow#reviewers">Add reviewers <ArrowRight size={14} /></Link></Button>
                  <Button asChild variant="outline"><Link href="/settings/team">Invite people</Link></Button>
                </div>
              </Step>

              <Step n={6} title="First agreement" done={done.contract}
                body={done.contract
                  ? `${plural(contractsQ.data?.contracts.length ?? 0, "contract")} in the workspace.`
                  : "Upload an agreement. Sonar reads it, checks it against your matrix and puts it on the board with its next step."}>
                <Button asChild variant={done.contract ? "outline" : "default"}>
                  <Link href={done.contract ? "/workflow" : "/projects/upload"}>{done.contract ? "Open the workflow" : "Upload an agreement"} <ArrowRight size={14} /></Link>
                </Button>
              </Step>
            </ol>

            {canEdit && !org.setupCompletedAt && (
              <div className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[var(--ink-700)]">
                  {complete === total ? "Everything is in place." : `${plural(total - complete, "step")} still to do. You can finish later; this page keeps your progress.`}
                </p>
                <Button disabled={complete < total || save.isPending} onClick={() => saveOrg({ setupCompletedAt: new Date().toISOString() }, "Organization setup complete")}>
                  Finish setup
                </Button>
              </div>
            )}
          </>
        )}
      </SettingsLayout>
    </>
  );
}

function Step({ n, title, body, done, children }: { n: number; title: string; body: string; done: boolean; children: React.ReactNode }) {
  return (
    <li className="rounded-xl border border-border bg-card shadow-xs">
      <div className="flex items-start gap-4 p-5">
        <span
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
            done ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--ink-100)] text-[var(--ink-700)]",
          )}
          aria-hidden
        >
          {done ? <CheckCircle2 size={18} /> : n}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", done ? "bg-[var(--success-soft)] text-[var(--success-fg)]" : "bg-[var(--ink-100)] text-[var(--ink-700)]")}>
              {done ? "Done" : "To do"}
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--ink-600)]">{body}</p>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </li>
  );
}

function DetailsForm({ org, canEdit, saving, onSave }: {
  org: OrganizationSettings; canEdit: boolean; saving: boolean; onSave: (o: Partial<OrganizationSettings>) => void;
}) {
  const [name, setName] = useState(org.name ?? "");
  const [currency, setCurrency] = useState(org.defaultCurrency);
  const [month, setMonth] = useState(String(org.fiscalYearStartMonth));
  // Follow the saved values when they change elsewhere (another admin, another tab).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync form to fresh server values
    setName(org.name ?? ""); setCurrency(org.defaultCurrency); setMonth(String(org.fiscalYearStartMonth));
  }, [org.name, org.defaultCurrency, org.fiscalYearStartMonth]);
  const dirty = name.trim() !== (org.name ?? "") || currency !== org.defaultCurrency || Number(month) !== org.fiscalYearStartMonth;
  const nameError = name.trim().length > 120 ? "Use 120 characters or fewer." : undefined;

  return (
    <form
      className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim() || nameError) return;
        onSave({ name: name.trim(), defaultCurrency: currency, fiscalYearStartMonth: Number(month) });
      }}
    >
      <label className="flex flex-col gap-1.5 sm:col-span-3">
        <span className="text-sm font-medium text-foreground">Organization name</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} placeholder="e.g. Northwind Research" maxLength={140} aria-invalid={nameError ? true : undefined} className="max-w-md" />
        {nameError && <span className="text-xs text-[var(--danger)]">{nameError}</span>}
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Reporting currency</span>
        <Select value={currency} onValueChange={setCurrency} disabled={!canEdit}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Financial year starts</span>
        <Select value={month} onValueChange={setMonth} disabled={!canEdit}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
        </Select>
      </label>
      {canEdit && (
        <div className="flex items-end">
          <Button type="submit" disabled={!dirty || !name.trim() || !!nameError || saving}>
            {saving && <Loader2 size={14} className="animate-spin motion-reduce:animate-none" />}Save details
          </Button>
        </div>
      )}
    </form>
  );
}
