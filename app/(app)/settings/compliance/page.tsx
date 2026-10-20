"use client";

import { ReadOnlyNote, useAdminAccess } from "@/components/govern/admin/shared";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { SummaryTiles } from "@/components/ds/KpiTile";
import {
  FilterChips,
  FilterSummary,
  NoResults,
  SettingsLayout,
  SettingsSearch,
  SettingsSection,
} from "@/components/settings/SettingsNav";
import { cn } from "@/lib/utils";
import { categoryLabel } from "@/lib/clause-categories";
import { docTypeShort } from "@/lib/doc-types";
import type { DocType } from "@/lib/types";
import { COMPLIANCE_PACKS as PACKS, type PackIconKey } from "@/lib/compliance-packs";
import { useCompliancePacks, useSaveCompliancePacks } from "@/lib/queries/compliance";
import { ShieldCheck, Lock, Globe2, Database, BookMarked, Check, RefreshCw, XCircle } from "@/components/ui/icons";

const DOC_TYPE_OPTIONS: { value: DocType | "all"; label: string }[] = [
  { value: "all", label: "All types" },
  ...Array.from(new Set(PACKS.flatMap((p) => p.docTypes))).map((t) => ({
    value: t,
    label: docTypeShort(t),
  })),
];

const PACK_ICON: Record<PackIconKey, typeof ShieldCheck> = {
  gdpr: Globe2,
  hipaa: ShieldCheck,
  soc2: Lock,
  ccpa: Database,
  iso: BookMarked,
};

