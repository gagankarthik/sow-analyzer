import { Check, Minus } from "lucide-react";
import {
  GOVERN_PERMISSIONS, GOVERN_ROLE_LABEL, GOVERN_ROLE_SUMMARY, WORKSPACE_PERMISSIONS, WORKSPACE_ROLE_LABEL,
  type Allowed, type WorkspaceRole,
} from "@/lib/govern/permissions";
import type { GovernRole } from "@/lib/govern/types";

/* Roles and permissions, as the backend enforces them: what each Govern role
   can do, then what each workspace role adds. Read-only reference, so an
   admin can explain to anyone why they can or cannot do something. */

const GOVERN_ROLES: GovernRole[] = ["admin", "reviewer", "leader"];
const WORKSPACE_ROLES: WorkspaceRole[] = ["owner", "editor", "viewer"];

function Mark({ value }: { value: Allowed }) {
  if (value === "own") return <span className="text-xs font-medium text-[var(--ink-700)]">Where editor</span>;
  return value
    ? <><Check size={16} aria-hidden className="mx-auto text-[var(--success)]" /><span className="sr-only">Yes</span></>
    : <><Minus size={16} aria-hidden className="mx-auto text-[var(--ink-300)]" /><span className="sr-only">No</span></>;
}

export function RolesMatrix() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <ul className="grid gap-3 sm:grid-cols-3">
          {GOVERN_ROLES.map((r) => (
            <li key={r} className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">{GOVERN_ROLE_LABEL[r]}</p>
              <p className="mt-1 text-sm text-[var(--ink-600)]">{GOVERN_ROLE_SUMMARY[r]}</p>
            </li>
          ))}
        </ul>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[36rem] text-sm">
            <caption className="sr-only">What each Govern role can do</caption>
            <thead className="bg-[var(--ink-50)] text-left">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-semibold text-foreground">Permission</th>
                {GOVERN_ROLES.map((r) => <th key={r} scope="col" className="w-28 px-4 py-2.5 text-center font-semibold text-foreground">{GOVERN_ROLE_LABEL[r]}</th>)}
              </tr>
            </thead>
            <tbody>
              {GOVERN_PERMISSIONS.map((p) => (
                <tr key={p.label} className="border-t border-border">
                  <th scope="row" className="px-4 py-3 text-left font-normal">
                    <span className="block font-medium text-foreground">{p.label}</span>
                    <span className="block text-xs text-[var(--ink-600)]">{p.detail}</span>
                  </th>
                  {GOVERN_ROLES.map((r) => <td key={r} className="px-4 py-3 text-center"><Mark value={p.roles[r]} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground">Workspace roles</h3>
        <p className="mt-1 max-w-[60ch] text-sm text-[var(--ink-600)]">
          Inside each workspace, members are owners, editors or viewers. A reviewer can act on a contract only where
          they are an owner or editor.
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[32rem] text-sm">
            <caption className="sr-only">What each workspace role can do</caption>
            <thead className="bg-[var(--ink-50)] text-left">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-semibold text-foreground">Permission</th>
                {WORKSPACE_ROLES.map((r) => <th key={r} scope="col" className="w-24 px-4 py-2.5 text-center font-semibold text-foreground">{WORKSPACE_ROLE_LABEL[r]}</th>)}
              </tr>
            </thead>
            <tbody>
              {WORKSPACE_PERMISSIONS.map((p) => (
                <tr key={p.label} className="border-t border-border">
                  <th scope="row" className="px-4 py-3 text-left font-medium text-foreground">{p.label}</th>
                  {WORKSPACE_ROLES.map((r) => <td key={r} className="px-4 py-3 text-center"><Mark value={p.roles[r]} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
