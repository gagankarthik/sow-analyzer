"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MotionReveal } from "@/components/MotionReveal";
import { categoryLabel } from "@/lib/clause-categories";
import { docTypeShort } from "@/lib/doc-types";
import {
  COMPLIANCE_PACKS as PACKS,
  PACKS_STORAGE_KEY as STORAGE_KEY,
  readEnabledPacks,
  type PackIconKey,
} from "@/lib/compliance-packs";
import { getCompliancePacks, saveCompliancePacks } from "@/lib/api";
import { ShieldCheck, Lock, Globe2, Database, BookMarked, Check } from "@/components/ui/icons";

function writeMirror(enabled: Record<string, boolean>) {
  // Mirror to localStorage so the dashboard's useEnabledPacks reads it instantly.
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enabled));
  } catch {
    /* ignore quota/private-mode */
  }
}

const PACK_ICON: Record<PackIconKey, typeof ShieldCheck> = {
  gdpr: Globe2,
  hipaa: ShieldCheck,
  soc2: Lock,
  ccpa: Database,
  iso: BookMarked,
};

export default function CompliancePacksPage() {
  // Lazy-init from the localStorage cache (returns defaults on the server); the
  // `mounted` flag gates hydration-sensitive UI so SSR and first render match.
  const [enabled, setEnabled] = useState<Record<string, boolean>>(readEnabledPacks);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [saving, setSaving] = useState(false);

  // Hydrate from the backend (the per-tenant source of truth) and mirror it to
  // localStorage so the cache + dashboard reflect what's actually saved.
  useEffect(() => {
    let cancelled = false;
    getCompliancePacks()
      .then((state) => {
        if (cancelled) return;
        const on = new Set(state.packs);
        const next = Object.fromEntries(PACKS.map((p) => [p.id, on.has(p.id)]));
        setEnabled(next);
        writeMirror(next);
      })
      .catch(() => {
        /* offline / API not configured — keep the localStorage cache */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (id: string) => {
    const next = { ...enabled, [id]: !enabled[id] };
    setEnabled(next);
    writeMirror(next);
    const ids = PACKS.filter((p) => next[p.id]).map((p) => p.id);
    setSaving(true);
    saveCompliancePacks(ids)
      .catch((err: unknown) =>
        toast.error("Couldn't save compliance packs", {
          description: err instanceof Error ? err.message : "Please try again.",
        }),
      )
      .finally(() => setSaving(false));
  };

  const stats = useMemo(() => {
    const on = PACKS.filter((p) => enabled[p.id]);
    const checks = new Set<string>();
    on.forEach((p) => p.checks.forEach((c) => checks.add(c)));
    return { packsOn: on.length, totalPacks: PACKS.length, checks: checks.size };
  }, [enabled]);

  return (
    <>
      <PageHeader
        eyebrow="Settings · Contract intelligence"
        title="Compliance packs"
        subtitle="Turn on a framework and Sonar grades every DPA, BAA, and compliance document against its obligations — flagging missing or weak clauses."
        back={{ href: "/settings", label: "Settings" }}
      />

      <div className="app-container py-6 md:py-8 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Stat label="Packs enabled" value={mounted ? `${stats.packsOn}` : "—"} sub={`of ${stats.totalPacks}`} />
          <Stat label="Active checks" value={mounted ? `${stats.checks}` : "—"} sub="clause obligations" />
          <Stat label="Applies to" value="DPA · BAA" sub="& compliance docs" />
        </div>

        {/* Packs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {PACKS.map((p, i) => {
            const Icon = PACK_ICON[p.iconKey];
            const on = !!enabled[p.id];
            return (
              <MotionReveal key={p.id} delay={Math.min(i * 0.04, 0.18)}>
                <div
                  data-on={on}
                  className="h-full rounded-2xl border border-border bg-card p-5 shadow-xs transition-colors data-[on=true]:border-[var(--brand-primary-300)]"
                >
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted border border-border">
                      <Icon size={16} className="text-foreground" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[15px] font-semibold tracking-tight text-foreground">{p.name}</h3>
                        {mounted && on && <Badge variant="success" size="sm">On</Badge>}
                      </div>
                      <p className="text-[11.5px] text-muted-foreground">{p.region}</p>
                    </div>
                    <Switch
                      checked={mounted ? on : false}
                      onCheckedChange={() => toggle(p.id)}
                      aria-label={`Enable ${p.name} compliance pack`}
                    />
                  </div>

                  <p className="mt-3 text-[12.5px] text-muted-foreground leading-relaxed">{p.blurb}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {p.docTypes.map((t) => (
                      <Badge key={t} variant="neutral" size="sm">
                        {docTypeShort(t)}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-4 border-t border-border pt-3">
                    <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">
                      Clauses graded · {p.checks.length}
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                      {p.checks.map((c) => (
                        <li key={c} className="flex items-start gap-1.5 text-[12px] text-foreground/80">
                          <Check
                            size={12}
                            className={`mt-0.5 shrink-0 ${mounted && on ? "text-[var(--brand-primary-600)]" : "text-muted-foreground/40"}`}
                          />
                          <span>{categoryLabel(c)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </MotionReveal>
            );
          })}
        </div>

        <p className="flex items-center gap-2 text-[12px] text-muted-foreground">
          {saving ? (
            <span className="inline-flex items-center gap-1.5 text-[var(--brand-primary-600)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-primary-600)] animate-pulse" />
              Saving…
            </span>
          ) : mounted ? (
            <span className="inline-flex items-center gap-1.5">
              <Check size={13} className="text-[var(--success)]" />
              Synced to your workspace
            </span>
          ) : null}
          <span className="text-muted-foreground/70">
            · Applied on the next analysis — re-analyse a document to grade it against newly enabled frameworks.
          </span>
        </p>
      </div>
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-[24px] font-bold tracking-tight text-foreground tabular-nums">{value}</span>
        <span className="text-[11.5px] text-muted-foreground">{sub}</span>
      </div>
    </div>
  );
}
