"use client";

import { useCallback, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { SettingsLayout, SettingsSection } from "@/components/settings/SettingsNav";
import {
  LoadError, PageSkeleton, ReadOnlyNote, useAdminAccess, useUnsavedChangesGuard,
} from "@/components/govern/admin/shared";
import { IntegrationsDiagram } from "@/components/govern/integrations/IntegrationsDiagram";
import { ConnectorCard } from "@/components/govern/integrations/ConnectorCard";
import { SyncLog } from "@/components/govern/integrations/SyncLog";
import { WorkdayMatch } from "@/components/govern/integrations/WorkdayMatch";
import { PlatformRules } from "@/components/govern/integrations/PlatformRules";
import { CONNECTOR_ORDER } from "@/components/govern/integrations/meta";
import { ComingSoonPanel } from "@/components/govern/ComingSoon";
import { useConnectors, useGovernFeature } from "@/lib/govern/queries";
import type { Connector } from "@/lib/govern/types";

const order = (c: Connector) => {
  const i = CONNECTOR_ORDER.indexOf(c.id);
  return i === -1 ? CONNECTOR_ORDER.length : i;
};

export default function IntegrationsPage() {
  const isLive = useGovernFeature("integrations");
  return isLive ? <LiveIntegrations /> : <PlannedIntegrations />;
}

/** While integrations are off: what is coming and the planned picture. No
 *  connectors are read and no sync controls are shown. */
function PlannedIntegrations() {
  return (
    <>
      <PageHeader
        title="Integrations"
        subtitle="How Govern will plug into the systems you already run. For now, Huron record IDs and Workday references are entered on each contract."
        back={{ href: "/settings", label: "Settings" }}
      />
      <SettingsLayout>
        <ComingSoonPanel feature="integrations">
          <div className="mb-2 text-sm font-semibold text-[var(--ink-800)]">Planned</div>
          <IntegrationsDiagram connectors={undefined} planned />
        </ComingSoonPanel>
      </SettingsLayout>
    </>
  );
}

function LiveIntegrations() {
  const connectors = useConnectors();
  const { isAdmin, loading: roleLoading } = useAdminAccess();

  // Unsaved edits per connector card, so leaving the page warns once for all.
  const [dirtyCards, setDirtyCards] = useState<Record<string, boolean>>({});
  const onDirtyChange = useCallback((id: string, dirty: boolean) => {
    setDirtyCards((prev) => (prev[id] === dirty ? prev : { ...prev, [id]: dirty }));
  }, []);
  useUnsavedChangesGuard(Object.values(dirtyCards).some(Boolean));

  const list = connectors.data ? [...connectors.data].sort((a, b) => order(a) - order(b)) : [];
  const connected = list.filter((c) => c.status === "connected").length;
  const needsAttention = list.filter((c) => c.status === "error").length;

  return (
    <>
      <PageHeader
        title="Integrations"
        subtitle="How Govern plugs into the systems you already run, so nobody enters a contract twice. Huron and Workday stay the systems of record."
        back={{ href: "/settings", label: "Settings" }}
      />

      <SettingsLayout>
        {/* Focal block: the picture of how it fits together. */}
        <section aria-labelledby="int-map-heading" className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="flex flex-col gap-2 border-b border-border px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
            <div className="min-w-0">
              <h2 id="int-map-heading" className="text-lg font-semibold tracking-tight text-foreground">
                Integrations{connectors.data ? ` · ${connectors.data.filter((c) => c.status === "connected").length} of ${connectors.data.length} connected` : ""}
              </h2>
              <p className="mt-1 max-w-[58ch] text-sm leading-relaxed text-muted-foreground">
                Huron records flow into Govern and findings flow back; Workday and DocuSign feed data in; Microsoft 365
                handles sign-on, alerts and intake.
              </p>
            </div>
            {connectors.data && (
              <p className="shrink-0 text-sm text-[var(--ink-600)]">
                <span className="text-2xl font-semibold tabular-nums text-foreground">{connected}</span> of {list.length} live
                {needsAttention > 0 && <span className="ml-2 font-semibold text-[var(--danger)]">· {needsAttention} need attention</span>}
              </p>
            )}
          </div>
          <div className="p-4 sm:p-5">
            <IntegrationsDiagram connectors={connectors.data} />
          </div>
        </section>

        {!roleLoading && !isAdmin && (
          <ReadOnlyNote what="You can see each connection, its sync history and the matching queue; an admin connects systems and edits mappings." />
        )}

        <section aria-labelledby="int-connections" className="flex flex-col gap-4">
          <div>
            <h2 id="int-connections" className="text-lg font-semibold tracking-tight text-foreground">Connections</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Turn a connection on, run a sync, and set how its fields line up with Govern&apos;s.
            </p>
          </div>
          {connectors.isLoading ? (
            <PageSkeleton label="Loading the connections" />
          ) : connectors.isError || !connectors.data ? (
            <LoadError what="the connections" error={connectors.error} onRetry={() => void connectors.refetch()} retrying={connectors.isFetching} />
          ) : list.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-5 py-10 text-center">
              <p className="text-base font-semibold text-foreground">No connections are set up for this workspace</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-[var(--ink-600)]">
                The API returned no connectors. Ask Blue IQ support to enable Huron, Workday, Microsoft 365 and DocuSign.
              </p>
            </div>
          ) : (
            list.map((c) => <ConnectorCard key={c.id} connector={c} canEdit={isAdmin} onDirtyChange={onDirtyChange} />)
          )}
        </section>

        <SettingsSection
          id="workday-match"
          title="Match contracts to Workday"
          description="Contracts Govern could not match to a Workday record by ID or reference. Enter the reference to link them; spend reporting picks it up straight away."
          flush
        >
          <WorkdayMatch canEdit={isAdmin} />
        </SettingsSection>

        <SettingsSection
          id="sync-log"
          title="Sync log"
          description="Every sync is logged with its time, records moved and errors, including dry runs."
          flush
        >
          <SyncLog connectors={connectors.data} />
        </SettingsSection>

        <SettingsSection id="platform-rules" title="Platform rules and security" description="How every Blue IQ connection behaves, for Govern, Capture and Spend alike.">
          <PlatformRules />
        </SettingsSection>
      </SettingsLayout>
    </>
  );
}
