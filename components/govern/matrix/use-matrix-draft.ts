"use client";

// Staged edits to the review matrix. Edits live here until the admin saves
// them as a new version; the saved matrix underneath can refresh without
// losing them. `changes` tells each clause card whether it is new or edited.

import { useCallback, useMemo, useState } from "react";
import { AGREEMENT_TYPE_LABEL } from "@/lib/govern/labels";
import type { AgreementType, MatrixClause, MatrixPlaybook } from "@/lib/govern/types";
import type { ClauseChange } from "./ClauseCard";

export type Playbooks = Partial<Record<AgreementType, MatrixPlaybook>>;

const sameClause = (a: MatrixClause, b: MatrixClause) => JSON.stringify(a) === JSON.stringify(b);

export interface MatrixDiff {
  added: number;
  edited: number;
  removed: number;
  total: number;
}

export function useMatrixDraft(saved: Playbooks | undefined) {
  const [draft, setDraft] = useState<Playbooks | null>(null);
  const playbooks = draft ?? saved ?? {};

  const upsertClause = useCallback((type: AgreementType, clause: MatrixClause, replacing: string | null) => {
    setDraft((prev) => {
      const base = prev ?? saved ?? {};
      const book = base[type] ?? { agreementType: type, label: AGREEMENT_TYPE_LABEL[type], clauses: [] };
      const key = replacing ?? clause.clauseType;
      const exists = book.clauses.some((c) => c.clauseType === key);
      const clauses = exists ? book.clauses.map((c) => (c.clauseType === key ? clause : c)) : [...book.clauses, clause];
      return { ...base, [type]: { ...book, clauses } };
    });
  }, [saved]);

  const removeClause = useCallback((type: AgreementType, clauseType: string) => {
    setDraft((prev) => {
      const base = prev ?? saved ?? {};
      const book = base[type];
      if (!book) return base;
      return { ...base, [type]: { ...book, clauses: book.clauses.filter((c) => c.clauseType !== clauseType) } };
    });
  }, [saved]);

  const discard = useCallback(() => setDraft(null), []);

  const { diff, changes, dirtyTypes } = useMemo(() => {
    const out: MatrixDiff = { added: 0, edited: 0, removed: 0, total: 0 };
    const marks = new Map<string, ClauseChange>();
    const touched = new Set<AgreementType>();
    if (!draft) return { diff: out, changes: marks, dirtyTypes: touched };
    const types = new Set([...Object.keys(saved ?? {}), ...Object.keys(draft)]) as Set<AgreementType>;
    for (const t of types) {
      const totalBefore = out.added + out.edited + out.removed;
      const before = new Map((saved?.[t]?.clauses ?? []).map((c) => [c.clauseType, c]));
      const after = draft[t]?.clauses ?? [];
      for (const c of after) {
        const old = before.get(c.clauseType);
        if (!old) { out.added++; marks.set(`${t}:${c.clauseType}`, "added"); }
        else if (!sameClause(old, c)) { out.edited++; marks.set(`${t}:${c.clauseType}`, "edited"); }
        before.delete(c.clauseType);
      }
      out.removed += before.size;
      if (out.added + out.edited + out.removed > totalBefore) touched.add(t);
    }
    out.total = out.added + out.edited + out.removed;
    return { diff: out, changes: marks, dirtyTypes: touched };
  }, [draft, saved]);

  return {
    playbooks,
    isDirty: diff.total > 0,
    diff,
    dirtyTypes,
    changeOf: (type: AgreementType, clauseType: string) => changes.get(`${type}:${clauseType}`) ?? null,
    upsertClause,
    removeClause,
    discard,
  };
}

export function diffSummary(d: MatrixDiff): string {
  const parts: string[] = [];
  if (d.added) parts.push(`${d.added} added`);
  if (d.edited) parts.push(`${d.edited} edited`);
  if (d.removed) parts.push(`${d.removed} removed`);
  return `${d.total === 1 ? "1 clause change" : `${d.total} clause changes`} not saved yet (${parts.join(", ")})`;
}
