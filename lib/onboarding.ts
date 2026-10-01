"use client";

/**
 * First-run setup progress, kept per signed-in user in this browser.
 *
 * A record existing at all is the "seen" flag: the dashboard sends a brand-new
 * user to /onboarding only while there is no record, so it can never loop.
 * The record also holds where the user got to (step, project, document) so a
 * reload or a later visit resumes in the same place.
 */

import { useMemo, useSyncExternalStore } from "react";

export type OnboardingStep = "welcome" | "project" | "upload" | "analysis" | "done";

export interface OnboardingState {
  step: OnboardingStep;
  projectId?: string;
  docId?: string;
  /** Unset while setup is in progress. */
  outcome?: "skipped" | "completed";
}

export const ONBOARDING_STEPS: { id: OnboardingStep; label: string }[] = [
  { id: "welcome", label: "Welcome" },
  { id: "project", label: "Create project" },
  { id: "upload", label: "Upload contract" },
  { id: "analysis", label: "Analysis" },
  { id: "done", label: "Results" },
];

// What UploadDropzone accepts (components/upload/UploadDropzone.tsx: ACCEPTED, MAX_BYTES).
export const UPLOAD_REQUIREMENTS = "PDF, DOCX or TXT, up to 50 MB";

const PREFIX = "blueiq:onboarding:";
const STEP_IDS = new Set<string>(ONBOARDING_STEPS.map((s) => s.id));
const listeners = new Set<() => void>();
// Used when localStorage is unavailable (private mode), so the flag still holds
// for the rest of the session and the dashboard cannot redirect in a loop.
const memory = new Map<string, string>();

function readRaw(userId: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + userId) ?? memory.get(userId) ?? null;
  } catch {
    return memory.get(userId) ?? null;
  }
}

function parse(raw: string | null): OnboardingState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<OnboardingState> | null;
    if (!v || typeof v.step !== "string" || !STEP_IDS.has(v.step)) return null;
    return {
      step: v.step,
      projectId: typeof v.projectId === "string" ? v.projectId : undefined,
      docId: typeof v.docId === "string" ? v.docId : undefined,
      outcome: v.outcome === "skipped" || v.outcome === "completed" ? v.outcome : undefined,
    };
  } catch {
    return null;
  }
}

/** The record as stored right now (for writes that must not use a stale render). */
export function readOnboarding(userId: string): OnboardingState | null {
  return parse(readRaw(userId));
}

export function writeOnboarding(userId: string, state: OnboardingState): void {
  const raw = JSON.stringify(state);
  memory.set(userId, raw);
  try {
    window.localStorage.setItem(PREFIX + userId, raw);
  } catch {
    /* private mode: the in-memory copy covers this session */
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  window.addEventListener("storage", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
}

/**
 * The user's setup record: `undefined` until it can be read (server render, or
 * the user is not known yet), `null` when the user has never seen setup.
 */
export function useOnboarding(userId: string | undefined): OnboardingState | null | undefined {
  const raw = useSyncExternalStore(
    subscribe,
    () => (userId ? readRaw(userId) : undefined),
    () => undefined,
  );
  return useMemo(() => (raw === undefined ? undefined : parse(raw)), [raw]);
}

/** Setup was opened but neither finished nor left at the very first screen. */
export function isSetupUnfinished(state: OnboardingState | null | undefined): boolean {
  return !!state && state.outcome !== "completed" && state.step !== "welcome";
}
