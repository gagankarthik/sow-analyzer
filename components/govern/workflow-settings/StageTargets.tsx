"use client";

// Days a contract may sit in each stage before its card turns amber, and the
// multiple after which it turns red. Each row draws its own little timeline so
// the admin sees what a number means before saving it.

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { SettingsSection } from "@/components/settings/SettingsNav";
import { ErrorText } from "@/components/govern/admin/shared";
import { PRE_SIGNATURE_STAGES, STAGES, STAGE_LABEL, plural } from "@/lib/govern/labels";
import type { Stage } from "@/lib/govern/types";
import { multipleError, stageTargetError, type SettingsDraft } from "./draft";

const AFTER_SIGNATURE = STAGES.filter((s) => !PRE_SIGNATURE_STAGES.includes(s));

function parseDays(text: string): number | null {
  if (text.trim() === "") return null;
  const n = Number(text);
  return Number.isNaN(n) ? NaN : n;
}

export function StageTargets({
  draft, onChange, readOnly,
}: {
  draft: SettingsDraft;
  onChange: (next: SettingsDraft) => void;
  readOnly: boolean;
}) {
  const uid = useId();
  const multiple = draft.redAfterMultiple;
  const setTarget = (stage: Stage, value: number | null) =>
    onChange({ ...draft, stageTargetDays: { ...draft.stageTargetDays, [stage]: value } });
  const mErr = multipleError(multiple);

  return (
    <SettingsSection
      id="targets"
      title="Stage targets"
      description="How many days a contract may sit in a stage. Past the target its card turns amber; past the target times the multiple below, red."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-8">
        <div className="min-w-0 space-y-6">
          <StageGroup title="Before signature" stages={PRE_SIGNATURE_STAGES} draft={draft} multiple={multiple} readOnly={readOnly} onSet={setTarget} uid={uid} />
          <StageGroup title="After signature" stages={AFTER_SIGNATURE} draft={draft} multiple={multiple} readOnly={readOnly} onSet={setTarget} uid={uid} />
        </div>

        <aside className="rounded-lg border border-border bg-[var(--panel)] p-4 lg:self-start">
          <label htmlFor={`${uid}-mult`} className="text-sm font-medium text-foreground">Red after</label>
          <div className="mt-1.5 flex items-center gap-2">
            <Input
              id={`${uid}-mult`}
              type="number"
              inputMode="decimal"
              min={1.1}
              max={10}
              step={0.5}
              value={Number.isFinite(multiple) ? multiple : ""}
              disabled={readOnly}
              aria-invalid={!!mErr}
              onChange={(e) => onChange({ ...draft, redAfterMultiple: e.target.value === "" ? NaN : Number(e.target.value) })}
              className="w-20 tabular-nums"
            />
            <span className="text-sm text-[var(--ink-600)]">× the target</span>
          </div>
          {mErr && <div className="mt-1.5"><ErrorText>{mErr}</ErrorText></div>}
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            With 2, a 5-day target is amber from day 6 and red from day 11. Leave a stage blank for no target: its cards never change colour.
          </p>
        </aside>
      </div>
    </SettingsSection>
  );
}

function StageGroup({
  title, stages, draft, multiple, readOnly, onSet, uid,
}: {
  title: string;
  stages: Stage[];
  draft: SettingsDraft;
  multiple: number;
  readOnly: boolean;
  onSet: (stage: Stage, value: number | null) => void;
  uid: string;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-[var(--ink-600)]">{title}</h3>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {stages.map((stage) => {
          const value = draft.stageTargetDays[stage] ?? null;
          const err = stageTargetError(value);
          const id = `${uid}-${stage}`;
          return (
            <li key={stage} className="grid grid-cols-1 gap-3 px-3 py-3 sm:grid-cols-[minmax(0,180px)_96px_minmax(0,1fr)] sm:items-center sm:gap-4 sm:px-4">
              <label htmlFor={id} className="text-base font-medium text-foreground">{STAGE_LABEL[stage]}</label>
              <div className="flex items-center gap-2">
                <Input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={365}
                  step={1}
                  placeholder="None"
                  value={value === null || Number.isNaN(value) ? "" : value}
                  disabled={readOnly}
                  aria-invalid={!!err}
                  aria-describedby={`${id}-bar`}
                  onChange={(e) => onSet(stage, parseDays(e.target.value))}
                  className="w-20 tabular-nums"
                />
                <span className="text-sm text-[var(--ink-600)] sm:hidden">days</span>
              </div>
              <div className="min-w-0">
                <TargetBar id={`${id}-bar`} target={err ? null : value} multiple={Number.isFinite(multiple) && multiple > 1 ? multiple : null} />
                {err && <div className="mt-1"><ErrorText>{err}</ErrorText></div>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const W = 240;

/** On time → amber → red, drawn to scale with the day each colour starts. */
function TargetBar({ id, target, multiple }: { id: string; target: number | null; multiple: number | null }) {
  if (target === null) {
    return <p id={id} className="text-sm text-muted-foreground">No target: cards in this stage stay neutral.</p>;
  }
  const red = multiple ? Math.ceil(target * multiple) : null;
  const span = (red ?? target) * 1.35;
  const x1 = Math.round((target / span) * W);
  const x2 = red ? Math.round((red / span) * W) : W;
  const text = red
    ? `On time for ${plural(target, "day")}, running late from day ${target + 1}, overdue from day ${red + 1}.`
    : `On time for ${plural(target, "day")}, running late after that.`;
  return (
    <div id={id} className="min-w-0">
      <svg viewBox={`0 0 ${W} 10`} className="h-2.5 w-full max-w-[320px]" role="img" aria-label={text} preserveAspectRatio="none">
        <rect x={0} y={0} width={x1} height={10} rx={2} className="fill-[var(--success)]" />
        <rect x={x1 + 1} y={0} width={Math.max(0, x2 - x1 - 1)} height={10} className="fill-[var(--warning)]" />
        {red && <rect x={x2 + 1} y={0} width={Math.max(0, W - x2 - 1)} height={10} rx={2} className="fill-[var(--danger)]" />}
      </svg>
      <p className="mt-1 text-xs leading-snug text-[var(--ink-600)]">{text}</p>
    </div>
  );
}
