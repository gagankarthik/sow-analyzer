"use client";

/**
 * "Projects" — named containers grouping one or more uploaded documents.
 *
 * The SERVER owns projects: who can see one, what each person's role is, and
 * what is filed in it. This module is a synchronous in-memory mirror of the
 * projects the signed-in user can see (`GET /projects`) so the UI can render
 * without waiting, plus one function per change. Every change is a single
 * request to its own per-project route:
 *
 *   read one          GET    /projects/{id}
 *   create / rename   PUT    /projects/{id}
 *   delete            DELETE /projects/{id}
 *   add document      PUT    /projects/{id}/documents/{docId}
 *   remove document   DELETE /projects/{id}/documents/{docId}
 *   invite            POST   /projects/{id}/invite
 *   set role          PATCH  /projects/{id}/members/{email}
 *   remove / leave    DELETE /projects/{id}/members/{email}
 *
 * Each one updates the mirror at once, awaits the server, and puts the mirror
 * back if the server refuses — and returns a promise, so the caller reports
 * success or failure from what actually happened. Nothing here ever sends the
 * whole list back to the server, and nothing is read from browser storage: a
 * stale copy in another tab cannot delete a project or un-file a document.
 *
 * Project ids are prefixed `proj_` so routes can tell a project workspace from
 * a raw document id.
 */

import { useSyncExternalStore } from "react";
import {
  ApiError,
  addProjectDocument,
  deleteProjectById,
  getProject as fetchProject,
  getProjectsState,
  inviteProjectMember,
  putProject,
  removeProjectDocument,
  removeProjectMember,
  setProjectMemberRole,
  type InviteResult,
} from "@/lib/api";
import type { ProjectMember, ProjectRole, StoredProject } from "@/lib/types";

export interface LocalProject {
  id: string;
  name: string;
  client?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  docIds: string[];
  /** Email of the project's owner, as recorded by the server. */
  ownerEmail?: string | null;
  /** The signed-in user's role, as returned by the server. Absent only on the
   *  synthetic single-document entries made by `withUngroupedDocs`. */
  role?: ProjectRole;
  /** Everyone on the project; the owner is listed with role `owner`. */
  members?: ProjectMember[];
}

// ── What each role may do ─────────────────────────────────────────────────────
// A mirror of PERMISSIONS in the backend's shared/access.py, used only to decide
// which controls to show. The server checks every request regardless.

export type Capability =
  | "view" | "upload" | "edit" | "reprocess" | "manage_documents" | "share_document"
  | "delete_document" | "rename_project" | "delete_project" | "invite" | "remove_member" | "set_role";

const EDITOR: Capability[] = ["view", "upload", "edit", "reprocess", "manage_documents"];
const PERMISSIONS: Record<ProjectRole, ReadonlySet<Capability>> = {
  owner: new Set<Capability>([
    ...EDITOR, "share_document", "delete_document", "rename_project", "delete_project",
    "invite", "remove_member", "set_role",
  ]),
  editor: new Set(EDITOR),
  viewer: new Set<Capability>(["view"]),
};

/** May someone with `role` do `capability`? No role means no. */
export function can(role: ProjectRole | null | undefined, capability: Capability): boolean {
  return !!role && PERMISSIONS[role].has(capability);
}

const EVENT = "blueiq:projects-changed";

export function isProjectId(id: string): boolean {
  return id.startsWith("proj_");
}

function newId(): string {
  const rand = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `proj_${rand}`;
}

// ── In-memory mirror ──────────────────────────────────────────────────────────

let cache: LocalProject[] = [];
let hydrated = false;
/** The user the mirror was loaded for, so one person's list is never shown to another. */
let loadedFor: string | undefined;
/** Changes currently on the wire. A refresh must not land while one is pending. */
let pending = 0;
/** Bumped by every local change, so a refresh that started before the change
 *  can tell its answer is already out of date and discard it. */
let localRev = 0;

/** Where the projects list stands with the server — so a page can tell "still
 *  loading" and "couldn't load" apart from "you have no projects". */
