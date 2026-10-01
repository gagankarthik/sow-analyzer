"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Check, Loader2, Send } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { PERMISSION_DENIED, errorCode, errorStatus, isForbidden } from "@/lib/api";
import { inviteMember } from "@/lib/projects-store";
import {
  ASSIGNABLE_ROLES, EMAIL_PATTERN, ROLE_META, parseEmails, type AssignableRole,
} from "@/components/team/roles";

const MAX_EMAILS = 25;

type InviteProject = { id: string; name: string };

type Result = {
  email: string;
  projectName: string;
  /** invited = no account yet (still "invited" on the server). added = they
   *  already had an account, so they have access now and no email was sent. */
  outcome: "invited" | "added" | "failed";
  message: string;
};

// The reasons `POST /projects/{id}/invite` can refuse (see the API handler).
// Any address may be invited, whatever organisation it belongs to.
function failureMessage(err: unknown, projectName: string): string {
  const status = errorStatus(err);
  const message = err instanceof Error ? err.message : "";
  if (isForbidden(err)) return `${PERMISSION_DENIED} Only the owner of ${projectName} can invite people.`;
  if (status === 409 && errorCode(err) === "conflict") return message;
  if (status === 409) return `Already on ${projectName}.`;
  if (status === 400) return message || "The server did not accept this email address.";
  if (status === 404) return `${projectName} no longer exists, or is no longer shared with you.`;
  return message || "Could not send the invitation.";
}

const CHOICE_ROW =
  "flex min-h-10 cursor-pointer items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50";
const CHOICE_INPUT = "mt-1 h-4 w-4 shrink-0 accent-[var(--brand-primary-600)]";

/**
 * The one invite form: emails, projects (unless locked to one) and a role.
 * It sends one `POST /projects/{id}/invite` per email per project, because that
 * is the only invite call the API has, and reports each result inline. Any
 * email address can be invited; access is to the chosen projects only.
 */
