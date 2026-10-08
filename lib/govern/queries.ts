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

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { isPermanentError } from "@/lib/api";
import { resolveFeatures, type GovernFeature, type GovernFeatureFlags } from "./features";
import { documentKeys } from "@/lib/queries/documents";
import {
  addBlocker, addObligation, createContract, getCaptureReport, getContract, getTrends, getGovernMe, getMatrix, getMatrixVersion, getSyncLog,
  getUnmatchedContracts, getWorkflowSettings, importMatrix, listConnectors, listContracts,
  patchContract, rescoreContract, runConnectorSync, runContractAction, saveConnector, saveIncome,
  saveMatrix, saveWorkflowSettings, updateBlocker, updateObligation,
} from "./api";
import type {
  AgreementType, BlockerInput, CaptureReport, Trends, Connector, ConnectorId, ConnectorInput, Contract, ContractAction,
  ContractDetail, ContractPatch, GovernMe, IncomeItem, Matrix, MatrixImportRow, MatrixPlaybook,
  MatrixVersionInfo, ObligationInput, SyncRun, WorkflowSettings, WorkflowSettingsInput,
} from "./types";

export const governKeys = {
  contracts: (includeClosed: boolean) => ["govern", "contracts", includeClosed] as const,
  allContracts: ["govern", "contracts"] as const,
  contract: (id: string) => ["govern", "contract", id] as const,
  matrix: ["govern", "matrix"] as const,
  matrixVersion: (v: number) => ["govern", "matrix", "version", v] as const,
  settings: ["govern", "settings"] as const,
  connectors: ["govern", "connectors"] as const,
  syncLog: ["govern", "sync-log"] as const,
  unmatched: ["govern", "unmatched"] as const,
  me: ["govern", "me"] as const,
  trends: (g: string, n: number) => ["govern", "trends", g, n] as const,
  capture: ["govern", "capture"] as const,
};

const MINUTE = 60_000;

function retryTransient(failureCount: number, error: Error): boolean {
  return !isPermanentError(error) && failureCount < 2;
}

// ── Reads ──────────────────────────────────────────────────────────────────

export function useContracts(includeClosed = false): UseQueryResult<{ contracts: Contract[]; generatedAt: string | null }> {
  return useQuery({
    queryKey: governKeys.contracts(includeClosed),
    queryFn: () => listContracts(includeClosed),
    staleTime: 20_000,
    refetchInterval: MINUTE,
    refetchOnWindowFocus: true,
    retry: retryTransient,
  });
}

export function useContract(id: string): UseQueryResult<ContractDetail> {
  return useQuery({
    queryKey: governKeys.contract(id),
    queryFn: () => getContract(id),
    enabled: !!id,
    staleTime: 15_000,
    // A revision being analysed changes the contract when Sonar finishes.
    refetchInterval: (query) => {
      if (isPermanentError(query.state.error)) return false;
      const c = query.state.data as ContractDetail | undefined;
      return c && c.analysisStatus !== "READY" && c.analysisStatus !== "FAILED" ? 5_000 : MINUTE;
    },
    refetchOnWindowFocus: true,
    retry: retryTransient,
  });
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

export function useGovernMe(): UseQueryResult<GovernMe> {
  return useQuery({ queryKey: governKeys.me, queryFn: getGovernMe, staleTime: 5 * MINUTE, retry: retryTransient });
}

/** Which "Later" features are on: the server's answer when it has one, else the build-time list. */
export function useGovernFeatures(): GovernFeatureFlags {
  const server = useGovernMe().data?.features;
  return useMemo(() => resolveFeatures(process.env.NEXT_PUBLIC_GOVERN_FEATURES, server), [server]);
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
  return useMutation({
    mutationFn: ({ blockerId, input }: { blockerId: string; input: BlockerInput }) => updateBlocker(id, blockerId, input),
    onSuccess: apply,
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
    mutationFn: ({ playbooks, note, effectiveDate }: {
      playbooks: Partial<Record<AgreementType, MatrixPlaybook>>; note?: string; effectiveDate?: string
    }) => saveMatrix(playbooks, note, effectiveDate),
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
    staleTime: 5 * MINUTE,
    retry: retryTransient,
  });
}

export function useCaptureReport(): UseQueryResult<CaptureReport> {
  return useQuery({ queryKey: governKeys.capture, queryFn: getCaptureReport, staleTime: MINUTE, retry: retryTransient });
}
