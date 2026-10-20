"use client";

/**
 * React Query hooks for Govern. Every page that shows contracts (leader home,
 * board, reports, contract page) reads the one `useContracts()` query, so their
 * counts agree. A write returns the updated contract; it is put in the detail
 * cache straight away and the list is re-read.
 *
 * Days in stage and the next step are computed by the API at read time, so the
 * list refreshes every minute while a page is open (and on focus).
 */

import { EDITION_AGREEMENT_TYPES, EDITION_TERMS, editionHas, resolveEdition, type Edition, type EditionFeature, type EditionTerms } from "@/lib/edition";
import { useMemo, useState } from "react";
import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { deleteDocument, isNotFound, isPermanentError, reprocessDocument } from "@/lib/api";
import { resolveFeatures, type GovernFeature, type GovernFeatureFlags } from "./features";
import { documentKeys } from "@/lib/queries/documents";
import {
  addBlocker, addObligation, createContract, getContractActivity, listObligations, getCaptureReport, getContract, getTrends, getGovernMe, getMatrix, getMatrixVersion, getSyncLog,
  getUnmatchedContracts, getWorkflowSettings, importMatrix, listConnectors, listContracts,
  patchContract, removeContract, rescoreContract, runConnectorSync, runContractAction, saveConnector, saveIncome,
  saveMatrix, saveWorkflowSettings, updateBlocker, updateObligation,
  bulkUpdateContracts, createView, deleteView, listGovernPeople, listViews, updateView,
  createAutomation, deleteAutomation, listAutomations, testAutomation, updateAutomation,
  addOrgAdmin, getGovernOrg, removeOrgAdmin,
} from "./api";
import { chunk, mergeBulkResponses } from "./bulk";
import { mergeActivity } from "./activity";
import { pollInterval, useGovernLive } from "./realtime-state";
import type {
  AgreementType, BlockerInput, CaptureReport, Trends, Connector, ConnectorId, ConnectorInput, Contract, ContractAction,
  ContractDetail, ContractPatch, GovernMe, GovernOrg, IncomeItem, Matrix, MatrixImportRow, MatrixPlaybook,
  MatrixVersionInfo, ObligationInput, SyncRun, WorkflowSettings, WorkflowSettingsInput,
  BulkUpdateInput, DirectoryPerson, SavedView, SavedViewInput, SavedViewPatch, ViewModule,
  Automation, AutomationInput, AutomationList,
} from "./types";

export const governKeys = {
  // One cached list for every caller: open-only views filter it on the client,
  // so a page that needs both never fetches the list twice.
  contracts: () => ["govern", "contracts", "all"] as const,
  allContracts: ["govern", "contracts"] as const,
  contract: (id: string) => ["govern", "contract", id] as const,
  /** Older activity pages, continuing from the detail's cursor (a new cursor starts over). */
  activity: (id: string, cursor: string | null) => ["govern", "contract-activity", id, cursor] as const,
  matrix: ["govern", "matrix"] as const,
  matrixVersion: (v: number) => ["govern", "matrix", "version", v] as const,
  settings: ["govern", "settings"] as const,
  connectors: ["govern", "connectors"] as const,
  syncLog: ["govern", "sync-log"] as const,
  unmatched: ["govern", "unmatched"] as const,
  me: ["govern", "me"] as const,
  org: ["govern", "org"] as const,
  trends: (g: string, n: number) => ["govern", "trends", g, n] as const,
  capture: ["govern", "capture"] as const,
  obligations: ["govern", "obligations"] as const,
  views: (module: ViewModule) => ["govern", "views", module] as const,
  people: ["govern", "people"] as const,
  automations: ["govern", "automations"] as const,
};

const MINUTE = 60_000;

function retryTransient(failureCount: number, error: Error): boolean {
  return !isPermanentError(error) && failureCount < 2;
}

// ── Reads ──────────────────────────────────────────────────────────────────

