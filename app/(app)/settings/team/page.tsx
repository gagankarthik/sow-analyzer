"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { MotionReveal } from "@/components/MotionReveal";
import { useProjects } from "@/lib/projects-store";
import { useAuth } from "@/components/auth/AuthProvider";
import type { ProjectMemberRole } from "@/lib/api";
import {
  ShieldCheck,
  Pencil,
  Eye,
  Users,
  ArrowRight,
  Clock,
  Check,
} from "@/components/ui/icons";

type RoleMeta = {
  role: ProjectMemberRole;
  label: string;
  icon: typeof ShieldCheck;
  blurb: string;
  can: string[];
};

const ROLE_META: Record<ProjectMemberRole, RoleMeta> = {
  owner: {
    role: "owner",
    label: "Owner",
    icon: ShieldCheck,
    blurb: "Created the project. Full control, including deletion.",
    can: ["Invite & remove members", "Re-analyse and delete", "Edit playbook & clauses", "View everything"],
  },
  editor: {
    role: "editor",
    label: "Editor",
    icon: Pencil,
    blurb: "Works the contracts day-to-day.",
    can: ["Upload & re-analyse documents", "Comment & resolve findings", "View everything"],
  },
  member: {
    role: "member",
    label: "Member",
    icon: Users,
    blurb: "Contributes within a project.",
    can: ["Upload documents", "Comment on findings", "View everything"],
  },
  viewer: {
    role: "viewer",
    label: "Viewer",
    icon: Eye,
    blurb: "Read-only access for stakeholders & auditors.",
    can: ["View analysis & timelines", "Export reports"],
  },
};

const ROLE_ORDER: ProjectMemberRole[] = ["owner", "editor", "member", "viewer"];

const ROLE_TONE: Record<ProjectMemberRole, "info" | "neutral" | "success"> = {
  owner: "info",
  editor: "success",
  member: "neutral",
  viewer: "neutral",
};

function rank(role: ProjectMemberRole): number {
  return ROLE_ORDER.indexOf(role);
}

function initialsFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

type Person = {
  email: string;
  role: ProjectMemberRole;
  status: "invited" | "active";
  projects: { id: string; name: string }[];
};

export default function TeamRolesSettingsPage() {
  const projects = useProjects();
  const { user } = useAuth();

  const people = useMemo<Person[]>(() => {
    const map = new Map<string, Person>();

    const add = (
      email: string,
      role: ProjectMemberRole,
      status: "invited" | "active",
      project: { id: string; name: string },
    ) => {
      const key = email.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        // Keep the highest-privilege role seen across projects.
        if (rank(role) < rank(existing.role)) existing.role = role;
        if (status === "active") existing.status = "active";
        if (!existing.projects.some((p) => p.id === project.id)) existing.projects.push(project);
      } else {
        map.set(key, { email, role, status, projects: [project] });
      }
    };

    for (const p of projects) {
      const project = { id: p.id, name: p.name };
      if (p.ownerEmail) add(p.ownerEmail, "owner", "active", project);
      for (const m of p.members ?? []) add(m.email, m.role, m.status, project);
    }

    return Array.from(map.values()).sort((a, b) => {
      const r = rank(a.role) - rank(b.role);
      return r !== 0 ? r : a.email.localeCompare(b.email);
    });
  }, [projects]);

  const counts = useMemo(() => {
    const c: Record<ProjectMemberRole, number> = { owner: 0, editor: 0, member: 0, viewer: 0 };
    for (const p of people) c[p.role] += 1;
    return c;
  }, [people]);

  return (
    <>
      <PageHeader
        eyebrow="Settings · Workspace"
        title="Team & roles"
        subtitle="Everyone with access across your projects, and what each role can do. Invites are managed inside each project's Team tab."
        back={{ href: "/settings", label: "Settings" }}
      />

      <div className="app-container py-6 md:py-8 space-y-10">
        {/* ── Roles reference ── */}
        <section>
          <div className="mb-4">
            <h2 className="text-[18px] font-semibold tracking-tight text-foreground">Roles</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Permissions are assigned per project when you invite someone.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {ROLE_ORDER.map((role, i) => {
              const meta = ROLE_META[role];
              const Icon = meta.icon;
              return (
                <MotionReveal key={role} delay={Math.min(i * 0.04, 0.18)}>
                  <div className="h-full rounded-2xl border border-border bg-card p-5 shadow-xs">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-muted border border-border">
                        <Icon size={15} className="text-foreground" />
                      </span>
                      <Badge variant={ROLE_TONE[role]} size="sm">
                        {counts[role]} {counts[role] === 1 ? "person" : "people"}
                      </Badge>
                    </div>
                    <h3 className="text-[15px] font-semibold tracking-tight text-foreground">{meta.label}</h3>
                    <p className="mt-1 text-[12.5px] text-muted-foreground leading-relaxed">{meta.blurb}</p>
                    <ul className="mt-3 space-y-1.5">
                      {meta.can.map((c) => (
                        <li key={c} className="flex items-start gap-1.5 text-[12px] text-foreground/80">
                          <Check size={12} className="mt-0.5 shrink-0 text-[var(--brand-primary-600)]" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </MotionReveal>
              );
            })}
          </div>
        </section>

        {/* ── People ── */}
        <section>
          <div className="mb-4 flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-[18px] font-semibold tracking-tight text-foreground">
                People
                <span className="ml-2 text-[13px] font-normal text-muted-foreground">{people.length}</span>
              </h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Aggregated across every project. To change a role or remove someone, open the
                project&apos;s Team tab.
              </p>
            </div>
            <Link
              href="/projects"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border bg-card text-[13px] font-medium text-foreground hover:bg-muted/60 transition-colors"
            >
              Manage in projects
              <ArrowRight size={13} />
            </Link>
          </div>

          {people.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 shadow-xs flex flex-col items-center text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
                <Users size={22} strokeWidth={1.5} />
              </span>
              <p className="text-[13.5px] font-semibold text-foreground mb-1">No teammates yet</p>
              <p className="text-[12.5px] text-muted-foreground max-w-sm">
                Open a project and use its Team tab to invite colleagues. They&apos;ll appear here with
                their role across the workspace.
              </p>
              <Link
                href="/projects"
                className="mt-5 inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-[13px] font-semibold transition-colors"
              >
                Go to projects
                <ArrowRight size={13} />
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs divide-y divide-border">
              {people.map((p) => {
                const meta = ROLE_META[p.role];
                const RoleIcon = meta.icon;
                const isYou = !!user?.email && user.email.toLowerCase() === p.email.toLowerCase();
                return (
                  <div
                    key={p.email}
                    className="flex items-center gap-4 px-4 sm:px-5 py-3.5 hover:bg-muted/40 transition-colors"
                  >
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground text-[12px] font-semibold">
                      {initialsFromEmail(p.email)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13.5px] font-semibold text-foreground truncate">
                          {p.email}
                        </span>
                        {isYou && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--brand-primary-700)] bg-[var(--brand-primary-50)] px-1.5 py-0.5 rounded">
                            you
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11.5px] text-muted-foreground truncate">
                        {p.projects.length === 1
                          ? p.projects[0].name
                          : `${p.projects.length} projects`}
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                      {p.status === "active" ? (
                        <>
                          <Check size={13} className="text-[var(--success)]" />
                          Active
                        </>
                      ) : (
                        <>
                          <Clock size={13} />
                          Invited
                        </>
                      )}
                    </div>

                    <Badge variant={ROLE_TONE[p.role]} size="sm" className="shrink-0">
                      <RoleIcon size={11} className="mr-1" />
                      {meta.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
