"use client";

/**
 * "Projects" — named containers grouping one or more uploaded documents.
 *
 * Storage is the BACKEND (per-tenant), not the browser. Previously this lived in
 * localStorage, which meant a grouping made in one browser never appeared in
 * another (or in production). Now we keep a synchronous in-memory mirror for a
 * snappy UI, hydrate it from the cloud once the user is authenticated, and
 * debounce-save changes back via `POST /projects`. So the same projects show on
 * every browser and device. Project ids are prefixed `proj_` so routes can tell
 * a project workspace from a raw document id.
 */

import { useSyncExternalStore } from "react";
import { getProjectsState, saveProjectsState } from "@/lib/api";

export interface LocalProject {
  id: string;
  name: string;
  client?: string;
  createdAt: string;
  docIds: string[];
}

const EVENT = "blueiq:projects-changed";
// Legacy browser store — migrated to the cloud once, then cleared.
const LEGACY_KEY = "blueiq:projects";

export function isProjectId(id: string): boolean {
  return id.startsWith("proj_");
}

function newId(): string {
  const rand = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `proj_${rand}`;
}

// ── In-memory mirror + cloud sync ────────────────────────────────────────────

let cache: LocalProject[] = [];
let hydrated = false;
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function emit(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

function setCache(next: LocalProject[]): void {
  cache = next;
  emit();
}

/** Debounced persist of the whole projects list to the backend. */
function scheduleSave(): void {
  if (typeof window === "undefined") return;
  if (saveTimer) clearTimeout(saveTimer);
  const snapshot = cache;
  saveTimer = setTimeout(() => {
    // Fire-and-forget; the next change reschedules, so a transient failure
    // self-heals on the following edit.
    void saveProjectsState(snapshot).catch(() => {});
  }, 600);
}

function readLegacy(): LocalProject[] {
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? (list as LocalProject[]) : [];
  } catch {
    return [];
  }
}

/**
 * Load projects from the cloud once the user is authenticated. The first time,
 * if the cloud is empty but the browser has legacy localStorage projects, those
 * are migrated up to the cloud (then cleared locally). Safe to call repeatedly.
 */
export async function hydrateProjects(): Promise<void> {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    let cloud = await getProjectsState();
    if (cloud.length === 0) {
      const legacy = readLegacy();
      if (legacy.length > 0) {
        cloud = legacy;
        await saveProjectsState(legacy);
        try { window.localStorage.removeItem(LEGACY_KEY); } catch {}
      }
    }
    setCache(cloud);
  } catch {
    hydrated = false; // allow a retry on the next mount
  }
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export function getProjects(): LocalProject[] {
  return cache;
}
export function getProject(id: string): LocalProject | undefined {
  return cache.find((p) => p.id === id);
}

// ── Mutations (optimistic mirror update + debounced cloud save) ────────────────

export function createProject(name: string, client?: string): LocalProject {
  const project: LocalProject = {
    id: newId(),
    name: name.trim() || "Untitled project",
    client: client?.trim() || undefined,
    createdAt: new Date().toISOString(),
    docIds: [],
  };
  setCache([project, ...cache]);
  scheduleSave();
  return project;
}

export function addDocToProject(projectId: string, docId: string): void {
  let changed = false;
  const next = cache.map((p) => {
    if (p.id !== projectId || p.docIds.includes(docId)) return p;
    changed = true;
    return { ...p, docIds: [...p.docIds, docId] };
  });
  if (changed) {
    setCache(next);
    scheduleSave();
  }
}

export function removeDocFromProject(projectId: string, docId: string): void {
  const next = cache.map((p) =>
    p.id === projectId ? { ...p, docIds: p.docIds.filter((d) => d !== docId) } : p,
  );
  setCache(next);
  scheduleSave();
}

export function renameProject(projectId: string, name: string): void {
  const next = cache.map((p) =>
    p.id === projectId ? { ...p, name: name.trim() || p.name } : p,
  );
  setCache(next);
  scheduleSave();
}

export function deleteProject(projectId: string): void {
  setCache(cache.filter((p) => p.id !== projectId));
  scheduleSave();
}

/** Strip a docId from every project that references it. Call after a document is
 *  deleted so no project keeps a dangling reference. Empty projects are kept. */
export function removeDocFromAllProjects(docId: string): void {
  let changed = false;
  const next = cache.map((p) => {
    if (!p.docIds.includes(docId)) return p;
    changed = true;
    return { ...p, docIds: p.docIds.filter((d) => d !== docId) };
  });
  if (changed) {
    setCache(next);
    scheduleSave();
  }
}

/**
 * In-memory only: real projects plus a synthetic single-doc project for every
 * document not already in one. Used by the Dashboard (and Projects page) so the
 * portfolio reflects ALL uploaded documents, not just grouped ones. Not saved.
 */
export function withUngroupedDocs(
  projects: LocalProject[],
  docs: { docId: string; title?: string; createdAt?: string; parties?: string[] }[],
): LocalProject[] {
  const grouped = new Set(projects.flatMap((p) => p.docIds));
  const synthetic: LocalProject[] = [];
  for (const d of docs) {
    if (grouped.has(d.docId)) continue;
    synthetic.push({
      id: d.docId,
      name: d.title || "Untitled document",
      client: d.parties?.[0],
      createdAt: d.createdAt ?? new Date().toISOString(),
      docIds: [d.docId],
    });
  }
  return synthetic.length ? [...projects, ...synthetic] : projects;
}

// ── React binding ──────────────────────────────────────────────────────────────

const EMPTY: LocalProject[] = [];

function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}
function getSnapshot(): LocalProject[] {
  return cache;
}

export function useProjects(): LocalProject[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function useProject(id: string): LocalProject | undefined {
  return useProjects().find((p) => p.id === id);
}