/** States the open-only list leaves out (the server's TERMINAL_STATES). */
const TERMINAL_STATES = new Set(["rejected", "closed"]);

type ContractList = { contracts: Contract[]; generatedAt: string | null };

function openOnly(d: ContractList): ContractList {
  return { ...d, contracts: d.contracts.filter((c) => !TERMINAL_STATES.has(c.state)) };
}

export function useContracts(includeClosed = false): UseQueryResult<ContractList> {
  const live = useGovernLive();
  return useQuery({
    queryKey: governKeys.contracts(),
    queryFn: () => listContracts(true),
    select: includeClosed ? undefined : openOnly,
    staleTime: 15_000,
    // Other people's changes arrive over the real-time channel (lib/govern/realtime.ts);
    // without it they show within a minute (the list call is heavy on the
    // server). A person's own changes show at once: each mutation writes its
    // result into the cache.
    refetchInterval: pollInterval(live, MINUTE),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: retryTransient,
  });
}

export function useContract(id: string): UseQueryResult<ContractDetail> {
  const live = useGovernLive();
  return useQuery({
    queryKey: governKeys.contract(id),
    queryFn: () => getContract(id),
    enabled: !!id,
    staleTime: 15_000,
    // A revision being analyzed changes the contract when Sonar finishes.
    refetchInterval: (query) => {
      if (isPermanentError(query.state.error)) return false;
      const c = query.state.data as ContractDetail | undefined;
      return c && c.analysisStatus !== "READY" && c.analysisStatus !== "FAILED" ? 5_000 : pollInterval(live, MINUTE);
    },
    refetchOnWindowFocus: true,
    retry: retryTransient,
  });
}

/**
 * The contract's timeline: the newest entries the detail carries, then older
 * pages from GET /contracts/{id}/activity on "Show older". Nothing is fetched
 * until then. An older API (no `activityCount`) sends up to 200 entries and
 * no cursor: everything it has is shown and there is nothing older to load.
 */
export function useContractActivity(c: ContractDetail) {
  const cursor = c.activityCount === undefined ? null : c.activityCursor ?? null;
  const [started, setStarted] = useState(false);
  const q = useInfiniteQuery({
    queryKey: governKeys.activity(c.contractId, cursor),
    queryFn: ({ pageParam }) => getContractActivity(c.contractId, pageParam, 50),
    initialPageParam: cursor ?? "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: started && !!cursor,
    staleTime: Infinity,    // the log is append-only: an older page never changes
    retry: retryTransient,
  });
  const entries = useMemo(() => mergeActivity(c.activity, q.data?.pages), [c.activity, q.data]);
  const hasOlder = !!cursor && (!q.data || q.hasNextPage);
  return {
    entries,
    hasOlder,
    loadingOlder: q.isFetching,
    error: q.isError ? q.error : null,
    loadOlder: () => {
      if (!started) setStarted(true);
      else void q.fetchNextPage();
    },
  };
}

export function useMatrix(): UseQueryResult<{ current: Matrix; versions: MatrixVersionInfo[] }> {
  return useQuery({ queryKey: governKeys.matrix, queryFn: getMatrix, staleTime: MINUTE, retry: retryTransient });
}

export function useMatrixVersion(version: number | null): UseQueryResult<Matrix> {
  return useQuery({
    queryKey: governKeys.matrixVersion(version ?? 0),
    queryFn: () => getMatrixVersion(version as number),
    enabled: version !== null,
    staleTime: Infinity, // a saved version never changes
    retry: retryTransient,
  });
}

export function useWorkflowSettings(): UseQueryResult<WorkflowSettings> {
  return useQuery({ queryKey: governKeys.settings, queryFn: getWorkflowSettings, staleTime: MINUTE, retry: retryTransient });
}

