"use client";

// Save the current filters, columns, grouping, sort and density as a named
// view, or rename an existing one and change who sees it. Errors show next to
// the field that caused them, on submit.

import * as React from "react";
import { toast } from "sonner";
import { ActionDialog, Field } from "@/components/govern/actions/ActionDialog";
import { Input } from "@/components/ui/input";
import { Lock, UserCheck, Users } from "@/components/ui/icons";
import { useCreateView, useUpdateView } from "@/lib/govern/queries";
import { VIEW_LIMITS, type SavedView, type ViewConfig, type ViewVisibility } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { PeoplePicker } from "./PeoplePicker";

export type SaveViewMode = { kind: "create"; config: ViewConfig; suggestedName?: string } | { kind: "edit"; view: SavedView };

const OPTIONS: { id: ViewVisibility; label: string; hint: string; icon: typeof Lock }[] = [
  { id: "private", label: "Just me", hint: "Only you see this view.", icon: Lock },
  { id: "everyone", label: "Everyone", hint: "Everyone in your organization sees it under Shared views.", icon: Users },
  { id: "specific", label: "Specific people", hint: "Only the people you pick, and you.", icon: UserCheck },
];

type Errors = { name?: string; people?: string };

export function validateView(name: string, visibility: ViewVisibility, people: string[]): Errors {
  const errors: Errors = {};
  const n = name.trim();
  if (!n) errors.name = "Give the view a name.";
  else if (n.length > VIEW_LIMITS.name) errors.name = `Keep the name to ${VIEW_LIMITS.name} characters (it is ${n.length}).`;
  if (visibility === "specific" && people.length === 0) errors.people = "Pick at least one person, or choose Just me.";
  if (people.length > VIEW_LIMITS.sharedWith) errors.people = `Share with up to ${VIEW_LIMITS.sharedWith} people.`;
  return errors;
}

export function SaveViewDialog({ mode, onOpenChange, onSaved }: {
  /** null = closed. */
  mode: SaveViewMode | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (view: SavedView) => void;
}) {
  // The form mounts per view, so its fields start from that view.
  if (!mode) return null;
  return <SaveViewForm key={mode.kind === "edit" ? mode.view.id : "new"} mode={mode} onOpenChange={onOpenChange} onSaved={onSaved} />;
}

function SaveViewForm({ mode, onOpenChange, onSaved }: { mode: SaveViewMode; onOpenChange: (o: boolean) => void; onSaved: (v: SavedView) => void }) {
  const editing = mode.kind === "edit" ? mode.view : null;
  const [name, setName] = React.useState(editing?.name ?? (mode.kind === "create" ? mode.suggestedName ?? "" : ""));
  const [visibility, setVisibility] = React.useState<ViewVisibility>(editing?.visibility ?? "private");
  const [people, setPeople] = React.useState<string[]>(editing?.sharedWith.map((e) => e.toLowerCase()) ?? []);
  const [errors, setErrors] = React.useState<Errors>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const create = useCreateView("contracts");
  const update = useUpdateView("contracts");
  const pending = create.isPending || update.isPending;
  const nameRef = React.useRef<HTMLInputElement>(null);
  const ids = React.useId();

  const submit = async () => {
    const found = validateView(name, visibility, people);
    setErrors(found);
    setServerError(null);
    if (found.name) return nameRef.current?.focus();
    if (found.people) return document.getElementById(`${ids}-people`)?.focus();
    const sharedWith = visibility === "specific" ? people : [];
    try {
      const view = editing
        ? await update.mutateAsync({ id: editing.id, patch: { name: name.trim(), visibility, sharedWith } })
        : await create.mutateAsync({ name: name.trim(), visibility, sharedWith, config: (mode as Extract<SaveViewMode, { kind: "create" }>).config });
      toast.success(editing ? `“${view.name}” updated` : `View “${view.name}” saved`);
      onSaved(view);
      onOpenChange(false);
    } catch (e) {
      setServerError(e instanceof Error ? `${e.message} Your settings are still here; try again.` : "The view could not be saved. Try again.");
    }
  };

  return (
    <ActionDialog
      open
      onOpenChange={onOpenChange}
      title={editing ? "Rename or change visibility" : "Save view as"}
      description={editing ? undefined : "Keeps the current filters, columns and their order, grouping, sort and row density."}
      confirmLabel={editing ? "Save changes" : "Save view"}
      onConfirm={() => void submit()}
      pending={pending}
    >
      <Field label="Name" htmlFor={`${ids}-name`} error={errors.name}>
        <Input
          ref={nameRef}
          id={`${ids}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={VIEW_LIMITS.name + 20}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? `${ids}-name-error` : undefined}
          placeholder="e.g. Licenses over $500k"
          autoFocus
        />
      </Field>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-semibold text-foreground">Who can see it</legend>
        {OPTIONS.map((o) => {
          const Icon = o.icon;
          const on = visibility === o.id;
          return (
            <label
              key={o.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus",
                on ? "border-[var(--brand-primary-300)] bg-surface-selected" : "border-border-default hover:bg-surface-hover",
              )}
            >
              <input
                type="radio"
                name={`${ids}-visibility`}
                value={o.id}
                checked={on}
                onChange={() => setVisibility(o.id)}
                className="mt-0.5 size-4 shrink-0 accent-[var(--brand-primary-600)]"
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--ink-900)]">
                  <Icon size={12} aria-hidden className="text-[var(--ink-600)]" />
                  {o.label}
                </span>
                <span className="text-[12px] text-[var(--ink-600)]">{o.hint}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      {visibility === "specific" && (
        <Field label="People" htmlFor={`${ids}-people`} error={errors.people}>
          <PeoplePicker
            id={`${ids}-people`}
            label="People to share with"
            multiple
            selected={people}
            onChange={(emails) => setPeople(emails)}
            invalid={!!errors.people}
            describedBy={errors.people ? `${ids}-people-error` : undefined}
            max={VIEW_LIMITS.sharedWith}
          />
        </Field>
      )}

      {serverError && <p role="alert" className="text-[12px] leading-relaxed text-[var(--danger)]">{serverError}</p>}
    </ActionDialog>
  );
}
