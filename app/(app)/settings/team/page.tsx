"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FilterChips,
  FilterSummary,
  NoResults,
  SettingsLayout,
  SettingsSearch,
  SettingsSection,
} from "@/components/settings/SettingsNav";
import {
  isProjectOwner, projectMembers, projectOwnerEmail, refreshProjects, useProjects, useProjectsSync,
} from "@/lib/projects-store";
import { useAuth } from "@/components/auth/AuthProvider";
import type { ProjectRole } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { InviteDialog } from "@/components/team/InviteDialog";
import { RoleSelect } from "@/components/team/RoleSelect";
import { RemoveMemberDialog, type RemoveTarget } from "@/components/team/RemoveMemberDialog";
import { ROLE_META, ROLE_ORDER, initialsFromEmail, roleRank } from "@/components/team/roles";
import {
  AlertTriangle, Check, ChevronDown, Clock, Lock, LogOut, Plus, RefreshCw, ShieldCheck, Trash2, Users,
} from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";

type Status = "invited" | "active";

type Membership = {
  projectId: string;
  projectName: string;
  role: ProjectRole;
  status: Status;
  invitedAt?: string;
  /** The project's owner, shown when the row is read-only. */
  projectOwner?: string;
  /** True for the owner's own row: it cannot be removed or given another role. */
  isCreator: boolean;
  /** The signed-in user owns the project, so may change or remove this row. */
  manageable: boolean;
  /** The signed-in user's own membership of someone else's project: they may leave. */
  self: boolean;
};

type Person = {
  email: string;
  /** Highest role held on any project. */
  role: ProjectRole;
  /** Active once they are active on at least one project. */
  status: Status;
  memberships: Membership[];
  lastInvitedAt: number;
};

type SortKey = "role" | "email" | "projects" | "recent";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "role", label: "Role, highest first" },
  { value: "email", label: "Email A to Z" },
  { value: "projects", label: "Most projects" },
  { value: "recent", label: "Recently invited" },
];

/** Shared by the header row and each person row from `md` up. */
const COLUMNS = "md:grid md:grid-cols-[minmax(0,1fr)_104px_112px_112px_88px] md:items-center md:gap-4";

function timeOf(iso?: string): number {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? 0 : t;
}

