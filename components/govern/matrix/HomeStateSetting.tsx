"use client";

// Your organization's home state. The governing-law check compares an
// agreement's stated law with it; with none set, a stated law goes to
// "Check by hand". Changing it saves a new matrix version, like any edit.

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "@/components/ui/icons";
import { US_STATES } from "@/lib/govern/labels";
import { useSaveMatrix } from "@/lib/govern/queries";
import type { Matrix } from "@/lib/govern/types";

/** Stands in for "no home state" (a select item cannot use an empty value). */
const NOT_SET = "__not_set";

export function HomeStateSetting({ matrix, canEdit, blocked }: {
  matrix: Matrix;
  canEdit: boolean;
  /** Unsaved clause edits: save or discard them first. */
  blocked: boolean;
}) {
  const id = useId();
  const save = useSaveMatrix();
  const [value, setValue] = useState(matrix.homeState ?? "");

  function change(next: string) {
    setValue(next);
    save.mutate(
      {
        playbooks: matrix.playbooks,
        note: next ? `Home state set to ${next}` : "Home state cleared",
        homeState: next || null,
      },
      {
        onSuccess: (m) => toast.success(`Saved as version ${m.version}`, {
          description: next ? `Governing law is now checked against ${next}.` : "Governing law now goes to a reviewer.",
        }),
        onError: (e) => {
          setValue(matrix.homeState ?? "");
          toast.error("The home state was not saved", { description: e instanceof Error ? e.message : undefined });
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <label htmlFor={id} className="text-base font-semibold text-foreground">Home state</label>
        <p className="mt-1 max-w-[52ch] text-sm text-[var(--ink-600)]">
          Governing-law clauses are checked against it. With none set, a stated law goes to a reviewer.
        </p>
      </div>
      <div className="flex items-center gap-2">
        {save.isPending && <Loader2 size={16} className="animate-spin text-[var(--ink-500)]" aria-hidden />}
        <Select
          value={value || NOT_SET}
          onValueChange={(v) => change(v === NOT_SET ? "" : v)}
          disabled={!canEdit || blocked || save.isPending}
        >
          <SelectTrigger id={id} className="w-56" title={blocked ? "Save or discard your clause changes first" : undefined}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NOT_SET}>Not set</SelectItem>
            {US_STATES.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
