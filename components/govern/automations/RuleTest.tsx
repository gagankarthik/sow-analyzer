"use client";

// "Test on a contract": pick a contract, run the rule as it stands in the
// builder (saved or not) and see whether the trigger and each condition
// match and what every action would do. A dry run: the API writes nothing.

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Check, CheckCircle2, Loader2, Search, X, XCircle } from "@/components/ui/icons";
import { conditionSummary } from "@/lib/govern/automations";
import { stageLabel } from "@/lib/govern/labels";
import { displayTitle } from "@/lib/format";
import { useContracts, useOrgCurrency, useTestAutomation } from "@/lib/govern/queries";
import type { AutomationInput, AutomationTest, Contract } from "@/lib/govern/types";
import { cn } from "@/lib/utils";

const MAX_MATCHES = 6;

export function RuleTest({ ruleId, rule }: { ruleId: string | null; rule: AutomationInput | null }) {
  const contracts = useContracts(true);
  const test = useTestAutomation();
  const [query, setQuery] = React.useState("");
  const [picked, setPicked] = React.useState<Contract | null>(null);
  const id = React.useId();

  const list = React.useMemo(() => contracts.data?.contracts ?? [], [contracts.data]);
  const q = query.trim().toLowerCase();
  const matches = React.useMemo(() => {
    if (!q) return [];
    return list
      .filter((c) => `${c.title} ${c.counterparty ?? ""} ${c.contractId}`.toLowerCase().includes(q))
      .slice(0, MAX_MATCHES);
  }, [list, q]);

  function choose(c: Contract) {
    setPicked(c);
    setQuery("");
    test.reset();
  }

  function run() {
    if (!picked || !rule) return;
    test.mutate({ id: ruleId, contractId: picked.contractId, rule });
  }

  return (
    <div className="grid gap-2">
      {picked ? (
        <div className="flex min-w-0 items-center gap-2 rounded-md border border-border-default bg-[var(--ink-50)] px-2.5 py-1.5">
          <span className="min-w-0 flex-1 truncate text-sm text-foreground" title={displayTitle(picked.title)}>
            {displayTitle(picked.title)}
            <span className="text-[var(--ink-500)]"> · {stageLabel(picked.stage)}</span>
          </span>
          <button
            type="button"
            onClick={() => { setPicked(null); test.reset(); }}
            aria-label="Choose another contract"
            className="inline-flex size-6 shrink-0 items-center justify-center rounded text-[var(--ink-500)] hover:text-foreground focus-visible:outline-2 focus-visible:outline-[var(--brand-primary-600)] max-md:size-11"
          >
            <X size={12} aria-hidden />
          </button>
        </div>
      ) : (
        <div className="relative">
          <label htmlFor={`${id}-search`} className="sr-only">Find a contract to test on</label>
          <Search size={16} aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-500)]" />
          <input
            id={`${id}-search`}
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={contracts.isLoading ? "Loading contracts…" : "Find a contract by title or counterparty"}
            aria-controls={`${id}-matches`}
            className="h-8 w-full rounded-md border border-[var(--ink-300)] bg-card pl-8 pr-2.5 text-sm text-foreground placeholder:text-[var(--ink-500)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--brand-primary-600)] max-md:h-11"
          />
          {q && (
            <ul id={`${id}-matches`} aria-label="Matching contracts" className="mt-1 overflow-hidden rounded-md border border-border-default bg-card">
              {matches.length === 0 ? (
                <li className="px-2.5 py-2 text-sm text-[var(--ink-500)]">No contract matches.</li>
              ) : (
                matches.map((c) => (
                  <li key={c.contractId} className="border-b border-border-subtle last:border-b-0">
                    <button
                      type="button"
                      onClick={() => choose(c)}
                      className="flex w-full min-w-0 items-center gap-2 px-2.5 py-1.5 text-start text-sm hover:bg-[var(--ink-50)] focus-visible:bg-[var(--ink-50)] focus-visible:outline-none max-md:min-h-11"
                    >
                      <span className="min-w-0 flex-1 truncate">{displayTitle(c.title)}</span>
                      <span className="shrink-0 text-xs text-[var(--ink-500)]">{stageLabel(c.stage)}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={run} disabled={!picked || !rule || test.isPending} aria-busy={test.isPending || undefined}>
          {test.isPending && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden />}
          Run test
        </Button>
        {!rule && <span className="text-xs text-[var(--ink-500)]">Finish the rule to test it.</span>}
      </div>

      {test.isError && (
        <p role="alert" className="text-xs text-[var(--danger)]">
          {test.error instanceof Error ? test.error.message : "The test failed."} Try again.
        </p>
      )}
      {test.data && <TestResult result={test.data} />}
    </div>
  );
}

function Mark({ ok }: { ok: boolean }) {
  return ok
    ? <Check size={16} aria-label="Matches" className="shrink-0 text-[var(--success)]" />
    : <X size={16} aria-label="Does not match" className="shrink-0 text-[var(--ink-500)]" />;
}

function TestResult({ result }: { result: AutomationTest }) {
  const currency = useOrgCurrency();
  const verdict = result.wouldFire
    ? "It would run now."
    : result.alreadyRan
      ? "It already ran for this. It runs again next time it qualifies."
      : !result.enabled
        ? "The rule is off."
        : "It would not run now.";
  return (
    <div aria-live="polite" className="grid gap-2 rounded-md border border-border-default">
      <p className="flex items-center gap-2 border-b border-border-default px-3 py-2 text-sm font-medium text-foreground">
        {result.wouldFire
          ? <CheckCircle2 size={16} aria-hidden className="text-[var(--success)]" />
          : <XCircle size={16} aria-hidden className="text-[var(--ink-500)]" />}
        {verdict}
      </p>
      <ul className="grid gap-1.5 px-3 text-sm">
        <li className="flex items-start gap-2">
          <Mark ok={result.trigger.matched} />
          <span className="min-w-0"><span className="font-medium">When</span> <span className="text-[var(--ink-700)]">{result.trigger.detail}</span></span>
        </li>
        {result.conditions.map((c, i) => (
          <li key={i} className="flex items-start gap-2">
            <Mark ok={c.matched} />
            <span className="min-w-0 text-[var(--ink-700)]">
              {conditionSummary(c, currency)}
              <span className="text-[var(--ink-500)]"> · is {formatActual(c.actual)}</span>
            </span>
          </li>
        ))}
      </ul>
      <ul className="grid gap-1.5 border-t border-border-default px-3 py-2 text-sm">
        {result.actions.map((a, i) => (
          <li key={i} className={cn("min-w-0", !a.wouldRun && "text-[var(--ink-500)]")}>
            <span className={cn(!a.wouldRun && "line-through decoration-[var(--ink-300)]")}>{a.summary}</span>
            {a.reason && <span className="block text-xs text-[var(--ink-500)]">{a.reason}</span>}
          </li>
        ))}
      </ul>
      {!result.featureEnabled && (
        <p className="border-t border-border-default px-3 py-2 text-xs text-[var(--ink-600)]">Automations are off for your organization, so nothing runs.</p>
      )}
      <p className="sr-only">This was a test. Nothing was changed.</p>
    </div>
  );
}

function formatActual(v: unknown): string {
  if (v === null || v === undefined || v === "") return "not set";
  if (typeof v === "number") return v.toLocaleString("en-US");
  return String(v);
}