export default function TeamSettingsPage() {
  const projects = useProjects();
  // People are read off the projects list, so its load state decides what may
  // be said: until it has loaded there is no "just you", and no head-count.
  const projectsSync = useProjectsSync();
  const projectsLoading = projectsSync.status === "idle" || projectsSync.status === "loading";
  const projectsFailed = projectsSync.status === "error";
  const { user } = useAuth();
  const me = user?.email?.toLowerCase() ?? "";

  const ownedProjects = useMemo(
    () => projects.filter((p) => isProjectOwner(p)),
    [projects],
  );
  // Projects someone else owns and shared with me: I can see who is on them,
  // but only their owner manages them.
  const sharedProjects = useMemo(() => projects.filter((p) => !isProjectOwner(p)), [projects]);

  const people = useMemo<Person[]>(() => {
    const map = new Map<string, Person>();
    const add = (email: string, m: Membership) => {
      const key = email.toLowerCase();
      const person = map.get(key) ?? { email: key, role: m.role, status: m.status, memberships: [], lastInvitedAt: 0 };
      if (roleRank(m.role) < roleRank(person.role)) person.role = m.role;
      if (m.status === "active") person.status = "active";
      person.lastInvitedAt = Math.max(person.lastInvitedAt, timeOf(m.invitedAt));
      person.memberships.push(m);
      map.set(key, person);
    };

    for (const p of projects) {
      const owned = isProjectOwner(p);
      const base = { projectId: p.id, projectName: p.name, projectOwner: projectOwnerEmail(p) };
      // The server lists the owner among the members, with role `owner`.
      for (const m of projectMembers(p)) {
        const isCreator = m.role === "owner";
        add(m.email, {
          ...base, role: m.role, status: isCreator ? "active" : m.status, invitedAt: m.invitedAt, isCreator,
          manageable: owned && !isCreator,
          self: !owned && !isCreator && m.email.toLowerCase() === me,
        });
      }
    }
    return [...map.values()];
  }, [projects, me]);

  const teammates = people.filter((p) => p.email !== me).length;

  const counts = useMemo(() => {
    const c: Record<ProjectRole, number> = { owner: 0, editor: 0, viewer: 0 };
    for (const p of people) c[p.role] += 1;
    return c;
  }, [people]);

  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<ProjectRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [sort, setSort] = useState<SortKey>("role");
  const [openEmail, setOpenEmail] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<RemoveTarget | null>(null);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    const byEmail = (a: Person, b: Person) => a.email.localeCompare(b.email);
    const order: Record<SortKey, (a: Person, b: Person) => number> = {
      role: (a, b) => roleRank(a.role) - roleRank(b.role) || byEmail(a, b),
      email: byEmail,
      projects: (a, b) => b.memberships.length - a.memberships.length || byEmail(a, b),
      recent: (a, b) => b.lastInvitedAt - a.lastInvitedAt || byEmail(a, b),
    };
    return people
      .filter(
        (p) =>
          (roleFilter === "all" || p.memberships.some((m) => m.role === roleFilter)) &&
          (statusFilter === "all" || p.status === statusFilter) &&
          (!term ||
            p.email.includes(term) ||
            p.memberships.some((m) => m.projectName.toLowerCase().includes(term))),
      )
      .sort(order[sort]);
  }, [people, q, roleFilter, statusFilter, sort]);

  const filtering = q.trim() !== "" || roleFilter !== "all" || statusFilter !== "all";
  const clearFilters = () => {
    setQ("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  const canInvite = ownedProjects.length > 0;
  const inviteAction = canInvite ? (
    <Button size="lg" className="w-full sm:w-auto" onClick={() => setInviting(true)}>
      <Plus size={14} />
      Invite people
    </Button>
  ) : (
    <Button size="lg" className="w-full sm:w-auto" asChild>
      <Link href="/projects/new">
        <Plus size={14} />
        Create a project
      </Link>
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Team & roles"
        subtitle="Invite colleagues to your projects, set their role and remove them when the work is done."
        back={{ href: "/settings", label: "Settings" }}
      />

      <SettingsLayout>
        {/* ── People (focal) ── */}
        <SettingsSection
          title={
            <span className="flex flex-wrap items-baseline gap-x-2">
              People
              {!projectsLoading && !projectsFailed && (
                <span className="text-sm font-medium text-muted-foreground tabular-nums">{people.length}</span>
              )}
            </span>
          }
          description={
            canInvite
              ? "Access is granted per project. You manage the projects you own; projects shared with you are shown read-only."
              : sharedProjects.length > 0
                ? "Access is granted per project, by its owner. You don't own a project, so the people on the projects shared with you are shown read-only."
                : "Access is granted per project, by its owner. You don't own a project yet."
          }
          action={!projectsLoading && !projectsFailed && teammates > 0 ? inviteAction : undefined}
          flush
        >
          {projectsLoading ? (
            <div role="status" aria-label="Loading people" className="space-y-3 p-4 sm:p-5">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : projectsFailed ? (
            <div role="alert" className="flex flex-col items-start px-4 py-10 sm:px-8 sm:py-12">
              <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--danger-soft)] text-[var(--danger)]">
                <AlertTriangle size={22} strokeWidth={1.5} />
              </span>
              <p className="text-xl font-semibold tracking-tight text-foreground">Couldn&apos;t load your projects</p>
              <p className="mt-1.5 max-w-md break-words text-base leading-relaxed text-[var(--ink-600)]">
                People are listed from your projects, so nobody can be shown until they load.
                {projectsSync.error ? ` ${projectsSync.error}` : ""}
              </p>
              <Button variant="outline" size="lg" className="mt-5 w-full sm:w-auto" onClick={() => void refreshProjects()}>
                <RefreshCw size={14} />
                Try again
              </Button>
            </div>
          ) : teammates === 0 ? (
            <div className="flex flex-col items-start px-4 py-10 sm:px-8 sm:py-12">
              <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-structure-soft text-structure-soft-fg">
                <Users size={22} strokeWidth={1.5} />
              </span>
              <p className="text-xl font-semibold tracking-tight text-foreground">It&apos;s just you so far</p>
              <p className="mt-1.5 max-w-md text-base leading-relaxed text-[var(--ink-600)]">
                {canInvite
                  ? "Invite the people who review contracts with you. Pick one or more of your projects and a role for each batch of invitations."
                  : "People are invited to a project, so create one first. You will then be able to invite colleagues to it from here."}
              </p>
              <div className="mt-5 w-full sm:w-auto">{inviteAction}</div>
            </div>
          ) : (
            <>
              {projectsSync.error && (
                <p role="status" className="flex items-start gap-2 border-b border-border bg-[var(--warning-soft)] px-4 py-2.5 text-sm text-foreground sm:px-5">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[var(--warning)]" />
                  <span className="min-w-0 break-words">The latest refresh or save failed, so this list may be out of date. {projectsSync.error}</span>
                </p>
              )}
              <div className="flex flex-col gap-4 border-b border-border p-4 sm:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <SettingsSearch
                    id="team-search"
                    label="Search people"
                    placeholder="Email or project name"
                    value={q}
                    onChange={setQ}
                  />
                  <div className="w-full md:w-[210px]">
                    <span id="team-sort-label" className="mb-1.5 block text-sm font-medium text-[var(--ink-600)]">
                      Sort by
                    </span>
                    <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                      <SelectTrigger aria-labelledby="team-sort-label" className="w-full border-[var(--ink-300)] bg-card text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SORTS.map((s) => (
                          <SelectItem key={s.value} value={s.value} className="min-h-10 text-base">{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-col gap-4 md:flex-row md:gap-8">
                  <FilterChips
                    label="Role"
                    value={roleFilter}
                    onChange={setRoleFilter}
                    options={[
                      { value: "all", label: "All roles" },
                      ...ROLE_ORDER.map((r) => ({ value: r, label: ROLE_META[r].label })),
                    ]}
                  />
                  <FilterChips
                    label="Status"
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={[
                      { value: "all", label: "Any status" },
                      { value: "active", label: "Active" },
                      { value: "invited", label: "Invited" },
                    ]}
                  />
                </div>
                <FilterSummary
                  shown={visible.length}
                  total={people.length}
                  noun="people"
                  active={filtering}
                  onClear={clearFilters}
                />
              </div>

              {visible.length === 0 ? (
                <div className="p-4 sm:p-5">
                  <NoResults noun="people" onClear={clearFilters} />
                </div>
              ) : (
                <>
                  <div aria-hidden className={cn("hidden border-b border-border px-5 py-2 text-xs font-medium text-muted-foreground", COLUMNS)}>
                    <span>Person</span>
                    <span>Status</span>
                    <span>Highest role</span>
                    <span>Projects</span>
                    <span />
                  </div>
                  <ul className="divide-y divide-border">
                    {visible.map((p) => (
                      <PersonRow
                        key={p.email}
                        person={p}
                        isYou={p.email === me}
                        yourName={user?.name}
                        open={openEmail === p.email}
                        onToggle={() => setOpenEmail((cur) => (cur === p.email ? null : p.email))}
                        onRemove={setRemoveTarget}
                      />
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </SettingsSection>

        {/* ── Projects other people own and shared with me ── */}
        {!projectsLoading && !projectsFailed && sharedProjects.length > 0 && (
          <SettingsSection
            title={
              <span className="flex flex-wrap items-baseline gap-x-2">
                Shared with you
                <span className="text-sm font-medium text-muted-foreground tabular-nums">{sharedProjects.length}</span>
              </span>
            }
            description="Projects you were invited to. Their owner decides who is on them and what your role is; you can leave at any time."
            flush
          >
            <ul className="divide-y divide-border">
              {sharedProjects.map((p) => {
                const role = p.role ?? "viewer";
                const owner = projectOwnerEmail(p);
                return (
                  <li key={p.id} className="flex flex-col gap-3 px-4 py-3 sm:px-5 md:flex-row md:items-center md:justify-between md:gap-4">
                    <div className="min-w-0">
                      <Link
                        href={`/projects/${p.id}`}
                        className="break-words text-base font-semibold text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        {p.name || "Untitled project"}
                      </Link>
                      <p className="mt-0.5 break-words text-sm leading-relaxed text-[var(--ink-600)]">
                        {owner ? `Owned by ${owner}.` : "Owner not recorded."} {ROLE_META[role].summary}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Badge variant={ROLE_META[role].tone} size="md">{ROLE_META[role].label}</Badge>
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Lock size={14} className="shrink-0" />
                        Membership is read-only
                      </span>
                      {me && (
                        <button
                          type="button"
                          onClick={() => setRemoveTarget({ email: me, projectId: p.id, projectName: p.name, self: true })}
                          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                          <LogOut size={15} />
                          Leave
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </SettingsSection>
        )}

        {/* ── Roles reference ── */}
        <SettingsSection
          title="Roles"
          description="A role is chosen per project when you invite someone, and the owner can change it later. The same person can hold different roles on different projects."
        >
          <div className="flex items-start gap-3 rounded-lg border border-[color-mix(in_srgb,var(--info)_18%,transparent)] bg-[var(--info-soft)] p-3 sm:p-4">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[var(--info)]" />
            <p className="min-w-0 text-sm leading-relaxed text-foreground">
              <span className="font-semibold">Roles are enforced on every request.</span> A person sees a project
              only if they own it or were invited to it, and a document only if they uploaded it or it is in a
              project they can see. Anyone can leave a project they were invited to; the owner cannot be removed
              or given another role.
            </p>
          </div>

          <dl className="mt-4 divide-y divide-border sm:mt-5">
            {ROLE_ORDER.map((role) => {
              const meta = ROLE_META[role];
              const Icon = meta.icon;
              return (
                <div key={role} className="grid grid-cols-1 gap-x-6 gap-y-1 py-3 first:pt-0 last:pb-0 md:grid-cols-[176px_minmax(0,1fr)_auto] md:items-baseline">
                  <dt className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Icon size={16} className="shrink-0 text-[var(--ink-600)]" />
                    {meta.label}
                  </dt>
                  <dd className="text-sm leading-relaxed text-[var(--ink-600)]">{meta.summary}</dd>
                  <dd className="text-sm tabular-nums text-muted-foreground">
                    {projectsLoading || projectsFailed ? "—" : `${counts[role]} ${counts[role] === 1 ? "person" : "people"}`}
                  </dd>
                </div>
              );
            })}
          </dl>
        </SettingsSection>
      </SettingsLayout>

      <InviteDialog open={inviting} onClose={() => setInviting(false)} projects={ownedProjects} />
      <RemoveMemberDialog target={removeTarget} onClose={() => setRemoveTarget(null)} />
    </>
  );
}

function PersonRow({
  person,
  isYou,
  yourName,
  open,
  onToggle,
  onRemove,
}: {
  person: Person;
  isYou: boolean;
  yourName?: string;
  open: boolean;
  onToggle: () => void;
  onRemove: (target: RemoveTarget) => void;
}) {
  const meta = ROLE_META[person.role];
  const RoleIcon = meta.icon;
  const count = person.memberships.length;
  const projectsLabel = `${count} ${count === 1 ? "project" : "projects"}`;
  const canManageAny = person.memberships.some((m) => m.manageable);
  const panelId = `memberships-${person.email.replace(/[^a-z0-9]/g, "-")}`;

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--panel)] sm:px-5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50",
          COLUMNS,
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-structure-soft text-sm font-semibold text-structure-soft-fg">
            {initialsFromEmail(person.email)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-base font-semibold text-foreground" title={person.email}>
                {person.email}
              </span>
              {isYou && (
                <span className="shrink-0 rounded-md bg-structure-soft px-1.5 py-0.5 text-xs font-medium text-structure-soft-fg">
                  You
                </span>
              )}
            </span>
            {isYou && yourName && (
              <span className="hidden truncate text-sm text-muted-foreground md:block">{yourName}</span>
            )}
            {/* Stacked summary below `md`, where the columns are hidden. */}
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-[var(--ink-600)] md:hidden">
              <StatusLabel status={person.status} />
              <span aria-hidden>·</span>
              {meta.label}
              <span aria-hidden>·</span>
              {projectsLabel}
            </span>
          </span>
        </span>

        <span className="hidden items-center gap-1.5 text-sm text-[var(--ink-600)] md:flex">
          <StatusLabel status={person.status} />
        </span>
        <span className="hidden md:block">
          <Badge variant={meta.tone} size="md">
            <RoleIcon size={12} />
            {meta.label}
          </Badge>
        </span>
        <span className="hidden text-sm tabular-nums text-[var(--ink-600)] md:block">{projectsLabel}</span>
        <span className="flex shrink-0 items-center justify-end gap-1 text-sm font-semibold text-[var(--brand-primary-600)]">
          <span className="hidden md:inline">{canManageAny ? "Manage" : "View"}</span>
          <ChevronDown size={16} className={cn("transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180")} />
        </span>
      </button>

      {open && (
        <div id={panelId} className="border-t border-border bg-[var(--panel)] px-4 py-3 sm:px-5 md:pl-[4.5rem]">
          <ul className="flex flex-col gap-2">
            {person.memberships.map((m) => (
              <li
                key={`${m.projectId}-${m.isCreator ? "creator" : "member"}`}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 md:flex-row md:items-center md:justify-between md:gap-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/projects/${m.projectId}`}
                    className="break-words text-base font-semibold text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    {m.projectName}
                  </Link>
                  <p className="mt-0.5 text-sm text-[var(--ink-600)]">{membershipNote(m)}</p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {m.manageable && m.role !== "owner" ? (
                    <RoleSelect
                      projectId={m.projectId}
                      projectName={m.projectName}
                      email={person.email}
                      role={m.role}
                      className="flex-1 md:flex-none"
                    />
                  ) : (
                    <Badge variant={ROLE_META[m.role].tone} size="md">{ROLE_META[m.role].label}</Badge>
                  )}
                  {m.manageable && (
                    <button
                      type="button"
                      onClick={() => onRemove({ email: person.email, projectId: m.projectId, projectName: m.projectName })}
                      aria-label={`Remove ${person.email} from ${m.projectName}`}
                      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <Trash2 size={15} />
                      Remove
                    </button>
                  )}
                  {m.self ? (
                    <button
                      type="button"
                      onClick={() => onRemove({ email: person.email, projectId: m.projectId, projectName: m.projectName, self: true })}
                      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <LogOut size={15} />
                      Leave
                    </button>
                  ) : !m.isCreator && !m.manageable && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Lock size={14} className="shrink-0" />
                      Read-only
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

/** One line under the project name: the membership's state, and why it is locked. */
function membershipNote(m: Membership): string {
  if (m.isCreator) return "Owns this project. The owner cannot be removed or given another role.";
  const invited = timeOf(m.invitedAt) ? formatDate(m.invitedAt as string) : "";
  const state =
    m.status === "invited"
      ? `Invited${invited ? ` ${invited}` : ""}, has not signed in yet`
      : `Active${invited ? `, added ${invited}` : ""}`;
  if (m.manageable) return `${state}.`;
  const owner = m.projectOwner ? ` (${m.projectOwner})` : "";
  if (m.self) return `${state}. You can leave; only the owner${owner} can change your role.`;
  return `${state}. Only the owner${owner} can change this.`;
}

function StatusLabel({ status }: { status: Status }) {
  return status === "active" ? (
    <span className="inline-flex items-center gap-1">
      <Check size={14} className="text-[var(--success)]" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1">
      <Clock size={14} />
      Invited
    </span>
  );
}
