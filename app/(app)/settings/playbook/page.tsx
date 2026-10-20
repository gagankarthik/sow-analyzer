"use client";

import { ReadOnlyNote, useAdminAccess } from "@/components/govern/admin/shared";
import { EditionGate } from "@/components/govern/EditionGate";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { SummaryTiles } from "@/components/ds/KpiTile";
import { InfoTip } from "@/components/ui/info-tip";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FilterChips,
  FilterSummary,
  NoResults,
  SettingsLayout,
  SettingsSearch,
  SettingsSection,
} from "@/components/settings/SettingsNav";
import { RuleCard } from "@/components/playbook/RuleCard";
import { RuleDialog, type RuleDialogTarget } from "@/components/playbook/RuleDialog";
import { AlertTriangle, Plus, RefreshCw } from "@/components/ui/icons";
import { categoryLabel } from "@/lib/clause-categories";
import { useDocuments } from "@/lib/queries/documents";
import { usePlaybook, useRevertPlaybookRule } from "@/lib/queries/playbook";
import { RULE_FAMILIES, foundCustomTypes, ruleFamily, type PlaybookRule } from "@/lib/playbook";
import { PanelSkeleton, SkeletonRegion } from "@/components/ds/skeletons";

type SourceFilter = "all" | "custom" | "default";
type CheckFilter = "all" | "auto" | "manual";
const ALL_TYPES = "all";

const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: "all", label: "All rules" },
  { value: "custom", label: "Your rules" },
  { value: "default", label: "Built-in defaults" },
];
const CHECK_OPTIONS: { value: CheckFilter; label: string }[] = [
  { value: "all", label: "Any" },
  { value: "auto", label: "Automatic check" },
  { value: "manual", label: "No automatic check" },
];

const typeName = (r: PlaybookRule) => (r.isCustomType ? r.clauseType : categoryLabel(r.clauseType));

export default function PlaybookPage() {
  return (
    <EditionGate feature="commercialPlaybook">
      <PlaybookPageContent />
    </EditionGate>
  );
}

