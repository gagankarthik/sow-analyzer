"use client";

/**
 * Client-side "projects" — named containers that group one or more uploaded
 * documents. The backend has no Project entity (it only knows documents and
 * amendment chains), so a project lives in localStorage: a name plus the set
 * of docIds uploaded into it. Project ids are prefixed `proj_` so routes can
 * distinguish a project workspace from a raw document id.
 */

import { useSyncExternalStore } from "react";

export interface LocalProject {
  id: string;
  name: string;
  client?: string;
  createdAt: string;
  docIds: string[];
}

const KEY = "blueiq:projects";
const EVENT = "blueiq:projects-changed";

export function isProjectId(id: string): boolean {
  return id.startsWith("proj_");
}

function readRaw(): string | null {
  try { return window.localStorage.getItem(KEY); } catch { return null; }
}
function parse(raw: string | null): LocalProject[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as LocalProject[]; } catch { return []; }
}
function write(list: LocalProject[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

export function getProjects(): LocalProject[] {
  return parse(readRaw());
}
export function getProject(id: string): LocalProject | undefined {
  return getProjects().find((p) => p.id === id);
}

function newId(): string {
  const rand = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `proj_${rand}`;
}

export function createProject(name: string, client?: string): LocalProject {
  const project: LocalProject = {
    id: newId(),
    name: name.trim() || "Untitled project",
    client: client?.trim() || undefined,
    createdAt: new Date().toISOString(),
    docIds: [],
  };
  write([project, ...getProjects()]);
  return project;
}

export function addDocToProject(projectId: string, docId: string): void {
  const list = getProjects();
  const p = list.find((x) => x.id === projectId);
  if (!p || p.docIds.includes(docId)) return;
  p.docIds = [...p.docIds, docId];
  write(list);
}

export function removeDocFromProject(projectId: string, docId: string): void {
  const list = getProjects();
  const p = list.find((x) => x.id === projectId);
  if (!p) return;
  p.docIds = p.docIds.filter((d) => d !== docId);
  write(list);
}

export function renameProject(projectId: string, name: string): void {
  const list = getProjects();
  const p = list.find((x) => x.id === projectId);
  if (!p) return;
  p.name = name.trim() || p.name;
  write(list);
}

export function deleteProject(projectId: string): void {
  write(getProjects().filter((p) => p.id !== projectId));
}

/* ── React binding (useSyncExternalStore) ─────────────────────────
   getSnapshot caches by the raw JSON string so it returns a stable
   reference unless the stored value actually changed — avoiding render
   loops. */

const EMPTY: LocalProject[] = [];
let cacheRaw: string | null = null;
let cache: LocalProject[] = EMPTY;

function getSnapshot(): LocalProject[] {
  const raw = readRaw();
  if (raw === cacheRaw) return cache;
  cacheRaw = raw;
  cache = parse(raw);
  return cache;
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useProjects(): LocalProject[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function useProject(id: string): LocalProject | undefined {
  return useProjects().find((p) => p.id === id);
}
