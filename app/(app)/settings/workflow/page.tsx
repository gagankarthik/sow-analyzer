"use client";

// Workflow & routing (Requirement 2): stage targets, the reviewers directory,
// auto-assignment, approval routing and notifications. The whole settings
// object is staged locally and saved in one PUT, so an admin can change a
// target and a routing rule together and see both before committing.

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { LastUpdated } from "@/components/ui/LastUpdated";
import { SettingsLayout } from "@/components/settings/SettingsNav";
import {
  LoadError, PageSkeleton, ReadOnlyNote, UnsavedBar, useAdminAccess, useUnsavedChangesGuard,
} from "@/components/govern/admin/shared";
import { StageTargets } from "@/components/govern/workflow-settings/StageTargets";
import { ReviewersSection } from "@/components/govern/workflow-settings/ReviewersSection";
import { AssignmentRules } from "@/components/govern/workflow-settings/AssignmentRules";
import { RoutingRules } from "@/components/govern/workflow-settings/RoutingRules";
import { NotificationsSection } from "@/components/govern/workflow-settings/NotificationsSection";
import { countProblems, routingSentence, toDraft, type SettingsDraft } from "@/components/govern/workflow-settings/draft";
import { isForbidden } from "@/lib/api";
import { PRE_SIGNATURE_STAGES, STAGE_LABEL, plural } from "@/lib/govern/labels";
import { useGovernFeatures, useSaveWorkflowSettings, useWorkflowSettings } from "@/lib/govern/queries";
import type { GovernFeatureFlags } from "@/lib/govern/features";
import { ComingSoonPanel } from "@/components/govern/ComingSoon";
import type { WorkflowSettingsInput } from "@/lib/govern/types";

export default function WorkflowSettingsPage() {
  const q = useWorkflowSettings();
  const { isAdmin } = useAdminAccess();
  const save = useSaveWorkflowSettings();
  const readOnly = !isAdmin;

  const base = useMemo(() => (q.data ? toDraft(q.data) : null), [q.data]);
  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [webhook, setWebhook] = useState("");
  const current = draft ?? base;
  // Routing rules and notifications are "Later" features: while they are off
  // their sections are not shown, never block a save, and are left out of the
  // PUT (the API merges a partial body over what is saved).
  const features = useGovernFeatures();

  const dirty = (draft !== null && base !== null && JSON.stringify(draft) !== JSON.stringify(base)) || webhook.trim() !== "";
  useUnsavedChangesGuard(dirty && !readOnly);
  const problems = current
    ? countProblems(
        features.routingRules ? current : { ...current, routingRules: [] },
        features.notifications ? webhook : "",
      )
    : 0;

  function discard() {
    setDraft(null);
    setWebhook("");
  }

  async function submit() {
    if (!current || problems > 0) return;
    const { routingRules, notifications, ...live } = current;
    const input: WorkflowSettingsInput = { ...live };
    if (features.routingRules) input.routingRules = routingRules;
    if (features.notifications) input.notifications = notifications;
    if (features.notifications && webhook.trim()) input.teamsWebhookUrl = webhook.trim();
    try {
      await save.mutateAsync(input);
      discard();
      toast.success("Workflow settings saved", {
        description: "Open contracts are re-read now, so their colours and next steps follow the new settings.",
      });
    } catch (e) {
      toast.error("Couldn't save the workflow settings", {
        description: isForbidden(e)
          ? "Only admins change these settings. Your edits are still here."
          : `${e instanceof Error ? e.message : "The request failed."} Your edits are still here; try again.`,
      });
    }
  }

  return (
    <>
      <PageHeader
        title="Workflow & routing"
        subtitle={
          features.routingRules || features.notifications
            ? "How long each stage should take, who reviews what, which offices sign off before signature, and who hears about it."
            : "How long each stage should take, who reviews what, and how new contracts are assigned."
        }
        back={{ href: "/settings", label: "Settings" }}
        actions={<LastUpdated updatedAt={q.dataUpdatedAt} isFetching={q.isFetching} onRefresh={() => q.refetch()} failed={q.isError} />}
      />

      <SettingsLayout>
        {q.isLoading ? (
          <PageSkeleton label="Loading workflow settings" />
        ) : !current ? (
          <LoadError what="the workflow settings" error={q.error} onRetry={() => q.refetch()} retrying={q.isFetching} />
        ) : (
          <>
            <Summary draft={current} features={features} />
            {readOnly && <ReadOnlyNote what="You can see the targets, reviewers, rules and alerts; ask an admin to change them." />}
            <StageTargets draft={current} onChange={setDraft} readOnly={readOnly} />
            <ReviewersSection draft={current} onChange={setDraft} readOnly={readOnly} />
            <AssignmentRules draft={current} onChange={setDraft} readOnly={readOnly} />
            {features.routingRules ? (
              <RoutingRules draft={current} onChange={setDraft} readOnly={readOnly} />
            ) : (
              <ComingSoonPanel feature="routingRules" />
            )}
            {features.notifications ? (
              <NotificationsSection
                draft={current}
                onChange={setDraft}
                readOnly={readOnly}
                webhookConfigured={q.data?.teamsWebhookConfigured ?? false}
                webhook={webhook}
                onWebhookChange={setWebhook}
              />
            ) : (
              <ComingSoonPanel feature="notifications" />
            )}
            {dirty && !readOnly && (
              <UnsavedBar
                summary={problems > 0 ? `Fix ${plural(problems, "problem")} before saving.` : "You have changes that are not saved yet."}
                onDiscard={discard}
                onSave={submit}
                saving={save.isPending}
                disabled={problems > 0}
              />
            )}
          </>
        )}
      </SettingsLayout>
    </>
  );
}

