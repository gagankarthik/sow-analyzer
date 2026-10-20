"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Check } from "@/components/ui/icons";
import { PersonDot } from "@/components/govern/primitives";
import { AGREEMENT_TYPE_LABEL, OFFICE_LABEL, personName } from "@/lib/govern/labels";
import { useGovernMe, useGovernPeople, useWorkflowSettings } from "@/lib/govern/queries";
import { projectMembers, useProjects } from "@/lib/projects-store";
import type { Contract, Person } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { ActionDialog, Field } from "./ActionDialog";
import { useRunContractAction } from "./useRunAction";
import { SkeletonLine, SkeletonRegion } from "@/components/ds/skeletons";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Option = { email: string; name: string | null; note: string };

/** You, everyone who shares a project with you, then everyone the workspace
 *  already knows (owners of other contracts): people to assign when no
 *  reviewers are set up, so nobody has to type an email address. */
function useTeamOptions(exclude: Set<string>): Option[] {
  const me = useGovernMe().data;
  const projects = useProjects();
  const people = useGovernPeople().data;
  return useMemo(() => {
    const out = new Map<string, Option>();
    const myEmail = me?.email?.toLowerCase();
    if (myEmail && !exclude.has(myEmail)) out.set(myEmail, { email: myEmail, name: me?.name ?? null, note: "You" });
    for (const p of projects) {
      for (const m of projectMembers(p)) {
        const email = m.email.toLowerCase();
        if (exclude.has(email) || out.has(email)) continue;
        out.set(email, { email, name: null, note: m.status === "invited" ? `Invited to ${p.name}` : `On ${p.name}` });
      }
    }
    for (const person of people ?? []) {
      const email = person.email.toLowerCase();
      const known = out.get(email);
      if (known) {
        if (!known.name && person.name) out.set(email, { ...known, name: person.name });
        continue;
      }
      if (exclude.has(email)) continue;
      out.set(email, { email, name: person.name, note: person.sources.includes("owner") ? "Owns other contracts" : "In your workspace" });
    }
    return [...out.values()];
  }, [me, projects, people, exclude]);
}

