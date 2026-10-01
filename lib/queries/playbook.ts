"use client";

/**
 * The workspace's playbook, read from and written to the API (`/playbook`).
 *
 * Writes are optimistic: the rule changes on screen at once and is put back
 * exactly as it was if the API refuses. After every write the server's own
 * description of the rule replaces the local one, then the list is re-read.
 *
 * Saving a rule does not re-grade documents: a changed rule applies the next
 * time a document is analysed or re-analysed. Nothing here touches document
 * queries for that reason.
 */

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { deletePlaybookRule, getPlaybook, isPermanentError, savePlaybookRule } from "@/lib/api";
import { withTotals, type Playbook, type PlaybookRule, type PlaybookRuleInput } from "@/lib/playbook";

export const playbookKeys = {
  all: ["playbook"] as const,
};

const WRITE_KEY = ["playbook", "write"] as const;

export function usePlaybook(): UseQueryResult<Playbook> {
  return useQuery({
    queryKey: playbookKeys.all,
    queryFn: getPlaybook,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // A 4xx will not get better by asking again.
    retry: (failures, error) => failures < 2 && !isPermanentError(error),
  });
}

const byRuleId = (a: PlaybookRule, b: PlaybookRule) => a.ruleId.localeCompare(b.ruleId);

function replaceRule(pb: Playbook, ruleId: string, next: PlaybookRule | null): Playbook {
  const others = pb.rules.filter((r) => r.ruleId !== ruleId);
  return withTotals(next ? [...others, next].sort(byRuleId) : others, pb.appliesTo);
}

/** What a rule will look like once the API has taken `input`, as far as the
 *  client can tell. The server's answer replaces it when it arrives. */
function optimisticRule(ruleId: string, input: PlaybookRuleInput, current: PlaybookRule | undefined): PlaybookRule {
  const isCustomType = ruleId.startsWith("type.");
  const requiredPhrases = input.requiredPhrases?.length ? input.requiredPhrases : current?.requiredPhrases ?? [];
  const forbiddenPhrases = input.forbiddenPhrases?.length ? input.forbiddenPhrases : current?.forbiddenPhrases ?? [];
  return {
    ruleId,
    clauseType: current?.clauseType ?? (isCustomType ? ruleId.slice("type.".length) : ruleId),
    isCustomType,
    label: input.label?.trim() || current?.label || ruleId,
    standard: input.standard?.trim() || current?.standard || "",
    rationale: input.rationale?.trim() || current?.rationale || null,
    fallback: input.fallback?.trim() || current?.fallback || null,
    thresholds: { ...(current?.thresholds ?? {}), ...(input.thresholds ?? {}) },
    requiredPhrases,
    forbiddenPhrases,
    phraseSeverity: input.severity ?? current?.phraseSeverity ?? "moderate",
    source: "custom",
    // A built-in check stays; phrase lists are themselves an automatic check.
    hasAutomaticCheck: !!current?.hasAutomaticCheck || requiredPhrases.length > 0 || forbiddenPhrases.length > 0,
    hasBuiltInDefault: current?.hasBuiltInDefault ?? false,
  };
}

function useSettle() {
  const qc = useQueryClient();
  return () => {
    // With several writes in flight, only the last one re-reads the server
    // state; an earlier refetch would briefly undo a later optimistic change.
    if (qc.isMutating({ mutationKey: WRITE_KEY }) <= 1) {
      void qc.invalidateQueries({ queryKey: playbookKeys.all });
    }
  };
}

/** Create or replace one workspace rule. */
export function useSavePlaybookRule() {
  const qc = useQueryClient();
  const settle = useSettle();
  return useMutation({
    mutationKey: WRITE_KEY,
    mutationFn: ({ ruleId, input }: { ruleId: string; input: PlaybookRuleInput }) => savePlaybookRule(ruleId, input),
    onMutate: async ({ ruleId, input }) => {
      await qc.cancelQueries({ queryKey: playbookKeys.all });
      const previous = qc.getQueryData<Playbook>(playbookKeys.all);
      if (previous) {
        const current = previous.rules.find((r) => r.ruleId === ruleId);
        qc.setQueryData<Playbook>(playbookKeys.all, replaceRule(previous, ruleId, optimisticRule(ruleId, input, current)));
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(playbookKeys.all, context.previous);
    },
    onSuccess: (rule, { ruleId }) => {
      if (!rule) return; // the refetch below is the source of truth
      qc.setQueryData<Playbook>(playbookKeys.all, (pb) => (pb ? replaceRule(pb, ruleId, rule) : pb));
    },
    onSettled: settle,
  });
}

/** Remove the workspace's own rule: back to the built-in default, or to no
 *  rule at all for a custom clause type. */
export function useRevertPlaybookRule() {
  const qc = useQueryClient();
  const settle = useSettle();
  return useMutation({
    mutationKey: WRITE_KEY,
    mutationFn: (ruleId: string) => deletePlaybookRule(ruleId),
    onMutate: async (ruleId) => {
      await qc.cancelQueries({ queryKey: playbookKeys.all });
      const previous = qc.getQueryData<Playbook>(playbookKeys.all);
      const current = previous?.rules.find((r) => r.ruleId === ruleId);
      // A custom type has no default to fall back to, so its rule simply goes.
      // For a built-in type the default's wording is only known to the server:
      // the row stays as it is (marked as reverting by the caller) until the
      // API answers, rather than showing text that might not be the default.
      if (previous && current && !current.hasBuiltInDefault) {
        qc.setQueryData<Playbook>(playbookKeys.all, replaceRule(previous, ruleId, null));
      }
      return { previous };
    },
    onError: (_err, _ruleId, context) => {
      if (context?.previous) qc.setQueryData(playbookKeys.all, context.previous);
    },
    onSuccess: (rule, ruleId) => {
      qc.setQueryData<Playbook>(playbookKeys.all, (pb) => (pb ? replaceRule(pb, ruleId, rule) : pb));
    },
    onSettled: settle,
  });
}