export function useConnectors(): UseQueryResult<Connector[]> {
  return useQuery({ queryKey: governKeys.connectors, queryFn: listConnectors, staleTime: MINUTE, retry: retryTransient });
}

export function useSyncLog(): UseQueryResult<SyncRun[]> {
  return useQuery({ queryKey: governKeys.syncLog, queryFn: getSyncLog, staleTime: 30_000, retry: retryTransient });
}

export function useUnmatchedContracts(): UseQueryResult<Contract[]> {
  return useQuery({ queryKey: governKeys.unmatched, queryFn: getUnmatchedContracts, staleTime: 30_000, retry: retryTransient });
}

/** Can the signed-in person change contracts (details, items, money,
 *  obligations)? Leaders only view, comment and approve; the server enforces
 *  this too. True while the role is loading, so editors never see a flash. */
export function useCanEditContracts(): boolean {
  const me = useGovernMe().data;
  return !(me?.isLeader ?? me?.role === "leader");
}

/** The organization (tenant): its creator, admins, and — for admins — its members. */
export function useGovernOrg(): UseQueryResult<GovernOrg> {
  return useQuery({ queryKey: governKeys.org, queryFn: getGovernOrg, staleTime: MINUTE, retry: retryTransient });
}

function useOrgAdminMutation<T>(fn: (input: T, rev: number) => Promise<GovernOrg>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: T) => fn(input, qc.getQueryData<GovernOrg>(governKeys.org)?.rev ?? 0),
    onSuccess: (org) => {
      qc.setQueryData(governKeys.org, org);
      void qc.invalidateQueries({ queryKey: governKeys.me });
    },
    // A stale rev (someone else changed the admins) or any refusal: show the server's list again.
    onError: () => void qc.invalidateQueries({ queryKey: governKeys.org }),
  });
}

export function useAddOrgAdmin() {
  return useOrgAdminMutation<string>((email, rev) => addOrgAdmin(email, rev));
}

export function useRemoveOrgAdmin() {
  return useOrgAdminMutation<string>((sub, rev) => removeOrgAdmin(sub, rev));
}

export function useGovernMe(): UseQueryResult<GovernMe> {
  return useQuery({ queryKey: governKeys.me, queryFn: getGovernMe, staleTime: 5 * MINUTE, retry: retryTransient });
}

/** Which "Later" features are on: the server's answer when it has one, else the build-time list. */
export function useGovernFeatures(): GovernFeatureFlags {
  const server = useGovernMe().data?.features;
  return useMemo(() => resolveFeatures(process.env.NEXT_PUBLIC_GOVERN_FEATURES, server), [server]);
}

/** The edition this customer sees (Requirement 7): the organization's
 *  setting, else the deployment default. Campus until settings load. */
export function useEdition(): Edition {
  const settings = useWorkflowSettings();
  const me = useGovernMe();
  const org = settings.data ? settings.data.organization?.edition : undefined;
  // Settings answer first (it changes the moment an admin saves); the profile
  // carries the same choice, resolved by the API, for the first paint.
  return resolveEdition(org ?? (settings.data ? null : me.data?.edition), me.data?.defaultEdition);
}

/** The agreement types this organization's edition offers. ``include`` keeps
 *  a value that is already set (a contract of another edition's type). */
export function useAgreementTypes(include?: AgreementType | null): AgreementType[] {
  const edition = useEdition();
  return useMemo(() => {
    const list = EDITION_AGREEMENT_TYPES[edition];
    return include && !list.includes(include) ? [...list, include] : list;
  }, [edition, include]);
}

/** The organization's default currency (Settings → Organization), used
 *  wherever an amount has no currency of its own. USD until settings load. */
export function useOrgCurrency(): string {
  const settings = useWorkflowSettings();
  return settings.data?.organization?.defaultCurrency || "USD";
}

/** The edition's words and fields (see EDITION_TERMS). */
export function useEditionTerms(): EditionTerms {
  return EDITION_TERMS[useEdition()];
}

