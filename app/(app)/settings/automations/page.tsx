"use client";

// Settings → Automations: rules that run on their own. WHEN a trigger
// happens (a contract waits too long, a term is ending, something is sent
// back), ONLY IF its conditions hold, THEN notify, escalate, assign or
// comment. A flat table of rules; the builder opens in a right sheet.

import * as React from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { SettingsLayout, SettingsSection } from "@/components/settings/SettingsNav";
import { DataTable, type DataTableColumn } from "@/components/ds/DataTable";
import { ConfirmDialog } from "@/components/ds/ConfirmDialog";
import { formatRelative } from "@/components/ds/format";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Zap } from "@/components/ui/icons";
import { ComingSoonPanel } from "@/components/govern/ComingSoon";
import { LoadError, PageSkeleton, ReadOnlyNote, useAdminAccess } from "@/components/govern/admin/shared";
import { RuleBuilder, type BuilderTarget } from "@/components/govern/automations/RuleBuilder";
import { STARTER_TEMPLATES, actionsSummary, conditionSummary, ruleSentence, triggerSummary } from "@/lib/govern/automations";
import { plural } from "@/lib/govern/labels";
import { useAutomations, useDeleteAutomation, useGovernFeatures, useOrgCurrency, useUpdateAutomation } from "@/lib/govern/queries";
import type { Automation, AutomationInput } from "@/lib/govern/types";
import { isForbidden } from "@/lib/api";

export default function AutomationsPage() {
  const features = useGovernFeatures();
  const q = useAutomations();
  const { isAdmin, loading: roleLoading } = useAdminAccess();
  const readOnly = !isAdmin && !roleLoading;
  const [target, setTarget] = React.useState<BuilderTarget | null>(null);
  const rules = q.data?.automations ?? [];
  const full = q.data ? rules.length >= q.data.limit : false;
  const on = features.automations && (q.data?.enabled ?? true);

  // No "New rule" while the list can't be read: there is nowhere to save it.
  const primary = on && isAdmin && !(q.isError && !q.data) ? (
    <Button size="sm" onClick={() => setTarget({ mode: "new" })} disabled={full} title={full ? `Up to ${q.data?.limit} rules` : undefined}>
      <Plus size={16} aria-hidden />New rule
    </Button>
  ) : undefined;

  return (
    <>
      <PageHeader
        title="Automations"
        back={{ href: "/settings", label: "Settings" }}
        count={on && q.data ? rules.length : null}
        countLoading={on && q.isLoading}
        actions={primary}
      />
      <SettingsLayout>
        {!on ? (
          <ComingSoonPanel feature="automations" />
        ) : q.isLoading ? (
          <PageSkeleton label="Loading automations" />
        ) : q.isError && !q.data ? (
          <LoadError what="the automations" error={q.error} onRetry={() => void q.refetch()} retrying={q.isFetching} />
        ) : (
          <>
            {readOnly && <ReadOnlyNote what="You can see each rule and test it on a contract; ask an admin to change them." />}
            {rules.length === 0 ? (
              <StarterTemplates
                readOnly={readOnly}
                onUse={(input) => setTarget({ mode: "new", template: input })}
              />
            ) : (
              <RulesTable rules={rules} readOnly={readOnly} onOpen={(rule) => setTarget({ mode: "edit", rule })} />
            )}
          </>
        )}
      </SettingsLayout>
      <RuleBuilder target={target} onClose={() => setTarget(null)} readOnly={readOnly} />
    </>
  );
}