export interface ProjectsSyncState {
  status: "idle" | "loading" | "ready" | "error";
  /** When the list was last read from the server (ms), 0 before the first read. */
  updatedAt: number;
  /** Why the last read failed, if it did. */
  error: string | null;
  refreshing: boolean;
}

const IDLE_SYNC: ProjectsSyncState = { status: "idle", updatedAt: 0, error: null, refreshing: false };
let sync: ProjectsSyncState = IDLE_SYNC;

function emit(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

function setCache(next: LocalProject[]): void {
  cache = next;
  emit();
}

function setSync(patch: Partial<ProjectsSyncState>): void {
  sync = { ...sync, ...patch };
  emit();
}

const message = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);
const sameEmail = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const sameList = (a: LocalProject[], b: LocalProject[]) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Load the signed-in user's projects from the server. Safe to call repeatedly;
 * when `userId` differs from the user the list was loaded for, the previous
 * user's list is dropped first.
 */
export async function hydrateProjects(userId?: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (hydrated && loadedFor === userId) return;
  if (loadedFor !== userId) cache = [];
  hydrated = true;
  loadedFor = userId;
  localRev += 1;
  setSync({ status: "loading", error: null, updatedAt: 0, refreshing: false });
  try {
    const cloud = await getProjectsState();
    if (loadedFor !== userId) return; // another user signed in meanwhile
    // A project being created right now is not on the server's list yet: keep it.
    const creating = pending > 0 ? cache.filter((p) => !cloud.some((c) => c.id === p.id)) : [];
    cache = [...cloud, ...creating];
    setSync({ status: "ready", updatedAt: Date.now(), error: null });
  } catch (e) {
    if (loadedFor !== userId) return;
    hydrated = false; // allow a retry (the Retry button, or the next mount)
    setSync({ status: "error", error: message(e, "Couldn't load your projects.") });
  }
}

/**
 * Re-read the projects list from the server, so a project created, renamed,
 * shared or deleted — or a role changed — on another device or by a teammate
 * shows up here without a reload. Skipped while a local change is on the wire,
 * and discarded if a local change happened while the request was in flight, so
 * it can never overwrite something the user just did.
 */
export async function refreshProjects(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!hydrated) return hydrateProjects(loadedFor);
  if (sync.status === "loading" || sync.refreshing || pending > 0) return;
  const rev = localRev;
  const user = loadedFor;
  setSync({ refreshing: true });
  try {
    const cloud = await getProjectsState();
    if (user !== loadedFor) return;
    if (rev !== localRev || pending > 0) {
      setSync({ refreshing: false });
      return;
    }
    if (!sameList(cloud, cache)) cache = cloud;
    setSync({ status: "ready", updatedAt: Date.now(), error: null, refreshing: false });
  } catch (e) {
    if (user !== loadedFor) return;
    // Keep showing the last good list, but say that it may be out of date.
    setSync({ refreshing: false, error: message(e, "Couldn't refresh your projects.") });
  }
}

/**
 * Keep the list fresh while the app is open: re-read on window focus, when the
 * network returns, and once a minute while the tab is visible. Returns a
 * function that stops it.
 */
export function startProjectsSync(intervalMs = 60_000): () => void {
  if (typeof window === "undefined") return () => {};
  const refresh = () => {
    if (document.visibilityState === "visible") void refreshProjects();
  };
  window.addEventListener("focus", refresh);
  window.addEventListener("online", refresh);
  document.addEventListener("visibilitychange", refresh);
  const timer = setInterval(refresh, intervalMs);
  return () => {
    window.removeEventListener("focus", refresh);
    window.removeEventListener("online", refresh);
    document.removeEventListener("visibilitychange", refresh);
    clearInterval(timer);
  };
}

/**
 * Read one project from the server (`GET /projects/{id}`) and add it to the
 * mirror. For a project that is not in the list yet — e.g. a link to a project
 * that was shared a moment ago. Rejects with a 404 when it does not exist or is
 * not shared with this user.
 */
