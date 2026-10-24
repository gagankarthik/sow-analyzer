"use client";

// The envelope editor's state: a local draft, saved with a debounced PUT
// (recipients, fields and settings only). One save runs at a time; changes
// made while it runs go in the next one. `flush()` saves now (before Send).

import { useCallback, useEffect, useRef, useState } from "react";
import type { Envelope } from "@/lib/esign/types";
import { buildEnvelopeInput, draftFromEnvelope, type EnvelopeDraft } from "@/lib/govern/esign-editor";
import { esignErrorMessage, useUpdateEnvelope } from "@/lib/govern/esign";

const SAVE_DELAY_MS = 800;

export type SaveState = "saved" | "unsaved" | "saving" | "error";

export function useEnvelopeDraft(contractId: string, envelope: Envelope) {
  const update = useUpdateEnvelope(contractId, envelope.id);
  const save = update.mutateAsync;
  const [draft, setDraft] = useState<EnvelopeDraft>(() => draftFromEnvelope(envelope));
  const [state, setState] = useState<SaveState>("saved");
  const [error, setError] = useState<string | null>(null);

  const latest = useRef(draft);
  const dirty = useRef(false);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const flush = useCallback(async (): Promise<boolean> => {
    window.clearTimeout(timer.current);
    while (inFlight.current) await inFlight.current;
    if (!dirty.current) return true;
    dirty.current = false;
    setState("saving");
    const run = save(buildEnvelopeInput(latest.current).input).then(
      () => {
        setError(null);
        setState(dirty.current ? "unsaved" : "saved");
        return true;
      },
      (e: unknown) => {
        // Kept dirty: the next change, or Retry, saves again.
        dirty.current = true;
        setError(esignErrorMessage(e));
        setState("error");
        return false;
      },
    );
    inFlight.current = run.finally(() => {
      inFlight.current = null;
    });
    return inFlight.current;
  }, [save]);

  /** Applies a change to the draft and schedules a save. */
  const change = useCallback((fn: (d: EnvelopeDraft) => EnvelopeDraft) => {
    const next = fn(latest.current);
    if (next === latest.current) return;
    latest.current = next;
    dirty.current = true;
    setDraft(next);
    setState((s) => (s === "saving" ? s : "unsaved"));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), SAVE_DELAY_MS);
  }, [flush]);

  // Leaving the editor saves what is pending; closing the tab with unsaved work asks first.
  useEffect(() => {
    function warn(e: BeforeUnloadEvent) {
      if (dirty.current || inFlight.current) e.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      if (dirty.current) void flush();
    };
  }, [flush]);

  return { draft, change, flush, saveState: state, saveError: error, skipped: buildEnvelopeInput(draft).skipped };
}
