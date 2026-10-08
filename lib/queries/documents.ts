"use client";

/**
 * React Query hooks for document server state — the ONE place the document list
 * and everything derived from it is fetched, polled and invalidated. Every page
 * that shows documents (dashboard, library, workflow, projects, renewals,
 * insights, notifications, the top bar, the command palette) reads the same
 * `useDocuments()` query, so their counts always agree.
 *
 * Real-time rules:
 *  - Polling: while any document's pipeline is still running (status is not
 *    READY/FAILED) the list refetches every POLL_MS; once everything is terminal
 *    polling stops. The single-document query follows the same rule.
 *  - Freshness: data goes stale after STALE_MS and refetches on window focus and
 *    on reconnect (see QueryProvider for the app-wide defaults).
 *  - Dependents: when a fresh list shows that a document changed (status,
 *    version or updatedAt), its cached detail / classification / diff / timeline
 *    are invalidated, so a re-analysis started in another tab or by a teammate
 *    is picked up here too.
 *  - Mutations: every write invalidates the list plus that document's queries.
 */

import { useMemo } from "react";
import {
  useQuery,
  useQueries,
  useMutation,
  useQueryClient,
  type QueryClient,
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
  isPermanentError,
} from "@/lib/api";
import { removeDocFromAllProjects } from "@/lib/projects-store";
import type {
  ApiDocument,
  ApiDocumentDetail,
  ApiClassification,
  ApiDiff,
  ApiTimeline,
} from "@/lib/types";

const TERMINAL = new Set(["READY", "FAILED"]);

/** How often a list/document with unfinished processing is re-read. */
export const POLL_MS = 5_000;
/** How long fetched document data is treated as fresh. */
const STALE_MS = 15_000;
/** Analysis output only changes on re-analysis, which invalidates it explicitly. */
const ANALYSIS_STALE_MS = 5 * 60_000;

/**
 * Ask again only when asking again can help. A 404 (the document or project
 * does not exist, or is not shared with this user), a 403 (the role does not
 * allow it) and a 400 will answer the same way every time, so they go straight
 * to the page's not-found / error state instead of being retried.
 */
function retryTransient(failureCount: number, error: Error): boolean {
  return !isPermanentError(error) && failureCount < 1;
}

/** True while the pipeline is still working on a document. */
export function isProcessing(status: string): boolean {
  return !TERMINAL.has(status);
}

export const documentKeys = {
  all: ["documents"] as const,
  /** Prefix of every query about one document (detail, classification, diff, timeline). */
  detail: (id: string) => ["document", id] as const,
  classification: (id: string) => ["document", id, "classification"] as const,
  diff: (id: string) => ["document", id, "diff"] as const,
  timeline: (id: string) => ["document", id, "timeline"] as const,
};

function changed(a: ApiDocument, b: ApiDocument): boolean {
  return a.status !== b.status || a.updatedAt !== b.updatedAt || a.latestVersion !== b.latestVersion;
}

/** After a fresh list arrives, drop or refresh per-document caches that no
 *  longer match it. Runs once per fetch, however many components are listening. */
function syncDependents(qc: QueryClient, prev: ApiDocument[] | undefined, next: ApiDocument[]): void {
  if (!prev) return;
  const nextById = new Map(next.map((d) => [d.docId, d]));
  for (const before of prev) {
    const after = nextById.get(before.docId);
    if (!after) qc.removeQueries({ queryKey: documentKeys.detail(before.docId) });
    else if (changed(before, after)) void qc.invalidateQueries({ queryKey: documentKeys.detail(before.docId) });
  }
}

export function useDocuments(): UseQueryResult<ApiDocument[]> {
  const qc = useQueryClient();
  return useQuery({
    queryKey: documentKeys.all,
    queryFn: async () => {
      const next = await listDocuments();
      syncDependents(qc, qc.getQueryData<ApiDocument[]>(documentKeys.all), next);
      return next;
    },
    staleTime: STALE_MS,
    retry: retryTransient,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // Keep the portfolio list live while anything is still processing; stop after.
    refetchInterval: (query) => {
      if (isPermanentError(query.state.error)) return false;
      const docs = query.state.data as ApiDocument[] | undefined;
      return docs?.some((d) => isProcessing(d.status)) ? POLL_MS : false;
    },
  });
}

export function useDocument(id: string): UseQueryResult<ApiDocumentDetail> {
  const qc = useQueryClient();
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: async () => {
      const next = await getDocument(id);
      const prev = qc.getQueryData<ApiDocumentDetail>(documentKeys.detail(id));
      if (prev && changed(prev.document, next.document)) {
        // The document moved on (finished, failed, re-analyzed, new version):
        // its analysis output and every list that counts it are now out of date.
        void qc.invalidateQueries({ queryKey: documentKeys.classification(id) });
        void qc.invalidateQueries({ queryKey: documentKeys.diff(id) });
        void qc.invalidateQueries({ queryKey: documentKeys.timeline(id) });
        void qc.invalidateQueries({ queryKey: documentKeys.all });
      }
      return next;
    },
    enabled: !!id,
    staleTime: STALE_MS,
    retry: retryTransient,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: (query) => {
      // The document was deleted or is no longer shared with this user: the
      // page shows "not found"; polling it again would only repeat the 404.
      if (isPermanentError(query.state.error)) return false;
      const detail = query.state.data as ApiDocumentDetail | undefined;
      return detail && isProcessing(detail.document.status) ? POLL_MS : false;
    },
  });
}