export async function loadProject(projectId: string): Promise<LocalProject> {
  const project = await fetchProject(projectId);
  localRev += 1;
  setCache(cache.some((p) => p.id === projectId) ? cache.map((p) => (p.id === projectId ? project : p)) : [...cache, project]);
  return project;
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export function getProjects(): LocalProject[] {
  return cache;
}
export function getProject(id: string): LocalProject | undefined {
  return cache.find((p) => p.id === id);
}

/** True when the server says the signed-in user owns the project. */
export function isProjectOwner(project: LocalProject | undefined): boolean {
  return project?.role === "owner";
}

/** The owner's email: their member row, else the address stored on the project. */
export function projectOwnerEmail(project: LocalProject | undefined): string | undefined {
  return project?.members?.find((m) => m.role === "owner")?.email ?? project?.ownerEmail ?? undefined;
}

/** Everyone on a project, owner first. A project whose owner has no member row
 *  (created without a verified email) still lists them, from `ownerEmail`. */
export function projectMembers(project: LocalProject | undefined): ProjectMember[] {
  if (!project) return [];
  const members = project.members ?? [];
  const owners = members.filter((m) => m.role === "owner");
  const others = members.filter((m) => m.role !== "owner");
  if (owners.length === 0 && project.ownerEmail) {
    owners.push({ email: project.ownerEmail.toLowerCase(), role: "owner", status: "active" });
  }
  return [...owners, ...others];
}

// ── Changes: optimistic mirror update → one request → rollback on refusal ─────

function patchProject(projectId: string, change: (project: LocalProject) => LocalProject): void {
  setCache(cache.map((p) => (p.id === projectId ? change(p) : p)));
}

/** Put one project back the way it was before a change the server refused. */
function restore(projectId: string, before: LocalProject | undefined, index: number): void {
  const without = cache.filter((p) => p.id !== projectId);
  if (!before) return setCache(without);
  if (cache.some((p) => p.id === projectId)) return patchProject(projectId, () => before);
  setCache([...without.slice(0, index), before, ...without.slice(index)]);
}

/**
 * Run one change: show it, send it, and undo it if the server says no. After a
 * refusal the list is re-read, because a 403 / 404 / 409 means this mirror was
 * out of step with the server (a role changed, the project was deleted, …).
 */
async function commit<T>(projectId: string, apply: () => void, send: () => Promise<T>): Promise<T> {
  const index = cache.findIndex((p) => p.id === projectId);
  const before = cache[index];
  localRev += 1;
  pending += 1;
  apply();
  let refused = false;
  try {
    return await send();
  } catch (err) {
    refused = true;
    restore(projectId, before, index < 0 ? cache.length : index);
    throw err;
  } finally {
    pending -= 1;
    localRev += 1;
    if (refused) void refreshProjects();
  }
}

/** Take the server's version of a project, unless another change to the list is
 *  still on the wire (its optimistic state must not be overwritten). */
function adopt(project: StoredProject): void {
  if (pending > 1) return;
  if (cache.some((p) => p.id === project.id)) patchProject(project.id, () => project);
  else setCache([...cache, project]);
}

function requireProject(projectId: string): LocalProject {
  const project = getProject(projectId);
  if (!project) throw new ApiError("Project not found", 404, "not_found");
  return project;
}

/** Create a project (`PUT /projects/{id}` with a new id). The signed-in user
 *  becomes its owner — the server decides that from the session, not from
 *  anything sent here. Resolves with the project as the server stored it. */
export async function createProject(name: string, client?: string): Promise<LocalProject> {
  const cleanName = name.trim();
  if (!cleanName) throw new ApiError("A project name is required", 400, "bad_request");
  const cleanClient = client?.trim() || undefined;
  const id = newId();
  const draft: LocalProject = {
    id, name: cleanName, client: cleanClient, createdAt: new Date().toISOString(),
    docIds: [], role: "owner", members: [],
  };
  return commit(id, () => setCache([...cache, draft]), async () => {
    const created = await putProject(id, { name: cleanName, client: cleanClient });
    adopt(created);
    return created;
  });
}

/** Rename a project, and optionally change its client (`PUT /projects/{id}`).
 *  Owner only. Pass `client: ""` to clear it; leave it out to keep it. */
export async function renameProject(projectId: string, name: string, client?: string): Promise<LocalProject> {
  requireProject(projectId);
  const cleanName = name.trim();
  if (!cleanName) throw new ApiError("A project name is required", 400, "bad_request");
  const fields: { name: string; client?: string | null } = { name: cleanName };
  if (client !== undefined) fields.client = client.trim() || null;
  return commit(
    projectId,
    () => patchProject(projectId, (p) => ({ ...p, name: cleanName, ...(client !== undefined ? { client: fields.client } : {}) })),
    async () => {
      const saved = await putProject(projectId, fields);
      adopt(saved);
      return saved;
    },
  );
}

/** Delete a project (`DELETE /projects/{id}`). Owner only. Its documents are
 *  kept: they stay with whoever uploaded them and stop being shared. */
export async function deleteProject(projectId: string): Promise<void> {
  requireProject(projectId);
  await commit(projectId, () => setCache(cache.filter((p) => p.id !== projectId)), () => deleteProjectById(projectId));
}

/** File an existing document in a project (`PUT /projects/{id}/documents/{docId}`).
 *  Needs owner or editor on the project AND owner on the document, because
 *  filing it shares it with every member. A document uploaded with a
 *  `projectId` is filed by the server and does not need this call. */
export async function addDocToProject(projectId: string, docId: string): Promise<void> {
  requireProject(projectId);
  await commit(
    projectId,
    () => patchProject(projectId, (p) => (p.docIds.includes(docId) ? p : { ...p, docIds: [...p.docIds, docId] })),
    async () => adopt(await addProjectDocument(projectId, docId)),
  );
}

/** Take a document out of a project (`DELETE /projects/{id}/documents/{docId}`).
 *  Owner or editor. The document itself is not deleted. */
export async function removeDocFromProject(projectId: string, docId: string): Promise<void> {
  requireProject(projectId);
  await commit(
    projectId,
    () => patchProject(projectId, (p) => ({ ...p, docIds: p.docIds.filter((d) => d !== docId) })),
    async () => adopt(await removeProjectDocument(projectId, docId)),
  );
}

// ── Membership ────────────────────────────────────────────────────────────────

function patchMembers(projectId: string, change: (members: ProjectMember[]) => ProjectMember[]): void {
  patchProject(projectId, (p) => ({ ...p, members: change(p.members ?? []) }));
}

/** Invite someone to a project (`POST /projects/{id}/invite`). Owner only. The
 *  member shows up immediately and is rolled back if the API refuses. Rejects
 *  with the API error (`status`, `code`) so the UI can say why. */
export async function inviteMember(
  projectId: string,
  email: string,
  role: Exclude<ProjectRole, "owner"> = "viewer",
): Promise<InviteResult> {
  const address = email.trim().toLowerCase();
  const project = requireProject(projectId);
  if (projectMembers(project).some((m) => sameEmail(m.email, address))) {
    throw new ApiError("That user is already a member of this project", 409, "already_member");
  }
  return commit(
    projectId,
    () => patchMembers(projectId, (members) => [
      ...members,
      { email: address, role, status: "invited", invitedAt: new Date().toISOString() },
    ]),
    async () => {
      const result = await inviteProjectMember(projectId, address, role);
      // The server's row says whether they are active already or still invited.
      patchMembers(projectId, (members) => members.map((m) => (sameEmail(m.email, address) ? result.member : m)));
      return result;
    },
  );
}

/** Remove a member from a project (`DELETE /projects/{id}/members/{email}`).
 *  Owner only; the owner cannot be removed. Their access ends at once. */
export async function removeMember(projectId: string, email: string): Promise<void> {
  requireProject(projectId);
  await commit(
    projectId,
    () => patchMembers(projectId, (members) => members.filter((m) => !sameEmail(m.email, email))),
    () => removeProjectMember(projectId, email),
  );
}

/** Leave a project you were invited to (the same route, with your own email).
 *  The project stays on screen until the server confirms, then leaves the
 *  list — the page showing it is told only once it is really gone. */
export async function leaveProject(projectId: string, ownEmail: string): Promise<void> {
  requireProject(projectId);
  await commit(projectId, () => {}, () => removeProjectMember(projectId, ownEmail));
  localRev += 1;
  setCache(cache.filter((p) => p.id !== projectId));
}

/** Change a member's role (`PATCH /projects/{id}/members/{email}`). Owner only;
 *  the owner's own role cannot be changed. */
export async function setMemberRole(
  projectId: string,
  email: string,
  role: Exclude<ProjectRole, "owner">,
): Promise<void> {
  requireProject(projectId);
  await commit(
    projectId,
    () => patchMembers(projectId, (members) => members.map((m) => (sameEmail(m.email, email) ? { ...m, role } : m))),
    async () => {
      const saved = await setProjectMemberRole(projectId, email, role);
      patchMembers(projectId, (members) => members.map((m) => (sameEmail(m.email, email) ? { ...m, ...saved } : m)));
    },
  );
}

// ── Mirror-only updates (the server has already made the change) ─────────────

/** A document was uploaded with `?projectId=`: the server filed it in the
 *  project while creating it, so only the mirror needs to learn about it. */
export function noteDocFiled(projectId: string, docId: string): void {
  const project = getProject(projectId);
  if (!project || project.docIds.includes(docId)) return;
  localRev += 1;
  patchProject(projectId, (p) => ({ ...p, docIds: [...p.docIds, docId] }));
}

/** A document was deleted: the server took it out of every project that listed
 *  it, so drop it from the mirror too. Sends nothing. */
export function removeDocFromAllProjects(docId: string): void {
  if (!cache.some((p) => p.docIds.includes(docId))) return;
  localRev += 1;
  setCache(cache.map((p) => (p.docIds.includes(docId) ? { ...p, docIds: p.docIds.filter((d) => d !== docId) } : p)));
}

/**
 * In-memory only: real projects plus a synthetic single-doc project for every
 * document not already in one. Used by the Dashboard (and Projects page) so the
 * portfolio reflects ALL uploaded documents, not just grouped ones. Not saved.
 */
export function withUngroupedDocs(
  projects: LocalProject[],
  docs: { docId: string; title?: string; createdAt?: string; parties?: string[]; parentDocId?: string | null }[],
): LocalProject[] {
  const grouped = new Set(projects.flatMap((p) => p.docIds));
  const ungrouped = docs.filter((d) => !grouped.has(d.docId));
  if (ungrouped.length === 0) return projects;

  // Group the ungrouped documents by amendment chain (follow parentDocId to its
  // root) so a SOW and its amendments form ONE synthetic project. Otherwise each
  // would be treated as a separate contract and the portfolio total would
  // over-count — e.g. SOW $7,500 + Amd $10,000 + Amd $12,300 summed = $29,800
  // instead of the true running total $12,300.
  const byId = new Map(docs.map((d) => [d.docId, d]));
  const rootOf = (docId: string): string => {
    let cur = byId.get(docId);
    const seen = new Set<string>();
    while (cur?.parentDocId && byId.has(cur.parentDocId) && !seen.has(cur.docId)) {
      seen.add(cur.docId);
      cur = byId.get(cur.parentDocId);
    }
    return cur?.docId ?? docId;
  };
  const byCreated = (a: { createdAt?: string }, b: { createdAt?: string }) =>
    new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();

  const chains = new Map<string, typeof ungrouped>();
  for (const d of ungrouped) {
    const root = rootOf(d.docId);
    chains.set(root, [...(chains.get(root) ?? []), d]);
  }
  const synthetic: LocalProject[] = [...chains.entries()].map(([rootId, chainDocs]) => {
    const ordered = [...chainDocs].sort(byCreated);
    const root = byId.get(rootId) ?? ordered[0];
    return {
      id: rootId,
      name: root.title || "Untitled document",
      client: root.parties?.[0],
      // The document's own upload time. Never "now": a missing date must not
      // look like a contract created today.
      createdAt: root.createdAt ?? "",
      docIds: ordered.map((d) => d.docId),
    };
  });
  return [...projects, ...synthetic];
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

/** Load state of the projects list (loading / ready / error, last read time). */
export function useProjectsSync(): ProjectsSyncState {
  return useSyncExternalStore(subscribe, () => sync, () => IDLE_SYNC);
}