function RulesTable({ rules, readOnly, onOpen }: { rules: Automation[]; readOnly: boolean; onOpen: (r: Automation) => void }) {
  const currency = useOrgCurrency();
  const update = useUpdateAutomation();
  const remove = useDeleteAutomation();
  const [removing, setRemoving] = React.useState<Automation | null>(null);

  async function toggle(rule: Automation, enabled: boolean) {
    try {
      await update.mutateAsync({ id: rule.id, patch: { enabled, rev: rule.rev } });
      toast.success(`${rule.name} turned ${enabled ? "on" : "off"}`);
    } catch (e) {
      toast.error(`Couldn't turn ${rule.name} ${enabled ? "on" : "off"}`, {
        description: isForbidden(e) ? "Only admins change automations." : e instanceof Error ? e.message : "Try again.",
      });
    }
  }

  async function doDelete() {
    if (!removing) return;
    try {
      await remove.mutateAsync(removing.id);
      toast.success("Rule deleted");
    } catch (e) {
      toast.error("Couldn't delete the rule", { description: e instanceof Error ? e.message : "Try again." });
      throw e;
    }
  }

  const columns: DataTableColumn<Automation>[] = [
    {
      id: "name",
      header: "Name",
      card: "title",
      hideable: false,
      sortValue: (r) => r.name.toLowerCase(),
      truncate: (r) => r.name,
      cell: (r) => <span className="font-medium text-foreground">{r.name}</span>,
      className: "min-w-[14rem]",
    },
    {
      id: "trigger",
      header: "When",
      card: "field",
      sortValue: (r) => triggerSummary(r.trigger),
      truncate: (r) => [triggerSummary(r.trigger), ...r.conditions.map((c) => conditionSummary(c, currency))].join(" · "),
      cell: (r) => (
        <span>
          {triggerSummary(r.trigger)}
          {r.conditions.length > 0 && <span className="text-[var(--ink-500)]"> · {plural(r.conditions.length, "condition")}</span>}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Then",
      card: "field",
      priority: 2,
      sortValue: (r) => actionsSummary(r.actions),
      truncate: (r) => actionsSummary(r.actions),
    },
    {
      id: "enabled",
      header: "On",
      card: "status",
      stopRowClick: true,
      hideable: false,
      sortValue: (r) => (r.enabled ? 1 : 0),
      exportValue: (r) => (r.enabled ? "On" : "Off"),
      className: "w-20",
      cell: (r) => (
        <Switch
          checked={r.enabled}
          disabled={readOnly || update.isPending}
          onCheckedChange={(v) => void toggle(r, v)}
          aria-label={`${r.enabled ? "Turn off" : "Turn on"} ${r.name}`}
        />
      ),
    },
    {
      id: "lastRun",
      header: "Last run",
      card: "field",
      priority: 2,
      sortFirst: "desc",
      sortValue: (r) => r.lastRunAt,
      cell: (r) => (r.lastRunAt ? <time dateTime={r.lastRunAt} title={r.lastRunAt}>{formatRelative(r.lastRunAt)}</time> : <span className="text-[var(--ink-500)]">Never</span>),
      className: "w-32",
    },
    {
      id: "runs",
      header: "Runs",
      numeric: true,
      card: "field",
      priority: 2,
      sortFirst: "desc",
      sortValue: (r) => r.runCount,
      cell: (r) => r.runCount.toLocaleString("en-US"),
      className: "w-20",
    },
  ];

  return (
    <>
      <DataTable
        caption="Automation rules"
        noun="rules"
        columns={columns}
        rows={rules}
        getRowId={(r) => r.id}
        getRowLabel={(r) => `${readOnly ? "View" : "Edit"} ${r.name}`}
        onRowClick={onOpen}
        rowActions={readOnly ? undefined : (r) => (
          <Button variant="ghost" size="icon-sm" onClick={() => setRemoving(r)} aria-label={`Delete ${r.name}`} className="text-[var(--ink-500)] hover:text-[var(--danger)]">
            <Trash2 size={16} aria-hidden />
          </Button>
        )}
      />
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Delete “${removing?.name ?? "this rule"}”?`}
        description={removing ? `${ruleSentence(removing, currency)} It stops running at once. To pause it instead, turn it off.` : ""}
        confirmLabel="Delete rule"
        tone="danger"
        onConfirm={doDelete}
      />
    </>
  );
}

/** Shown while there are no rules: three common ones, each one click from the builder. */
function StarterTemplates({ readOnly, onUse }: { readOnly: boolean; onUse: (input: AutomationInput) => void }) {
  const currency = useOrgCurrency();
  return (
    <SettingsSection
      title="Start from a template"
      description="No rules yet. Pick one to open it in the builder, or start from scratch with New rule."
      flush
    >
      <ul className="divide-y divide-border">
        {STARTER_TEMPLATES.map((t) => (
          <li key={t.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
            <Zap size={16} aria-hidden className="hidden shrink-0 text-[var(--ink-500)] sm:block" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{t.input.name}</p>
              <p className="mt-0.5 truncate text-xs text-[var(--ink-500)]" title={ruleSentence(t.input, currency)}>{ruleSentence(t.input, currency)}</p>
            </div>
            {!readOnly && (
              <Button variant="outline" size="sm" className="w-full shrink-0 sm:w-auto" onClick={() => onUse(t.input)}>
                Use template
              </Button>
            )}
          </li>
        ))}
      </ul>
    </SettingsSection>
  );
}