export function useEditionFeature(feature: EditionFeature): boolean {
  return editionHas(useEdition(), feature);
}

export function useGovernFeature(feature: GovernFeature): boolean {
  return useGovernFeatures()[feature];
}

// ── Writes ─────────────────────────────────────────────────────────────────

/** Puts the server's answer in the detail cache, then re-reads every list that
 *  counts contracts (and the documents list, whose lifecycle mirrors the stage). */
function useApplyContract() {
  const qc = useQueryClient();
  return (contract: ContractDetail) => {
    qc.setQueryData(governKeys.contract(contract.contractId), contract);
    void qc.invalidateQueries({ queryKey: governKeys.allContracts });
    void qc.invalidateQueries({ queryKey: governKeys.unmatched });
    void qc.invalidateQueries({ queryKey: governKeys.obligations });
    void qc.invalidateQueries({ queryKey: documentKeys.all });
  };
}

export function useContractAction(id: string) {
  const apply = useApplyContract();
  return useMutation({
    mutationFn: (action: ContractAction) => runContractAction(id, action),
    onSuccess: apply,
  });
}

/** Any contract, id with the call (board cards, home list). */
export function useAnyContractAction() {
  const apply = useApplyContract();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: ContractAction }) => runContractAction(id, action),
    onSuccess: apply,
  });
}

export function usePatchContract(id: string) {
  const apply = useApplyContract();
  return useMutation({ mutationFn: (patch: ContractPatch) => patchContract(id, patch), onSuccess: apply });
}

/** Removes a contract from Govern, then deletes its documents (files and
 *  analysis), so it leaves the board, the dashboard counts and the library. */
export function useRemoveContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { docIds } = await removeContract(id);
      // The documents are independent: delete them in parallel.
      await Promise.all(docIds.map((docId) => deleteDocument(docId).catch((e) => {
        if (!isNotFound(e)) throw e;   // already gone is fine
      })));
      return id;
    },
    onSuccess: (id) => {
      qc.removeQueries({ queryKey: governKeys.contract(id) });
      void qc.invalidateQueries({ queryKey: ["govern"] });     // the board, obligations and the trends
      void qc.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}

/** Runs Sonar again on the contract's current document. ``force`` skips the
 *  not-an-agreement check (the person says it is one). */
export function useReanalyzeContract(contract: { contractId: string; currentDocId: string }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (force: boolean) => reprocessDocument(contract.currentDocId, { force }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: governKeys.contract(contract.contractId) });
      void qc.invalidateQueries({ queryKey: governKeys.allContracts });
      void qc.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}

export function useRescoreContract(id: string) {
  const apply = useApplyContract();
  return useMutation({ mutationFn: () => rescoreContract(id), onSuccess: apply });
}

export function useAddBlocker(id: string) {
  const apply = useApplyContract();
  return useMutation({
    mutationFn: (input: BlockerInput & { text: string }) => addBlocker(id, input),
    onSuccess: apply,
  });
}

