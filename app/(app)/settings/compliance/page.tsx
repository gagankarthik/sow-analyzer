"use client";

import { ReadOnlyNote, useAdminAccess } from "@/components/govern/admin/shared";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
          description: `${err instanceof Error ? err.message : "Please try again."} The switch was put back.`,
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
        subtitle="Turn on a framework and Sonar grades compliance documents against its obligations."
        back={{ href: "/settings", label: "Settings" }}
      />

      <SettingsLayout>
        {!roleLoading && !isAdmin && <ReadOnlyNote what="You can see which packs are on; an admin turns them on or off." />}
        {/* Summary — the page's focal block */}
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 text-foreground shadow-xs sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="grid grid-cols-2 gap-6 sm:flex sm:gap-10">
            <Stat label="Packs enabled" value={loaded ? `${stats.packsOn}` : "—"} sub={loaded ? `of ${stats.totalPacks}` : isError ? "not available" : "loading"} />
            <Stat label="Clause categories checked" value={loaded ? `${stats.checks}` : "—"} sub="across enabled packs" />
          </div>
          <p className="max-w-[44ch] text-sm leading-relaxed text-[var(--ink-600)]" aria-live="polite">
            <span className="font-semibold text-foreground">
              {save.isPending
                ? "Saving…"
                : !loaded
                  ? isError ? "Couldn\u2019t load your settings." : "Loading your settings…"
                  : data.explicit ? "Saved for your workspace." : "Using the default selection. Your workspace hasn\u2019t chosen yet."}
            </span>{" "}
            Changes apply on the next analysis. Re-analyse a document to grade it against a newly enabled pack.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5">
          <SettingsSearch
            id="pack-search"
            label="Search packs"
            placeholder="Framework, region or clause"
            value={q}
            onChange={setQ}
          />
          <div className="flex flex-col gap-4 md:flex-row md:gap-8">
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
          </div>
          <FilterSummary
            shown={visible.length}
            total={PACKS.length}
            noun="packs"
            active={filtering}
            onClear={clearFilters}
          />
        </div>

        {isError && !loaded && (
          <div role="alert" className="flex flex-col items-center rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-10 text-center">
            <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-card text-[var(--danger)]"><XCircle size={22} strokeWidth={1.75} /></span>
            <h2 className="text-lg font-semibold text-foreground">Couldn&apos;t load your compliance packs</h2>
            <p className="mt-1.5 max-w-md break-words text-sm leading-relaxed text-[var(--ink-600)]">
              {error instanceof Error ? error.message : "The request failed."} Which packs are on is unknown until this loads, so the switches below are disabled.
            </p>
            <Button variant="outline" size="lg" className="mt-5" onClick={() => refetch()}><RefreshCw size={14} />Try again</Button>
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
              className={cn(live && "border-[var(--brand-primary-300)]")}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  <Icon size={16} className="shrink-0 text-[var(--ink-700)]" />
                  {p.name}
                  {live && (
                    <Badge variant="success" size="md" className="text-xs">
                      On
                    </Badge>
                  )}
                </span>
              }
              description={p.region}
              action={
                isLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm font-medium text-[var(--ink-600)]">
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
              <p className="max-w-[58ch] text-base leading-relaxed text-[var(--ink-600)]">{p.blurb}</p>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {p.docTypes.map((t) => (
                  <Badge key={t} variant="neutral" size="md" className="text-xs">
                    {docTypeShort(t)}
                  </Badge>
                ))}
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <h3 className="text-base font-semibold mb-2.5 text-foreground">
                  Clause categories checked{" "}
                  <span className="font-medium text-muted-foreground tabular-nums">· {p.checks.length}</span>
                </h3>
                <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                  {p.checks.map((c) => (
                    <li key={c} className="flex min-w-0 items-start gap-2 text-sm text-[var(--ink-700)]">
                      <Check
                        size={14}
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
          <SettingsSection title="Other packs" description="Supported by your workspace's backend. This version of the app has no description for them.">
            <ul className="divide-y divide-border">
              {unknownKnown.map((id) => {
                const on = data.packs.includes(id);
                return (
                  <li key={id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="min-w-0 break-words text-base font-medium text-foreground">{categoryLabel(id)}</span>
                    <label className="flex min-h-10 shrink-0 cursor-pointer items-center gap-3 text-sm font-medium text-[var(--ink-600)]">
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

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0">
      <div className="text-sm font-medium text-[var(--ink-600)]">{label}</div>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-3xl font-semibold leading-none tracking-tight tabular-nums">{value}</span>
        <span className="text-sm text-[var(--ink-600)]">{sub}</span>
      </div>
    </div>
  );
}