export function InviteForm({
  projects,
  lockedProjectId,
  onCancel,
}: {
  /** Projects the signed-in user may invite to (the ones they own). */
  projects: InviteProject[];
  /** Hide the project picker and invite to this project only. */
  lockedProjectId?: string;
  onCancel?: () => void;
}) {
  const id = useId();
  const [raw, setRaw] = useState("");
  const [role, setRole] = useState<AssignableRole>("viewer");
  const [picked, setPicked] = useState<string[]>(() =>
    lockedProjectId ? [lockedProjectId] : projects.length === 1 ? [projects[0].id] : [],
  );
  const [emailError, setEmailError] = useState("");
  const [projectError, setProjectError] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [results, setResults] = useState<Result[]>([]);

  const sending = progress !== null;
  const targets = projects.filter((p) => picked.includes(p.id));

  function toggleProject(projectId: string) {
    setProjectError("");
    setPicked((cur) => (cur.includes(projectId) ? cur.filter((p) => p !== projectId) : [...cur, projectId]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const emails = parseEmails(raw);
    const invalid = emails.filter((email) => !EMAIL_PATTERN.test(email));
    const nextEmailError =
      emails.length === 0 ? "Enter at least one email address."
      : invalid.length > 0 ? `Not a valid email address: ${invalid.join(", ")}`
      : emails.length > MAX_EMAILS ? `Invite up to ${MAX_EMAILS} people at a time.`
      : "";
    const nextProjectError = targets.length === 0 ? "Choose at least one project." : "";
    setEmailError(nextEmailError);
    setProjectError(nextProjectError);
    if (nextEmailError || nextProjectError) return;

    const total = emails.length * targets.length;
    const collected: Result[] = [];
    setResults([]);
    setProgress({ done: 0, total });
    for (const email of emails) {
      for (const project of targets) {
        try {
          const { member, invitationEmailSent } = await inviteMember(project.id, email, role);
          const roleName = ROLE_META[member.role].label.toLowerCase();
          collected.push(
            member.status === "active"
              ? { email, projectName: project.name, outcome: "added", message: `Added as ${roleName}. They already have an account, so they have access now and no email was sent.` }
              : invitationEmailSent
                ? { email, projectName: project.name, outcome: "invited", message: `Invited as ${roleName}. An email with a temporary password was sent.` }
                : { email, projectName: project.name, outcome: "invited", message: `Invited as ${roleName}, but the invitation email could not be sent. They get access when they sign up with this address, so let them know.` },
          );
        } catch (err) {
          collected.push({ email, projectName: project.name, outcome: "failed", message: failureMessage(err, project.name) });
        }
        setProgress({ done: collected.length, total });
      }
    }
    setResults(collected);
    setProgress(null);
    // Keep only the addresses that still need attention, ready to correct.
    const failed = new Set(collected.filter((r) => r.outcome === "failed").map((r) => r.email));
    setRaw([...failed].join("\n"));
  }

  const sent = results.filter((r) => r.outcome !== "failed").length;
  const failedCount = results.length - sent;

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-w-0 flex-col gap-5">
      <div>
        <label htmlFor={`${id}-emails`} className="mb-1.5 block text-sm font-medium text-foreground">
          Email addresses
        </label>
        <Textarea
          id={`${id}-emails`}
          value={raw}
          onChange={(e) => { setRaw(e.target.value); setEmailError(""); }}
          placeholder={"name@company.com\nanother@company.com"}
          rows={3}
          autoComplete="off"
          spellCheck={false}
          disabled={sending}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={`${id}-emails-help`}
          className="min-h-20 bg-card px-3 text-base md:text-base"
        />
        <p
          id={`${id}-emails-help`}
          role={emailError ? "alert" : undefined}
          className={cn("mt-1.5 break-words text-sm", emailError ? "text-[var(--danger)]" : "text-muted-foreground")}
        >
          {emailError || "Separate several addresses with commas or new lines."}
        </p>
      </div>

      {!lockedProjectId && (
        <fieldset className="min-w-0">
          <legend className="mb-1.5 text-sm font-medium text-foreground">Projects</legend>
          <div
            className={cn(
              "max-h-44 overflow-y-auto rounded-lg border p-1",
              projectError ? "border-[var(--danger)]" : "border-border",
            )}
          >
            {projects.map((p) => (
              <label key={p.id} className={CHOICE_ROW}>
                <input
                  type="checkbox"
                  checked={picked.includes(p.id)}
                  onChange={() => toggleProject(p.id)}
                  disabled={sending}
                  className={CHOICE_INPUT}
                />
                <span className="min-w-0 break-words text-base text-foreground">{p.name}</span>
              </label>
            ))}
          </div>
          <p role={projectError ? "alert" : undefined} className={cn("mt-1.5 text-sm", projectError ? "text-[var(--danger)]" : "text-muted-foreground")}>
            {projectError || "Only projects you own are listed. Each invitation gives access to that project only."}
          </p>
        </fieldset>
      )}

      <fieldset className="min-w-0">
        <legend className="mb-1.5 text-sm font-medium text-foreground">Role</legend>
        <div className="rounded-lg border border-border p-1">
          {ASSIGNABLE_ROLES.map((r) => (
            <label key={r} className={CHOICE_ROW}>
              <input
                type="radio"
                name={`${id}-role`}
                value={r}
                checked={role === r}
                onChange={() => setRole(r)}
                disabled={sending}
                className={CHOICE_INPUT}
              />
              <span className="min-w-0">
                <span className="block text-base font-medium text-foreground">{ROLE_META[r].label}</span>
                <span className="block text-sm leading-snug text-[var(--ink-600)]">{ROLE_META[r].summary}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {results.length > 0 && (
        <div aria-live="polite" className="rounded-lg border border-border bg-[var(--panel)] p-3">
          <p className="text-sm font-semibold text-foreground">
            {sent} of {results.length} {results.length === 1 ? "invitation" : "invitations"} went through
            {failedCount > 0 && <span className="font-medium text-[var(--danger)]"> · {failedCount} need attention</span>}
          </p>
          <ul className="mt-2 space-y-2">
            {results.map((r) => (
              <li key={`${r.email}|${r.projectName}`} className="flex items-start gap-2 text-sm">
                {r.outcome === "failed" ? (
                  <AlertCircle size={14} className="mt-0.5 shrink-0 text-[var(--danger)]" />
                ) : (
                  <Check size={14} className="mt-0.5 shrink-0 text-[var(--success)]" />
                )}
                <span className="min-w-0">
                  <span className="block break-all font-medium text-foreground">
                    {r.email}
                    {!lockedProjectId && <span className="font-normal text-muted-foreground"> · {r.projectName}</span>}
                  </span>
                  <span className={cn("block", r.outcome === "failed" ? "text-[var(--danger)]" : "text-[var(--ink-600)]")}>
                    {r.message}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="outline" size="lg" onClick={onCancel}>
            {results.length > 0 && !sending ? "Done" : "Cancel"}
          </Button>
        )}
        <Button type="submit" size="lg" disabled={sending}>
          {sending ? (
            <><Loader2 size={14} className="animate-spin" />Sending {progress.done} of {progress.total}</>
          ) : (
            <><Send size={14} />{results.length > 0 ? "Send more" : "Send invitations"}</>
          )}
        </Button>
      </div>
    </form>
  );
}