export function useUpdateBlocker(id: string) {
  const apply = useApplyContract();
  const qc = useQueryClient();
  const key = governKeys.contract(id);
  return useMutation({
    mutationFn: ({ blockerId, input }: { blockerId: string; input: BlockerInput }) => updateBlocker(id, blockerId, input),
    // Closing or reopening shows at once; the server's copy replaces it, or the old one comes back on failure.
    onMutate: async ({ blockerId, input }) => {
      if (!input.status) return { previous: undefined };
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<ContractDetail>(key);
      if (previous) {
        const blockers = previous.blockers.map((b) => (b.id === blockerId ? { ...b, status: input.status! } : b));
        qc.setQueryData<ContractDetail>(key, {
          ...previous, blockers, openBlockers: blockers.filter((b) => b.status === "open").length,
        });
      }
      return { previous };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSuccess: apply,
  });
}

/** Every open, dated obligation across the contracts the user can see. */
export function useObligations() {
  return useQuery({
    queryKey: governKeys.obligations,
    queryFn: listObligations,
    staleTime: MINUTE,
    refetchOnWindowFocus: true,
    retry: retryTransient,
  });
}

export function useAddObligation(id: string) {
  const apply = useApplyContract();
  return useMutation({
    mutationFn: (input: ObligationInput & { kind: string; title: string }) => addObligation(id, input),
    onSuccess: apply,
  });
}

export function useUpdateObligation(id: string) {
  const apply = useApplyContract();
  return useMutation({
    mutationFn: ({ oblId, input }: { oblId: string; input: ObligationInput }) => updateObligation(id, oblId, input),
    onSuccess: apply,
  });
}

export function useSaveIncome(id: string) {
  const apply = useApplyContract();
  return useMutation({ mutationFn: (items: Partial<IncomeItem>[]) => saveIncome(id, items), onSuccess: apply });
}

export function useSaveMatrix() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ playbooks, note, effectiveDate, homeState }: {
      playbooks: Partial<Record<AgreementType, MatrixPlaybook>>; note?: string; effectiveDate?: string; homeState?: string | null
    }) => saveMatrix(playbooks, note, effectiveDate, homeState),
    onSuccess: () => void qc.invalidateQueries({ queryKey: governKeys.matrix }),
  });
}

export function useImportMatrix() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { agreementType: AgreementType; rows: MatrixImportRow[]; mode: "replace" | "merge"; note?: string }) =>
      importMatrix(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: governKeys.matrix }),
  });
}

export function useSaveWorkflowSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: WorkflowSettingsInput) => saveWorkflowSettings(input),
    onSuccess: (settings) => {
      qc.setQueryData(governKeys.settings, settings);
      // Targets and routing change every contract's colour and next step.
      void qc.invalidateQueries({ queryKey: governKeys.allContracts });
    },
  });
}

export function useSaveConnector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: ConnectorId; input: ConnectorInput }) => saveConnector(id, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: governKeys.connectors }),
  });
}

export function useRunSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: ConnectorId) => runConnectorSync(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: governKeys.syncLog });
      void qc.invalidateQueries({ queryKey: governKeys.connectors });
      void qc.invalidateQueries({ queryKey: governKeys.allContracts });
    },
  });
}

export function useCreateContract() {
  const apply = useApplyContract();
  return useMutation({
    mutationFn: (input: ContractPatch & { docId: string }) => createContract(input),
    onSuccess: apply,
  });
}

export function useTrends(granularity: "month" | "week" = "month", periods = 12): UseQueryResult<Trends> {
  return useQuery({
    queryKey: governKeys.trends(granularity, periods),
    queryFn: () => getTrends(granularity, periods),
    // Switching Month / Week keeps the current charts on screen until the
    // new series arrives, instead of flashing the skeleton.
    placeholderData: keepPreviousData,
    staleTime: 5 * MINUTE,
    retry: retryTransient,
  });
}

export function useCaptureReport(): UseQueryResult<CaptureReport> {
  return useQuery({ queryKey: governKeys.capture, queryFn: getCaptureReport, staleTime: MINUTE, retry: retryTransient });
}

// ── Saved views ────────────────────────────────────────────────────────────

/** Saved views for a list page. A failure (an API without /views yet) is
 *  reported, never thrown: the page keeps its presets and local filters. */
export function useSavedViews(module: ViewModule): UseQueryResult<SavedView[]> {
  return useQuery({
    queryKey: governKeys.views(module),
    queryFn: () => listViews(module),
    staleTime: MINUTE,
    refetchOnWindowFocus: true,
    retry: retryTransient,
  });
}

function useWriteView(module: ViewModule) {
  const qc = useQueryClient();
  return (view: SavedView) => {
    qc.setQueryData<SavedView[]>(governKeys.views(module), (list) => {
      const rest = (list ?? []).filter((v) => v.id !== view.id);
      return [...rest, view];
    });
    void qc.invalidateQueries({ queryKey: governKeys.views(module) });
  };
}

