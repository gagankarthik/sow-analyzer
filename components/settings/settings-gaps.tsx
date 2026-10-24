"use client";

// What in Settings still needs setting up, per page, for admins (only they can
// fix it). The rules match the Organization setup checklist, so a warning
// here and an unfinished step there always agree.

import { AlertTriangle } from "@/components/ui/icons";
import { useGovernMe, useMatrix, useWorkflowSettings } from "@/lib/govern/queries";
import { cn } from "@/lib/utils";

/** Settings page href → why it needs attention. Empty while loading, or for non-admins. */
export function useSettingsGaps(): Record<string, string> {
  const me = useGovernMe().data;
  const settings = useWorkflowSettings().data;
  const matrix = useMatrix().data?.current;
  const isAdmin = me?.isAdmin ?? me?.role === "admin";
  if (!isAdmin || !settings) return {};

  const org = settings.organization;
  const confirmed = new Set(org?.confirmedSteps ?? []);
  const gaps: Record<string, string> = {};
  if (!org?.name) gaps["/settings/organization"] = "The organization has no name yet";
  else if (!org.setupCompletedAt) gaps["/settings/organization"] = "Organization setup isn't finished";
  if (matrix && !matrix.homeState) gaps["/settings/matrix"] = "No governing law (home state) set";
  else if (!confirmed.has("matrix")) gaps["/settings/matrix"] = "The review matrix isn't confirmed";
  if (settings.reviewers.length === 0) gaps["/settings/workflow"] = "No reviewers added";
  else if (!confirmed.has("workflow")) gaps["/settings/workflow"] = "Stage targets aren't confirmed";
  return gaps;
}

/** The amber mark beside a settings item that needs attention; the reason is
 *  its tooltip and its accessible name. */
export function GapIcon({ reason, className }: { reason: string; className?: string }) {
  return (
    <span title={reason} className={cn("inline-flex shrink-0", className)}>
      <AlertTriangle size={14} aria-hidden className="!text-[var(--warning)]" />
      <span className="sr-only">Needs attention: {reason}</span>
    </span>
  );
}

/** For server-rendered lists: the mark for one settings page, if it needs attention. */
export function SettingsGapIcon({ href, className }: { href: string; className?: string }) {
  const reason = useSettingsGaps()[href];
  return reason ? <GapIcon reason={reason} className={className} /> : null;
}
