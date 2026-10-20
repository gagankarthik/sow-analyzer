"use client";

import { RolesMatrix } from "@/components/settings/RolesMatrix";
import { OrgAdmins } from "@/components/settings/OrgAdmins";
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
import { PanelRowsSkeleton, SkeletonRegion } from "@/components/ds/skeletons";

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
    <Button onClick={() => setInviting(true)}>
      <Plus size={16} aria-hidden />
      Invite people
    </Button>
  ) : (
    <Button asChild>
      <Link href="/projects/new">
        <Plus size={16} aria-hidden />
        Create a project
      </Link>
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Team & roles"
        back={{ href: "/settings", label: "Settings" }}
        actions={!projectsLoading && !projectsFailed ? inviteAction : undefined}
      />

      <SettingsLayout>
        {/* ── People (focal) ── */}
        <SettingsSection
          title={
            <span className="flex items-baseline gap-x-2">
              People
              {!projectsLoading && !projectsFailed && (
                <span className="text-xs font-normal text-[var(--ink-500)] tabular-nums">{people.length}</span>
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
          flush
        >
          {projectsLoading ? (
            <SkeletonRegion label="people">
              <PanelRowsSkeleton rows={4} />
            </SkeletonRegion>
          ) : projectsFailed ? (
            <div role="alert" className="flex flex-col items-start px-4 py-10">
              <AlertTriangle size={24} aria-hidden className="mb-3 text-[var(--danger)]" />
              <p className="text-sm font-semibold text-foreground">Couldn&apos;t load your projects</p>
              <p className="mt-1 max-w-md break-words text-sm leading-relaxed text-[var(--ink-600)]">
                People are listed from your projects, so nobody can be shown until they load.
                {projectsSync.error ? ` ${projectsSync.error}` : ""}
              </p>
              <Button variant="outline" className="mt-4 w-full sm:w-auto" onClick={() => void refreshProjects()}>
                <RefreshCw size={16} aria-hidden />
                Try again
              </Button>
            </div>
          ) : teammates === 0 ? (
            <div className="flex flex-col items-start px-4 py-10">
              <Users size={24} aria-hidden className="mb-3 text-[var(--ink-400)]" />
              <p className="text-sm font-semibold text-foreground">It&apos;s just you so far</p>
              <p className="mt-1 max-w-md text-sm leading-relaxed text-[var(--ink-600)]">
                {canInvite
                  ? "Invite the people who review contracts with you: pick one or more of your projects and a role."
                  : "People are invited to a project, so create one first."}
              </p>
            </div>
          ) : (
            <>
              {projectsSync.error && (
                <p role="status" className="flex items-start gap-2 border-b border-border bg-[var(--warning-soft)] px-4 py-2.5 text-sm text-foreground">
                  <AlertTriangle size={16} aria-hidden className="mt-0.5 shrink-0 text-[var(--warning-fg)]" />
                  <span className="min-w-0 break-words">The latest refresh or save failed, so this list may be out of date. {projectsSync.error}</span>
                </p>
              )}
              <div role="toolbar" aria-label="Filter people" className="flex min-w-0 flex-col gap-2 border-b border-border px-4 py-2.5 md:flex-row md:flex-wrap md:items-center md:gap-3">
                <SettingsSearch
                  id="team-search"
                  label="Search people"
                  placeholder="Email or project name"
                  value={q}
                  onChange={setQ}
                />
                <FilterChips
                  label="Role"
                  value={roleFilter}
                  onChange={setRoleFilter}
                  options={[
                    { value: "all", label: "All" },
                    ...ROLE_ORDER.map((r) => ({ value: r, label: ROLE_META[r].label })),
                  ]}
                />
                <FilterChips
                  label="Status"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: "all", label: "Any" },
                    { value: "active", label: "Active" },
                    { value: "invited", label: "Invited" },
                  ]}
                />
                <div className="flex min-w-0 items-center gap-2 md:ml-auto">
                  <span id="team-sort-label" className="shrink-0 text-xs text-[var(--ink-500)]">Sort</span>
                  <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                    <SelectTrigger aria-labelledby="team-sort-label" className="h-8 w-full text-xs md:w-44 max-md:h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORTS.map((s) => (
                        <SelectItem key={s.value} value={s.value} className="min-h-10">{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {visible.length === 0 ? (
                <NoResults noun="people" onClear={clearFilters} />
              ) : (
                <>
                  <div aria-hidden className={cn("hidden h-[38px] items-center border-b border-border bg-[var(--panel)] px-4 text-xs font-medium text-[var(--ink-600)]", COLUMNS)}>
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
                  <div className="border-t border-border px-4 py-2.5">
                    <FilterSummary shown={visible.length} total={people.length} noun="people in view" active={filtering} onClear={clearFilters} />
                  </div>
                </>
              )}
            </>
          )}
        </SettingsSection>

        {/* ── Who administers this organization ── */}
        <OrgAdmins />

        {/* ── Projects other people own and shared with me ── */}
        {!projectsLoading && !projectsFailed && sharedProjects.length > 0 && (
          <SettingsSection
            title={
              <span className="flex items-baseline gap-x-2">
                Shared with you
                <span className="text-xs font-normal text-[var(--ink-500)] tabular-nums">{sharedProjects.length}</span>
              </span>
            }
            description="Projects you were invited to. You can leave any time."
            flush
          >
            <ul className="divide-y divide-border">
              {sharedProjects.map((p) => {
                const role = p.role ?? "viewer";
                const owner = projectOwnerEmail(p);
                return (
                  <li key={p.id} className="flex flex-col gap-2 px-4 py-2.5 md:flex-row md:items-center md:justify-between md:gap-4">
                    <div className="min-w-0">
                      <Link
                        href={`/projects/${p.id}`}
                        className="break-words text-sm font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)]"
                      >
                        {p.name || "Untitled project"}
                      </Link>
                      <p className="mt-0.5 break-words text-xs text-[var(--ink-600)]">
                        {owner ? `Owned by ${owner}.` : "Owner not recorded."} {ROLE_META[role].summary}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Badge variant={ROLE_META[role].tone} size="md">{ROLE_META[role].label}</Badge>
                      <span className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-500)]">
                        <Lock size={12} aria-hidden className="shrink-0" />
                        Read-only
                      </span>
                      {me && (
                        <button
                          type="button"
                          onClick={() => setRemoveTarget({ email: me, projectId: p.id, projectName: p.name, self: true })}
                          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-[var(--danger-fg)] transition-colors duration-150 hover:bg-[var(--danger-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)] max-md:h-11"
                        >
                          <LogOut size={16} aria-hidden />
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
          description="Roles are set per project. One person can hold different roles."
        >
          <div className="flex items-start gap-3 rounded-md bg-[var(--panel)] p-3">
            <ShieldCheck size={16} aria-hidden className="mt-0.5 shrink-0 text-[var(--ink-600)]" />
            <p className="min-w-0 text-sm leading-relaxed text-foreground">
              <span className="font-semibold">Roles are enforced on every request.</span> A person sees a project
              only if they own it or were invited to it, and a document only if they uploaded it or it is in a
              project they can see. Anyone can leave a project they were invited to; the owner cannot be removed
              or given another role.
            </p>
          </div>

          <dl className="mt-4 divide-y divide-border">
            {ROLE_ORDER.map((role) => {
              const meta = ROLE_META[role];
              const Icon = meta.icon;
              return (
                <div key={role} className="grid grid-cols-1 gap-x-6 gap-y-1 py-3 first:pt-0 last:pb-0 md:grid-cols-[176px_minmax(0,1fr)_auto] md:items-baseline">
                  <dt className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Icon size={16} aria-hidden className="shrink-0 text-[var(--ink-500)]" />
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

        {/* ── Permissions by role, as the server enforces them ── */}
        <SettingsSection
          title="Roles and permissions"
          description="What each role can do. Govern roles are set by your admin."
        >
          <RolesMatrix />
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
          "flex min-h-[42px] w-full items-center gap-3 px-4 py-2 text-left transition-colors duration-150 hover:bg-[var(--ink-50)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary-600)]",
          COLUMNS,
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-structure-soft text-xs font-semibold text-structure-soft-fg">
            {initialsFromEmail(person.email)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-medium text-foreground" title={person.email}>
                {person.email}
              </span>
              {isYou && (
                <span className="shrink-0 rounded-md bg-structure-soft px-1.5 py-0.5 text-xs font-medium text-structure-soft-fg">
                  You
                </span>
              )}
            </span>
            {isYou && yourName && (
              <span className="hidden truncate text-xs text-[var(--ink-500)] md:block">{yourName}</span>
            )}
            {/* Stacked summary below `md`, where the columns are hidden. */}
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--ink-600)] md:hidden">
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
            <RoleIcon size={12} aria-hidden />
            {meta.label}
          </Badge>
        </span>
        <span className="hidden text-sm tabular-nums text-[var(--ink-600)] md:block">{projectsLabel}</span>
        <span className="flex shrink-0 items-center justify-end gap-1 text-sm font-medium text-[var(--brand-primary-600)]">
          <span className="hidden md:inline">{canManageAny ? "Manage" : "View"}</span>
          <ChevronDown size={16} aria-hidden className={cn("transition-transform duration-150 motion-reduce:transition-none", open && "rotate-180")} />
        </span>
      </button>

      {open && (
        <div id={panelId} className="border-t border-border bg-[var(--panel)] px-4 md:pl-14">
          <ul className="flex flex-col divide-y divide-border">
            {person.memberships.map((m) => (
              <li
                key={`${m.projectId}-${m.isCreator ? "creator" : "member"}`}
                className="flex flex-col gap-2 py-2.5 md:flex-row md:items-center md:justify-between md:gap-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/projects/${m.projectId}`}
                    className="break-words text-sm font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)]"
                  >
                    {m.projectName}
                  </Link>
                  <p className="mt-0.5 text-xs text-[var(--ink-600)]">{membershipNote(m)}</p>
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
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-[var(--danger-fg)] transition-colors duration-150 hover:bg-[var(--danger-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)] max-md:h-11"
                    >
                      <Trash2 size={16} aria-hidden />
                      Remove
                    </button>
                  )}
                  {m.self ? (
                    <button
                      type="button"
                      onClick={() => onRemove({ email: person.email, projectId: m.projectId, projectName: m.projectName, self: true })}
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-[var(--danger-fg)] transition-colors duration-150 hover:bg-[var(--danger-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)] max-md:h-11"
                    >
                      <LogOut size={16} aria-hidden />
                      Leave
                    </button>
                  ) : !m.isCreator && !m.manageable && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-500)]">
                      <Lock size={12} aria-hidden className="shrink-0" />
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
      <Check size={12} aria-hidden className="text-[var(--ink-500)]" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1">
      <Clock size={12} aria-hidden className="text-[var(--ink-500)]" />
      Invited
    </span>
  );
}
