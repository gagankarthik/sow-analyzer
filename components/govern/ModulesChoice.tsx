"use client";

// Requirement 7 / module 1.1: which modules this organization uses. Only the
// modules this deployment has on are offered; turning one off hides it for
// everyone in the organization (nothing is deleted).

import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import type { GovernFeature } from "@/lib/govern/features";
import { useGovernMe, useSaveWorkflowSettings } from "@/lib/govern/queries";

const MODULE_LABEL: Partial<Record<GovernFeature, { name: string; hint: string }>> = {
  obligations: { name: "Obligations", hint: "Reports, payments and deadlines after signature" },
  routingRules: { name: "Routing rules", hint: "Send agreements to an office automatically" },
  exports: { name: "Excel and PDF exports", hint: "Download reports for leadership" },
  notifications: { name: "Alerts", hint: "Tell people when something needs them" },
  integrations: { name: "Integrations", hint: "Connect your systems of record" },
  docusign: { name: "E-signature", hint: "Send agreements for signature" },
};

export function ModulesChoice({ enabled, canEdit }: { enabled: string[] | null; canEdit: boolean }) {
  const me = useGovernMe();
  const save = useSaveWorkflowSettings();
  const offered = (Object.keys(MODULE_LABEL) as GovernFeature[]).filter((f) => me.data?.deploymentFeatures?.[f] ?? me.data?.features?.[f]);
  if (offered.length === 0) return null;
  const isOn = (f: GovernFeature) => (enabled === null ? true : enabled.includes(f));

  const toggle = (f: GovernFeature, on: boolean) => {
    const current = offered.filter(isOn);
    const next = on ? [...new Set([...current, f])] : current.filter((x) => x !== f);
    save.mutate({ organization: { enabledModules: next.length === offered.length ? null : next } }, {
      onSuccess: () => { void me.refetch(); toast.success(`${MODULE_LABEL[f]?.name} turned ${on ? "on" : "off"} for your organization`); },
      onError: (e) => toast.error("Couldn't save", { description: e instanceof Error ? e.message : "Please try again." }),
    });
  };

  return (
    <div role="group" aria-labelledby="modules-heading" className="mt-6 border-t border-border pt-5">
      <p id="modules-heading" className="text-sm font-medium text-foreground">Modules</p>
      <p className="mt-0.5 text-sm text-[var(--ink-600)]">Turn off what your organization does not use. Nothing is deleted.</p>
      <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
        {offered.map((f) => (
          <li key={f} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">{MODULE_LABEL[f]?.name}</span>
              <span className="block text-xs text-[var(--ink-600)]">{MODULE_LABEL[f]?.hint}</span>
            </span>
            <Switch
              checked={isOn(f)}
              disabled={!canEdit || save.isPending}
              onCheckedChange={(on) => toggle(f, on)}
              aria-label={`${MODULE_LABEL[f]?.name} for your organization`}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