export function useCreateView(module: ViewModule) {
  const write = useWriteView(module);
  return useMutation({ mutationFn: (input: Omit<SavedViewInput, "module">) => createView({ ...input, module }), onSuccess: write });
}

export function useUpdateView(module: ViewModule) {
  const write = useWriteView(module);
  return useMutation({ mutationFn: ({ id, patch }: { id: string; patch: SavedViewPatch }) => updateView(id, patch), onSuccess: write });
}

export function useDeleteView(module: ViewModule) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteView(id),
    onSuccess: ({ id }) => {
      qc.setQueryData<SavedView[]>(governKeys.views(module), (list) => (list ?? []).filter((v) => v.id !== id));
      void qc.invalidateQueries({ queryKey: governKeys.views(module) });
    },
  });
}

// ── People and bulk update ─────────────────────────────────────────────────

export function useGovernPeople(enabled = true): UseQueryResult<DirectoryPerson[]> {
  return useQuery({ queryKey: governKeys.people, queryFn: listGovernPeople, enabled, staleTime: 5 * MINUTE, retry: retryTransient });
}

/** Updates any number of contracts: requests of at most 200 run one after
 *  another; the answer lists every contract that could not be changed. */
export function useBulkUpdateContracts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BulkUpdateInput) => {
      const parts: Parameters<typeof mergeBulkResponses>[0] = [];
      for (const ids of chunk(input.contractIds)) {
        try {
          parts.push({ ok: true, ids, response: await bulkUpdateContracts({ ...input, contractIds: ids }) });
        } catch (e) {
          parts.push({ ok: false, ids, message: e instanceof Error ? e.message : "The request failed." });
        }
      }
      return mergeBulkResponses(parts);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: governKeys.allContracts });
      void qc.invalidateQueries({ queryKey: ["govern", "contract"] });
    },
  });
}

// ── Automations ────────────────────────────────────────────────────────────

export function useAutomations(): UseQueryResult<AutomationList> {
  return useQuery({ queryKey: governKeys.automations, queryFn: listAutomations, staleTime: 30_000, retry: retryTransient });
}

/** Put a saved rule in the cached list (new or changed), then re-read. */
function useWriteAutomation() {
  const qc = useQueryClient();
  return (rule: Automation) => {
    qc.setQueryData<AutomationList>(governKeys.automations, (list) => {
      if (!list) return list;
      const exists = list.automations.some((r) => r.id === rule.id);
      const automations = exists ? list.automations.map((r) => (r.id === rule.id ? rule : r)) : [...list.automations, rule];
      return { ...list, automations, count: automations.length };
    });
    void qc.invalidateQueries({ queryKey: governKeys.automations });
  };
}

export function useCreateAutomation() {
  const write = useWriteAutomation();
  return useMutation({ mutationFn: (input: AutomationInput) => createAutomation(input), onSuccess: write });
}

export function useUpdateAutomation() {
  const write = useWriteAutomation();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<AutomationInput> & { rev?: number } }) => updateAutomation(id, patch),
    onSuccess: write,
  });
}

export function useDeleteAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAutomation(id),
    onSuccess: ({ id }) => {
      qc.setQueryData<AutomationList>(governKeys.automations, (list) =>
        list ? { ...list, automations: list.automations.filter((r) => r.id !== id), count: list.count - 1 } : list);
      void qc.invalidateQueries({ queryKey: governKeys.automations });
    },
  });
}

/** Dry run: never cached, never changes anything. */
export function useTestAutomation() {
  return useMutation({
    mutationFn: ({ id, contractId, rule }: { id: string | null; contractId: string; rule?: AutomationInput }) =>
      testAutomation(id, contractId, rule),
  });
}
