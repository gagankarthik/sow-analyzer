"use client";

import { useEffect, useState } from "react";
import { getDocument, errorStatus } from "./api";
import type { ApiDocumentDetail } from "./types";

// Statuses that mean the ingestion pipeline is still running.
export const PROCESSING_STATUSES = new Set([
  "PENDING",
  "PARSING",
  "CLASSIFYING",
  "EMBEDDING",
  "GRAPHING",
  "DIFFING",
  "TIMELINING",
  "PERSISTING",
]);

export interface DocumentState {
  detail: ApiDocumentDetail | null;
  loading: boolean;
  notFound: boolean;
  error: string | null;
  /** true while the ingestion pipeline is still running */
  processing: boolean;
}

/**
 * Loads a document and KEEPS IT FRESH:
 *  - polls every 5s while the pipeline is still processing, so the page
 *    auto-updates to READY/FAILED without a manual refresh;
 *  - retries a transient 404 (a freshly-uploaded doc can briefly 404 before
 *    it's indexed) for ~2 min before showing "not found".
 */
export function useDocumentDetail(id: string): DocumentState {
  const [detail, setDetail] = useState<ApiDocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let notFoundRetries = 0;
    const MAX_404_RETRIES = 24; // ~2 min at 5s

    setLoading(true);
    setNotFound(false);
    setError(null);

    const tick = () => {
      getDocument(id)
        .then((d) => {
          if (!alive) return;
          setDetail(d);
          setError(null);
          setNotFound(false);
          setLoading(false);
          notFoundRetries = 0;
          if (PROCESSING_STATUSES.has(d.document.status)) {
            timer = setTimeout(tick, 5000);
          }
        })
        .catch((err: unknown) => {
          if (!alive) return;
          if (errorStatus(err) === 404) {
            if (notFoundRetries < MAX_404_RETRIES) {
              notFoundRetries += 1;
              setLoading(true);
              timer = setTimeout(tick, 5000);
            } else {
              setLoading(false);
              setNotFound(true);
            }
          } else {
            setLoading(false);
            setError(err instanceof Error ? err.message : "Failed to load document");
          }
        });
    };

    tick();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  const processing = detail
    ? PROCESSING_STATUSES.has(detail.document.status)
    : false;

  return { detail, loading, notFound, error, processing };
}