export function useClassification(id: string, ready: boolean): UseQueryResult<ApiClassification> {
  return useQuery({
    queryKey: documentKeys.classification(id),
    queryFn: () => getClassification(id),
    enabled: !!id && ready,
    staleTime: ANALYSIS_STALE_MS,
    retry: retryTransient,
  });
}

/**
 * Classifications for every READY document in `docs`, from the same cache keys
 * as `useClassification` (so a page that needs one and a page that needs all of
 * them share the fetch). Documents that are not READY have no classification and
 * are skipped — they are not counted as "zero clauses".
 */
export function useClassifications(docs: ApiDocument[]): {
  byDoc: Map<string, ApiClassification>;
  /** Changes whenever any classification changes — a stable memo dependency. */
  version: string;
  /** READY documents whose classification is still being fetched. */
  loadingCount: number;
  /** READY documents whose classification could not be loaded. */
  failedCount: number;
  readyCount: number;
} {
  const ready = useMemo(() => docs.filter((d) => d.status === "READY"), [docs]);
  const results = useQueries({
    queries: ready.map((d) => ({
      queryKey: documentKeys.classification(d.docId),
      queryFn: () => getClassification(d.docId),
      staleTime: ANALYSIS_STALE_MS,
      retry: retryTransient,
    })),
  });
  const version = results.map((q) => q.dataUpdatedAt).join(",");
  const loadingCount = results.filter((q) => q.isLoading).length;
  const failedCount = results.filter((q) => q.isError && !q.data).length;
  const byDoc = useMemo(() => {
    const m = new Map<string, ApiClassification>();
    ready.forEach((d, i) => {
      const data = results[i]?.data;
      if (data) m.set(d.docId, data);
    });
    return m;
    // `version` stands in for `results`, whose identity changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, version]);
  return { byDoc, version, loadingCount, failedCount, readyCount: ready.length };
}

export function useDiff(id: string, ready: boolean): UseQueryResult<ApiDiff> {
  return useQuery({
    queryKey: documentKeys.diff(id),
    queryFn: () => getDiff(id),
    enabled: !!id && ready,
    staleTime: ANALYSIS_STALE_MS,
    retry: false, // a missing diff (first version) is expected, not an error to retry
  });
}

export function useTimeline(id: string, ready: boolean): UseQueryResult<ApiTimeline> {
  return useQuery({
    queryKey: documentKeys.timeline(id),
    queryFn: () => getTimeline(id),
    enabled: !!id && ready,
    staleTime: ANALYSIS_STALE_MS,
    retry: false,
  });
}

/** Refetch the document list — call after anything that adds a document
 *  (an upload) so every page picks it up and polling starts. */
export function useInvalidateDocuments(): () => void {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: documentKeys.all });
}

type DocPatch = { title?: string; lifecycle?: string; docType?: string };

/** Edit title / type / lifecycle of any document (the id travels with the call). */
export function useUpdateAnyDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: DocPatch }) => updateDocument(id, patch),
    onSuccess: (updated, { id }) => {
      // Show the server's row straight away, then confirm with a refetch.
      qc.setQueryData<ApiDocument[]>(documentKeys.all, (prev) =>
        prev?.map((d) => (d.docId === updated.docId ? updated : d)),
      );
      void qc.invalidateQueries({ queryKey: documentKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}

export function useUpdateDocument(id: string) {
  const mutation = useUpdateAnyDocument();
  return {
    ...mutation,
    mutate: (patch: DocPatch) => mutation.mutate({ id, patch }),
    mutateAsync: (patch: DocPatch) => mutation.mutateAsync({ id, patch }),
  };
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: (_data, id) => {
      // The server deleted the document and took it out of every project that
      // listed it. Bring the in-memory projects list in line (no request is sent).
      removeDocFromAllProjects(id);
      // Take it out of the cached list at once (every count updates), then
      // confirm with a refetch. The document's own cached queries are left to
      // expire: the page showing them is about to navigate away, and refetching
      // a deleted document would only flash a "not found" screen.
      qc.setQueryData<ApiDocument[]>(documentKeys.all, (prev) => prev?.filter((d) => d.docId !== id));
      void qc.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}

// Re-run analysis on a document. The backend re-fires the pipeline and flips the
// document back to PENDING, so we invalidate the list (polling resumes) and every
// query about this document (the old classification / diff / timeline are stale).
export function useReprocess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reprocessDocument(id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: documentKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}

export function useDeleteVersion(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (version: number) => deleteVersion(id, version),
    onSuccess: () => {
      // Rolling back changes the current version, so its analysis and the list
      // row (latest version, risk counts, value) change with it.
      void qc.invalidateQueries({ queryKey: documentKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}
