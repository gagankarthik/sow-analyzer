"use client";

/**
 * React Query hooks for document server state.
 *
 * Thin wrappers over the typed functions in `lib/api.ts` (the single source of
 * HTTP truth). The polling rule lives here: while a document's pipeline is
 * still running (status !== READY/FAILED), the detail query refetches every 5s;
 * once terminal, polling stops. Derived artefacts (classification/diff/
 * timeline) are only fetched once the document is READY.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  listDocuments,
  getDocument,
  getClassification,
  getDiff,
  getTimeline,
  updateDocument,
  deleteDocument,
  deleteVersion,
  reprocessDocument,
} from "@/lib/api";
import type {
  ApiDocument,
  ApiDocumentDetail,
  ApiClassification,
  ApiDiff,
  ApiTimeline,
} from "@/lib/types";

const TERMINAL = new Set(["READY", "FAILED"]);

export const documentKeys = {
  all: ["documents"] as const,
  detail: (id: string) => ["document", id] as const,
  classification: (id: string) => ["document", id, "classification"] as const,
  diff: (id: string) => ["document", id, "diff"] as const,
  timeline: (id: string) => ["document", id, "timeline"] as const,
};

export function useDocuments(): UseQueryResult<ApiDocument[]> {
  return useQuery({
    queryKey: documentKeys.all,
    queryFn: listDocuments,
    staleTime: 30_000,
    // Keep the portfolio list fresh if anything is still processing.
    refetchInterval: (query) => {
      const docs = query.state.data as ApiDocument[] | undefined;
      return docs?.some((d) => !TERMINAL.has(d.status)) ? 5_000 : false;
    },
  });
}

export function useDocument(id: string): UseQueryResult<ApiDocumentDetail> {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => getDocument(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const detail = query.state.data as ApiDocumentDetail | undefined;
      return detail && !TERMINAL.has(detail.document.status) ? 5_000 : false;
    },
  });
}

export function useClassification(id: string, ready: boolean): UseQueryResult<ApiClassification> {
  return useQuery({
    queryKey: documentKeys.classification(id),
    queryFn: () => getClassification(id),
    enabled: !!id && ready,
    staleTime: 5 * 60_000,
  });
}

export function useDiff(id: string, ready: boolean): UseQueryResult<ApiDiff> {
  return useQuery({
    queryKey: documentKeys.diff(id),
    queryFn: () => getDiff(id),
    enabled: !!id && ready,
    staleTime: 5 * 60_000,
    retry: false, // a missing diff (first version) is expected, not an error to retry
  });
}

export function useTimeline(id: string, ready: boolean): UseQueryResult<ApiTimeline> {
  return useQuery({
    queryKey: documentKeys.timeline(id),
    queryFn: () => getTimeline(id),
    enabled: !!id && ready,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useUpdateDocument(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: { title?: string; lifecycle?: string; docType?: string }) =>
      updateDocument(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentKeys.detail(id) });
      qc.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: documentKeys.all }),
  });
}

// Re-run analysis on a document. The backend re-fires the pipeline and flips the
// document back to PENDING, so we invalidate detail + list to resume polling and
// drop the stale classification so the new extraction is fetched once READY.
export function useReprocess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reprocessDocument(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: documentKeys.detail(id) });
      qc.invalidateQueries({ queryKey: documentKeys.classification(id) });
      qc.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}

export function useDeleteVersion(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (version: number) => deleteVersion(id, version),
    onSuccess: () => qc.invalidateQueries({ queryKey: documentKeys.detail(id) }),
  });
}