export function AssignDialog({ contract, open, onOpenChange }: { contract: Contract; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { run, pending } = useRunContractAction();
  const settings = useWorkflowSettings();
  const [picked, setPicked] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  // The typed email is checked once the field is left, not on every keystroke.
  const [emailBlurred, setEmailBlurred] = useState(false);

  // Reviewers who handle this agreement type first.
  const reviewers = [...(settings.data?.reviewers ?? [])].sort((a, b) => {
    const fit = (r: typeof a) => (r.agreementTypes.includes(contract.agreementType) ? 0 : 1);
    return fit(a) - fit(b) || a.name.localeCompare(b.name);
  });

  const reviewerEmails = useMemo(() => new Set(reviewers.map((r) => r.email.toLowerCase())), [reviewers]);
  const team = useTeamOptions(reviewerEmails);

  const typed = email.trim();
  const pickedOption = picked
    ? reviewers.find((x) => x.email === picked) ?? team.find((x) => x.email === picked) ?? null
    : null;
  const owner: Person | null = pickedOption
    ? { email: pickedOption.email, name: pickedOption.name }
    : EMAIL.test(typed) ? { email: typed, name: name.trim() || null } : null;
  const emailError = emailBlurred && typed && !EMAIL.test(typed) ? "Enter a full email, e.g. name@example.org" : undefined;

  function pick(value: string) {
    setPicked(picked === value ? null : value);
    setEmail("");
    setName("");
  }

  async function confirm() {
    if (!owner) return;
    const ok = await run(
      contract.contractId,
      { action: "assign", owner },
      { what: "assign this contract", success: `Assigned to ${personName(owner)}`, description: contract.title },
    );
    if (ok) onOpenChange(false);
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={contract.owner ? "Reassign reviewer" : "Assign a reviewer"}
      description={contract.owner ? <>Currently with <strong className="font-semibold text-foreground">{personName(contract.owner)}</strong>. The new reviewer becomes the owner and the card waits on them.</> : "The reviewer becomes the owner and the card waits on them."}
      confirmLabel={owner ? `Assign to ${personName(owner)}` : "Assign"}
      onConfirm={confirm}
      pending={pending}
      disabled={!owner || owner.email === contract.owner?.email}
    >
      {settings.isLoading ? (
        <SkeletonRegion label="reviewers" className="flex flex-col gap-1.5">
          <SkeletonLine text="text-sm font-semibold" width="w-20" className="mb-1.5" />
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} aria-hidden className="flex min-h-12 items-center gap-3 rounded-lg border border-border px-3 py-2">
              <Skeleton className="size-4 shrink-0 rounded-full" />
              <span className="flex min-w-0 flex-1 flex-col">
                <SkeletonLine text="text-sm font-medium" width={i % 2 ? "w-32" : "w-40"} />
                <SkeletonLine text="text-xs" width="w-48" />
              </span>
            </div>
          ))}
        </SkeletonRegion>
      ) : reviewers.length > 0 ? (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-semibold text-foreground">Reviewers</legend>
          {reviewers.map((r) => {
            const fits = r.agreementTypes.includes(contract.agreementType);
            const note = (fits ? `Handles ${AGREEMENT_TYPE_LABEL[contract.agreementType].toLowerCase()} agreements` : r.email)
              + (r.offices.length > 0 ? ` · ${r.offices.map((o) => OFFICE_LABEL[o]).join(", ")}` : "");
            return (
              <PersonOption key={r.email} option={{ email: r.email, name: r.name, note }} on={picked === r.email}
                current={contract.owner?.email === r.email} onPick={pick} />
            );
          })}
        </fieldset>
      ) : (
        <p className="text-sm text-[var(--ink-600)]">
          {settings.isError ? "Couldn't load the reviewer list." : "No reviewers are set up yet."}{" "}
          {team.length > 0 ? "Pick someone from your team, or type an email below." : <>Type the person&rsquo;s email below.</>}
        </p>
      )}

      {team.length > 0 && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-semibold text-foreground">{reviewers.length > 0 ? "Others on your team" : "Your team"}</legend>
          {team.map((o) => (
            <PersonOption key={o.email} option={o} on={picked === o.email} current={contract.owner?.email === o.email} onPick={pick} />
          ))}
        </fieldset>
      )}

      <div className="grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2">
        <Field label="Or type an email" htmlFor="assign-email" error={emailError}>
          <Input id="assign-email" type="email" inputMode="email" autoComplete="off" placeholder="name@example.org" value={email}
            onChange={(e) => { setEmail(e.target.value); setPicked(null); }} onBlur={() => setEmailBlurred(true)}
            aria-invalid={emailError ? true : undefined} aria-describedby={emailError ? "assign-email-error" : undefined} />
        </Field>
        <Field label="Their name (optional)" htmlFor="assign-name">
          <Input id="assign-name" autoComplete="off" placeholder="e.g. Jordan Lee" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
      </div>
    </ActionDialog>
  );
}

function PersonOption({ option, on, current, onPick }: {
  option: Option; on: boolean; current: boolean; onPick: (email: string) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => onPick(option.email)}
      className={cn(
        "flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]",
        on ? "border-[var(--brand-primary-500)] bg-[var(--brand-primary-50)]" : "border-border bg-card hover:border-[var(--ink-300)]",
      )}
    >
      <PersonDot name={option.name ?? option.email} email={option.email} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">
          {option.name || option.email}{current && <span className="font-normal text-[var(--ink-600)]"> · current owner</span>}
        </span>
        <span className="block truncate text-xs text-[var(--ink-600)]">{option.name ? `${option.note} · ${option.email}` : option.note}</span>
      </span>
      {on && <Check size={16} className="shrink-0 text-[var(--brand-primary-600)]" />}
    </button>
  );
}