function PlaybookPageContent() {
  const { isAdmin, loading: roleLoading } = useAdminAccess();
  const { data: playbook, isLoading, error, isFetching, refetch } = usePlaybook();
  // Custom clause types found in the user's documents, offered when adding a rule.
  const { data: docs } = useDocuments();
  const revert = useRevertPlaybookRule();

  const [q, setQ] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [checkFilter, setCheckFilter] = useState<CheckFilter>("all");
  const [typeFilter, setTypeFilter] = useState(ALL_TYPES);
  const [dialog, setDialog] = useState<RuleDialogTarget | null>(null);
  const [confirm, setConfirm] = useState<PlaybookRule | null>(null);

  const rules = useMemo(() => playbook?.rules ?? [], [playbook]);
  const foundTypes = useMemo(() => foundCustomTypes(docs ?? []), [docs]);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rules.filter((r) => {
      if (sourceFilter === "custom" && r.source !== "custom") return false;
      if (sourceFilter === "default" && r.source === "custom") return false;
      if (checkFilter === "auto" && !r.hasAutomaticCheck) return false;
      if (checkFilter === "manual" && r.hasAutomaticCheck) return false;
      if (typeFilter !== ALL_TYPES && r.ruleId !== typeFilter) return false;
      if (!term) return true;
      const haystack = [r.label, typeName(r), r.ruleId, r.standard, r.rationale, r.fallback, ...r.requiredPhrases, ...r.forbiddenPhrases].join(" ");
      return haystack.toLowerCase().includes(term);
    });
  }, [rules, q, sourceFilter, checkFilter, typeFilter]);

  const filtering = q.trim() !== "" || sourceFilter !== "all" || checkFilter !== "all" || typeFilter !== ALL_TYPES;
  const clearFilters = () => { setQ(""); setSourceFilter("all"); setCheckFilter("all"); setTypeFilter(ALL_TYPES); };
  const groups = RULE_FAMILIES
    .map((f) => ({ ...f, rules: visible.filter((r) => ruleFamily(r) === f.id) }))
    .filter((g) => g.rules.length > 0);
  const autoCount = rules.filter((r) => r.hasAutomaticCheck).length;

  async function confirmRevert() {
    const rule = confirm;
    if (!rule) return;
    setConfirm(null);
    try {
      await revert.mutateAsync(rule.ruleId);
      toast.success(rule.hasBuiltInDefault ? "Reverted to the built-in default" : "Rule removed", {
        description: "This applies the next time a document is analyzed or re-analyzed.",
      });
    } catch (e) {
      // The rule is back in the list exactly as it was (see useRevertPlaybookRule).
      toast.error(rule.hasBuiltInDefault ? "Couldn't revert the rule" : "Couldn't remove the rule", {
        description: e instanceof Error ? e.message : "Try again.",
      });
    }
  }

  const openAdd = () => setDialog({ mode: "add", foundTypes, takenRuleIds: rules.map((r) => r.ruleId) });

  return (
    <>
      <PageHeader
        title="Playbook"
        count={playbook ? rules.length : null}
        back={{ href: "/settings", label: "Settings" }}
        actions={isAdmin && playbook ? <Button onClick={openAdd}><Plus size={16} aria-hidden />Add a rule</Button> : undefined}
      />

      <SettingsLayout>
        {!roleLoading && !isAdmin && <ReadOnlyNote what="You can read every rule; an admin makes the changes." />}
        {playbook && (
          <div className="flex flex-col gap-2">
            <SummaryTiles
              items={[
                { label: "Rules", value: rules.length, footnote: playbook.customRuleCount === 0 ? "All built-in defaults" : `${playbook.customRuleCount} yours` },
                { label: "Automatic check", value: autoCount },
                { label: "Compared by you", value: rules.length - autoCount },
              ]}
            />
            <p className="flex items-center gap-1 text-xs text-[var(--ink-600)]">
              A change applies the next time a document is analyzed or re-analyzed.
              <InfoTip label="How playbook changes apply" title="How changes apply" align="start">
                <p>Documents already analyzed keep the result they were given.</p>
                <p className="mt-1.5">A document is graded against the playbook of the workspace it was uploaded into: a document someone shared with you was graded against their playbook, not this one.</p>
                <p className="mt-1.5">A clause whose type has no rule here is reported as &ldquo;no rule&rdquo;. That is not a pass: nothing was checked.</p>
              </InfoTip>
            </p>
          </div>
        )}

        {isLoading ? (
          <SkeletonRegion label="the playbook" className="space-y-4">
            <PanelSkeleton rows={2} actions={false} />
            <PanelSkeleton rows={5} />
            <PanelSkeleton rows={5} />
          </SkeletonRegion>
        ) : !playbook ? (
          <div role="alert" className="flex flex-col items-center rounded-xl border border-border bg-card px-5 py-12 text-center">
            <AlertTriangle size={24} aria-hidden className="mb-3 text-[var(--danger)]" />
            <h2 className="text-base font-semibold text-foreground">Couldn&apos;t load the playbook</h2>
            <p className="mt-1 max-w-md break-words text-sm leading-relaxed text-[var(--ink-700)]">
              {error instanceof Error ? error.message : "The request failed."} No rules are shown because none were received.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw size={16} aria-hidden className={isFetching ? "animate-spin motion-reduce:animate-none" : undefined} />Try again
            </Button>
          </div>
        ) : (
          <>
            <div role="toolbar" aria-label="Filter rules" className="flex min-w-0 flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-3">
              <SettingsSearch id="playbook-search" label="Search rules" placeholder="Rule, clause type or wording" value={q} onChange={setQ} />
              <FilterChips label="Source" options={SOURCE_OPTIONS} value={sourceFilter} onChange={setSourceFilter} />
              <FilterChips label="Check" options={CHECK_OPTIONS} value={checkFilter} onChange={setCheckFilter} />
              <div className="flex min-w-0 items-center gap-2">
                <label htmlFor="playbook-type" className="shrink-0 text-xs text-[var(--ink-500)]">Clause type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger id="playbook-type" className="h-8 w-full min-w-0 text-xs md:w-48 max-md:h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_TYPES}>All clause types</SelectItem>
                    {[...rules].sort((a, b) => typeName(a).localeCompare(typeName(b))).map((r) => (
                      <SelectItem key={r.ruleId} value={r.ruleId}>{typeName(r)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:ml-auto">
                <FilterSummary shown={visible.length} total={rules.length} noun="rules" active={filtering} onClear={clearFilters} />
              </div>
            </div>

            {rules.length === 0 ? (
              <div className="flex flex-col items-center rounded-xl border border-border bg-card px-5 py-12 text-center">
                <h2 className="text-base font-semibold text-foreground">The playbook has no rules</h2>
                <p className="mt-1 max-w-md text-sm leading-relaxed text-[var(--ink-600)]">
                  The API returned an empty playbook, so no clause is being checked. Add a rule for a custom clause type to start.
                </p>
              </div>
            ) : visible.length === 0 ? (
              <NoResults noun="rules" onClear={clearFilters} />
            ) : (
              groups.map((g) => (
                <SettingsSection
                  key={g.id}
                  id={`family-${g.id}`}
                  title={<>{g.label} <span className="ml-1 text-xs font-normal tabular-nums text-[var(--ink-500)]">{g.rules.length}</span></>}
                  description={g.description}
                  flush
                >
                  <ul className="divide-y divide-border">
                    {g.rules.map((r) => (
                      <li key={r.ruleId}>
                        <RuleCard
                          rule={r}
                          reverting={revert.isPending && revert.variables === r.ruleId}
                          onEdit={() => setDialog({ mode: "edit", rule: r })}
                          onRevert={() => setConfirm(r)}
                          readOnly={!isAdmin}
                        />
                      </li>
                    ))}
                  </ul>
                </SettingsSection>
              ))
            )}
          </>
        )}
      </SettingsLayout>

      <RuleDialog target={dialog} onClose={() => setDialog(null)} />

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.hasBuiltInDefault ? `Revert “${confirm.label}” to the built-in default?` : `Remove the rule “${confirm?.label ?? ""}”?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.hasBuiltInDefault
                ? "Your wording, thresholds and wording checks for this clause type are deleted and the built-in default applies again."
                : "This clause type has no built-in default. Without this rule, its clauses are reported as “no rule”: nothing is checked."}
              {" "}Documents already analyzed keep their current result until they are analyzed again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my rule</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmRevert}>
              {confirm?.hasBuiltInDefault ? "Revert to default" : "Remove rule"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
