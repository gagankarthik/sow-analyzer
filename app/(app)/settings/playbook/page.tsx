"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  const { data: playbook, isLoading, isError, error, isFetching, refetch } = usePlaybook();
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
        description: "This applies the next time a document is analysed or re-analysed.",
      });
    } catch (e) {
      // The rule is back in the list exactly as it was (see useRevertPlaybookRule).
      toast.error(rule.hasBuiltInDefault ? "Couldn't revert the rule" : "Couldn't remove the rule", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    }
  }

  const openAdd = () => setDialog({ mode: "add", foundTypes, takenRuleIds: rules.map((r) => r.ruleId) });

  return (
    <>
      <PageHeader
        title="Playbook"
        subtitle="The standard positions your documents are graded against, clause type by clause type."
        back={{ href: "/settings", label: "Settings" }}
      />

      <SettingsLayout>
        {/* Focal block: how many rules, and exactly when a change takes effect. */}
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-card p-5 text-foreground shadow-xs md:grid-cols-12 md:gap-8">
          <div className="min-w-0 md:col-span-4">
            <div className="text-sm font-medium text-[var(--ink-600)]">Rules in your playbook</div>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
              <span className="text-3xl font-semibold leading-none tracking-tight tabular-nums">{playbook ? rules.length : "—"}</span>
              {playbook && (
                <span className="text-base text-[var(--ink-600)]">
                  {playbook.customRuleCount === 0 ? "all built-in defaults" : `${playbook.customRuleCount} yours`}
                </span>
              )}
            </div>
            {playbook && (
              <p className="mt-2 text-sm text-[var(--ink-600)]">
                {autoCount} with an automatic check · {rules.length - autoCount} flagged for you to compare
              </p>
            )}
          </div>
          <div className="min-w-0 space-y-1.5 text-sm leading-relaxed text-[var(--ink-600)] md:col-span-8">
            {playbook ? (
              <>
                <p><span className="font-semibold text-foreground">A change applies the next time a document is analysed or re-analysed.</span> Documents already analysed keep the result they were given.</p>
                <p>A document is graded against the playbook of the workspace it was uploaded into: a document someone else uploaded and shared with you was graded against their playbook, not this one.</p>
                <p>A clause whose type has no rule here is reported as &ldquo;no rule&rdquo;. That is not a pass: nothing was checked.</p>
              </>
            ) : isError ? (
              <p>The playbook couldn&apos;t be loaded, so its rules are unknown.</p>
            ) : (
              <p>Loading the playbook…</p>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading the playbook">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : !playbook ? (
          <div role="alert" className="flex flex-col items-center rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-5 py-12 text-center">
            <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-card text-[var(--danger)]"><AlertTriangle size={18} /></span>
            <h2 className="text-lg font-semibold text-foreground">Couldn&apos;t load the playbook</h2>
            <p className="mt-1 max-w-md break-words text-sm leading-relaxed text-[var(--ink-700)]">
              {error instanceof Error ? error.message : "The request failed."} No rules are shown because none were received.
            </p>
            <Button variant="outline" size="lg" className="mt-5" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw size={14} className={isFetching ? "animate-spin motion-reduce:animate-none" : undefined} />Try again
            </Button>
          </div>
        ) : (
          <>
            {/* Search, filters and the page's one primary action */}
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <SettingsSearch id="playbook-search" label="Search rules" placeholder="Rule, clause type or wording" value={q} onChange={setQ} />
                <Button size="lg" className="w-full md:w-auto" onClick={openAdd}><Plus size={15} />Add a rule</Button>
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                <div className="min-w-0 lg:col-span-5"><FilterChips label="Source" options={SOURCE_OPTIONS} value={sourceFilter} onChange={setSourceFilter} /></div>
                <div className="min-w-0 lg:col-span-4"><FilterChips label="Check" options={CHECK_OPTIONS} value={checkFilter} onChange={setCheckFilter} /></div>
                <div className="min-w-0 lg:col-span-3">
                  <label htmlFor="playbook-type" className="mb-1.5 block text-sm font-medium text-[var(--ink-600)]">Clause type</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger id="playbook-type" className="h-10! w-full bg-card text-sm sm:h-8!"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_TYPES}>All clause types</SelectItem>
                      {[...rules].sort((a, b) => typeName(a).localeCompare(typeName(b))).map((r) => (
                        <SelectItem key={r.ruleId} value={r.ruleId}>{typeName(r)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <FilterSummary shown={visible.length} total={rules.length} noun="rules" active={filtering} onClear={clearFilters} />
            </div>

            {rules.length === 0 ? (
              <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-5 py-12 text-center">
                <h2 className="text-lg font-semibold text-foreground">The playbook has no rules</h2>
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
                  title={<>{g.label} <span className="ml-1 text-sm font-normal tabular-nums text-muted-foreground">{g.rules.length}</span></>}
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
              {" "}Documents already analysed keep their current result until they are analysed again.
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