export default function CompliancePacksPage() {
  const { isAdmin, loading: roleLoading } = useAdminAccess();
  // The enabled packs are tenant data from the API. Until it answers, nothing is
  // shown as on or off; if it fails, the page says so instead of showing defaults.
  const { data, isLoading, isError, error, refetch } = useCompliancePacks();
  const save = useSaveCompliancePacks();
  const loaded = !!data;

  const enabled = useMemo<Record<string, boolean>>(() => {
    const on = new Set(data?.packs ?? []);
    return Object.fromEntries(PACKS.map((p) => [p.id, on.has(p.id)]));
  }, [data]);

  // Pack ids the backend supports that this app has no description for. They are
  // listed rather than hidden, and kept in every save so a toggle here can't
  // silently switch them off.
  const unknownKnown = useMemo(() => (data?.known ?? []).filter((id) => !PACKS.some((p) => p.id === id)), [data]);

  const toggle = (id: string) => {
    if (!data) return;
    const next = new Set(data.packs);
    if (next.has(id)) next.delete(id); else next.add(id);
    save.mutate([...next], {
      onError: (err: unknown) =>
        toast.error("Couldn't save compliance packs", {
          description: `${err instanceof Error ? err.message : "Try again."} The switch was put back.`,
        }),
    });
  };

  const stats = useMemo(() => {
    const on = PACKS.filter((p) => enabled[p.id]);
    const checks = new Set<string>();
    on.forEach((p) => p.checks.forEach((c) => checks.add(c)));
    // Distinct clause categories across the enabled packs (a category shared by
    // two packs counts once).
    return { packsOn: (data?.packs ?? []).length, totalPacks: Math.max(PACKS.length, data?.known.length ?? 0), checks: checks.size };
  }, [enabled, data]);

  const [q, setQ] = useState("");
  const [stateFilter, setStateFilter] = useState<"all" | "on" | "off">("all");
  const [typeFilter, setTypeFilter] = useState<DocType | "all">("all");

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return PACKS.filter((p) => {
      const on = !!enabled[p.id];
      if (stateFilter === "on" && !on) return false;
      if (stateFilter === "off" && on) return false;
      if (typeFilter !== "all" && !p.docTypes.includes(typeFilter)) return false;
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        p.region.toLowerCase().includes(term) ||
        p.checks.some((c) => categoryLabel(c).toLowerCase().includes(term))
      );
    });
  }, [enabled, q, stateFilter, typeFilter]);

  const filtering = q.trim() !== "" || stateFilter !== "all" || typeFilter !== "all";
  const clearFilters = () => {
    setQ("");
    setStateFilter("all");
    setTypeFilter("all");
  };

  return (
    <>
      <PageHeader
        title="Compliance packs"
        back={{ href: "/settings", label: "Settings" }}
      />

      <SettingsLayout>
        {!roleLoading && !isAdmin && <ReadOnlyNote what="You can see which packs are on; an admin turns them on or off." />}
        <div className="flex flex-col gap-2">
          <SummaryTiles
            items={[
              { label: "Packs enabled", value: loaded ? stats.packsOn : null, unknownLabel: "—", footnote: loaded ? `of ${stats.totalPacks}` : isError ? "Not available" : "Loading" },
              { label: "Clause categories checked", value: loaded ? stats.checks : null, unknownLabel: "—", footnote: "Across enabled packs" },
            ]}
          />
          <p className="text-xs text-[var(--ink-500)]" aria-live="polite">
            <span className="font-medium text-[var(--ink-700)]">
              {save.isPending
                ? "Saving…"
                : !loaded
                  ? isError ? "Couldn\u2019t load your settings." : "Loading your settings…"
                  : data.explicit ? "Saved for your workspace." : "Using the default selection."}
            </span>{" "}
            Changes apply on the next analysis.
          </p>
        </div>

        <div role="toolbar" aria-label="Filter packs" className="flex min-w-0 flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-3">
          <SettingsSearch
            id="pack-search"
            label="Search packs"
            placeholder="Framework, region or clause"
            value={q}
            onChange={setQ}
          />
          <FilterChips
            label="Status"
            value={stateFilter}
            onChange={setStateFilter}
            options={[
              { value: "all", label: "All" },
              { value: "on", label: "Enabled" },
              { value: "off", label: "Disabled" },
            ]}
          />
          <FilterChips
            label="Applies to"
            value={typeFilter}
            onChange={setTypeFilter}
            options={DOC_TYPE_OPTIONS}
          />
          <div className="md:ml-auto">
            <FilterSummary
              // "Other packs" below are part of the list too (shown only when not filtering).
              shown={visible.length + (filtering ? 0 : unknownKnown.length)}
              total={PACKS.length + unknownKnown.length}
              noun="packs"
              active={filtering}
              onClear={clearFilters}
            />
          </div>
        </div>

        {isError && !loaded && (
          <div role="alert" className="flex flex-col items-center rounded-xl border border-border bg-card px-4 py-10 text-center">
            <XCircle size={24} aria-hidden className="mb-3 text-[var(--danger)]" />
            <h2 className="text-base font-semibold text-foreground">Couldn&apos;t load your compliance packs</h2>
            <p className="mt-1.5 max-w-md break-words text-sm leading-relaxed text-[var(--ink-600)]">
              {error instanceof Error ? error.message : "The request failed."} Which packs are on is unknown until this loads, so the switches below are disabled.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}><RefreshCw size={16} aria-hidden />Try again</Button>
          </div>
        )}

        {visible.length === 0 && <NoResults noun="packs" onClear={clearFilters} />}

        {/* Packs */}
        {visible.map((p) => {
          const Icon = PACK_ICON[p.iconKey];
          const on = !!enabled[p.id];
          const live = loaded && on;
          return (
            <SettingsSection
              key={p.id}
              title={
                <span className="flex min-w-0 items-center gap-2">
                  <Icon size={16} aria-hidden className="shrink-0 text-[var(--ink-500)]" />
                  <span className="truncate">{p.name}</span>
                  <span className="truncate text-xs font-normal text-[var(--ink-500)]">{p.region}</span>
                </span>
              }
              action={
                isLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[var(--ink-600)] max-md:min-h-11">
                    <Switch
                      checked={live}
                      disabled={!loaded || !isAdmin || save.isPending}
                      onCheckedChange={() => toggle(p.id)}
                      aria-label={`Enable ${p.name} compliance pack`}
                    />
                    {!loaded ? "Unknown" : live ? "Enabled" : "Disabled"}
                  </label>
                )
              }
            >
              <p className="max-w-[68ch] text-sm leading-relaxed text-[var(--ink-700)]">{p.blurb}</p>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {p.docTypes.map((t) => (
                  <Badge key={t} variant="neutral" size="md" className="text-xs">
                    {docTypeShort(t)}
                  </Badge>
                ))}
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <h3 className="mb-2 text-xs font-medium text-[var(--ink-600)]">
                  Clause categories checked{" "}
                  <span className="tabular-nums text-[var(--ink-500)]">· {p.checks.length}</span>
                </h3>
                <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                  {p.checks.map((c) => (
                    <li key={c} className="flex min-w-0 items-start gap-2 text-sm text-[var(--ink-700)]">
                      <Check
                        size={16}
                        className={cn(
                          "mt-0.5 shrink-0",
                          live ? "text-[var(--brand-primary-600)]" : "text-[var(--ink-500)]",
                        )}
                      />
                      <span className="min-w-0 break-words">{categoryLabel(c)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </SettingsSection>
          );
        })}

        {/* Packs the backend supports that this app has no description for. */}
        {loaded && unknownKnown.length > 0 && !filtering && (
          <SettingsSection title="Other packs" description="Supported by your workspace's backend; this version of the app has no description for them.">
            <ul className="divide-y divide-border">
              {unknownKnown.map((id) => {
                const on = data.packs.includes(id);
                return (
                  <li key={id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="min-w-0 break-words text-sm font-medium text-foreground">{categoryLabel(id)}</span>
                    <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-medium text-[var(--ink-600)] max-md:min-h-11">
                      <Switch checked={on} disabled={!isAdmin || save.isPending} onCheckedChange={() => toggle(id)} aria-label={`Enable ${categoryLabel(id)} compliance pack`} />
                      {on ? "Enabled" : "Disabled"}
                    </label>
                  </li>
                );
              })}
            </ul>
          </SettingsSection>
        )}
      </SettingsLayout>
    </>
  );
}