/** Focal block: the review target and the routing rule most people ask about. */
function Summary({ draft, features }: { draft: SettingsDraft; features: GovernFeatureFlags }) {
  const review = draft.stageTargetDays.review ?? null;
  const total = PRE_SIGNATURE_STAGES.reduce((sum, s) => sum + (draft.stageTargetDays[s] ?? 0), 0);
  const firstRule = features.routingRules ? draft.routingRules.find((r) => r.enabled) : undefined;
  const channels = [draft.notifications.email && "email", draft.notifications.teams && "Teams"].filter(Boolean) as string[];

  return (
    <div className="grid grid-cols-1 gap-4 rounded-xl bg-[var(--navy-800)] p-5 text-white md:grid-cols-12 md:gap-8">
      <div className="min-w-0 md:col-span-4">
        <div className="text-sm font-medium text-[var(--navy-100)]">Target from arrival to signature</div>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
          <span className="text-4xl font-semibold leading-none tracking-tight tabular-nums">{total > 0 ? total : "—"}</span>
          {total > 0 && <span className="text-base text-[var(--navy-100)]">days</span>}
        </div>
        <p className="mt-2 text-sm text-[var(--navy-100)]">
          {review !== null ? `${STAGE_LABEL.review}: ${plural(review, "day")}` : "No review target set"} · red after {Number.isFinite(draft.redAfterMultiple) ? draft.redAfterMultiple : "—"}× target
        </p>
      </div>
      <div className="min-w-0 space-y-1.5 text-sm leading-relaxed text-[var(--navy-100)] md:col-span-8">
        <p>
          <span className="font-semibold text-white">{plural(draft.reviewers.length, "reviewer")}</span> in the directory,{" "}
          {features.routingRules ? (
            <>
              {plural(draft.assignmentRules.length, "assignment rule")} and{" "}
              {plural(draft.routingRules.filter((r) => r.enabled).length, "routing rule")} on.
            </>
          ) : (
            <>and {plural(draft.assignmentRules.length, "assignment rule")} on.</>
          )}
        </p>
        {firstRule && <p className="text-white">{routingSentence(firstRule)}</p>}
        {features.notifications && (
          <p>{channels.length ? `Alerts go out by ${channels.join(" and ")}.` : "Alerts are off."}</p>
        )}
      </div>
    </div>
  );
}
