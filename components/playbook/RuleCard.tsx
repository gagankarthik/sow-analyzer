// One playbook rule: the standard position first, then why it is held, the
// fallback, the numbers it checks and whether anything is checked automatically.

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Eye, Loader2, Pencil } from "@/components/ui/icons";
import { categoryLabel } from "@/lib/clause-categories";
import { SEVERITY_LABEL, SOURCE_LABEL, formatThreshold, thresholdMeta, type PlaybookRule } from "@/lib/playbook";

export function RuleCard({
  rule,
  reverting,
  onEdit,
  onRevert,
}: {
  rule: PlaybookRule;
  /** A revert of this rule is on its way to the API. */
  reverting: boolean;
  onEdit: () => void;
  onRevert: () => void;
}) {
  const thresholds = Object.entries(rule.thresholds);
  const typeName = rule.isCustomType ? rule.clauseType : categoryLabel(rule.clauseType);
  const hasPhrases = rule.requiredPhrases.length + rule.forbiddenPhrases.length > 0;

  return (
    <article id={`rule-${rule.ruleId}`} aria-busy={reverting} className="scroll-mt-24 px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <h3 className="text-base font-semibold text-foreground [overflow-wrap:anywhere]">{rule.label}</h3>
            <Badge variant={rule.source === "custom" ? "info" : "neutral"} size="md">{SOURCE_LABEL[rule.source]}</Badge>
            {rule.isCustomType && <Badge variant="neutral" size="md">Custom clause type</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Clause type: <span className={rule.isCustomType ? "font-mono" : undefined}>{typeName}</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" size="lg" className="md:h-9" onClick={onEdit} disabled={reverting} aria-label={`Edit rule: ${rule.label}`}>
            <Pencil size={14} />Edit
          </Button>
          {rule.source === "custom" && (
            <Button variant="ghost" size="lg" className="md:h-9" onClick={onRevert} disabled={reverting} aria-label={`${rule.hasBuiltInDefault ? "Revert to default" : "Remove rule"}: ${rule.label}`}>
              {reverting
                ? <><Loader2 size={13} className="animate-spin motion-reduce:animate-none" />{rule.hasBuiltInDefault ? "Reverting…" : "Removing…"}</>
                : rule.hasBuiltInDefault ? "Revert to default" : "Remove rule"}
            </Button>
          )}
        </div>
      </div>

      <p className="mt-3 max-w-[72ch] text-base leading-relaxed text-foreground [overflow-wrap:anywhere]">
        {rule.standard || <span className="text-[var(--ink-600)]">No standard position is written for this rule.</span>}
      </p>

      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 text-sm md:grid-cols-12">
        <Item label="Rationale" className="md:col-span-7">{rule.rationale ?? <Unset>None given</Unset>}</Item>
        <Item label="Thresholds" className="md:col-span-5">
          {thresholds.length === 0 ? <Unset>None for this clause type</Unset> : (
            <ul className="space-y-0.5">
              {thresholds.map(([key, value]) => (
                <li key={key}>{thresholdMeta(key).label}: <span className="font-semibold tabular-nums">{formatThreshold(key, value)}</span></li>
              ))}
            </ul>
          )}
        </Item>
        <Item label="Acceptable fallback" className="md:col-span-7">{rule.fallback ?? <Unset>None set</Unset>}</Item>
        <Item label="Automatic check" className="md:col-span-5">
          {rule.hasAutomaticCheck ? (
            <span className="inline-flex items-start gap-1.5"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[var(--success)]" />Yes. Clauses of this type are graded automatically.</span>
          ) : (
            <span className="inline-flex items-start gap-1.5"><Eye size={14} className="mt-0.5 shrink-0 text-[var(--info)]" />No. Clauses of this type are flagged for you to compare.</span>
          )}
        </Item>
        {hasPhrases && (
          <Item label={`Wording checks (${SEVERITY_LABEL[rule.phraseSeverity].toLowerCase()} if failed)`} className="md:col-span-12">
            <div className="flex flex-col gap-1.5">
              {rule.requiredPhrases.length > 0 && <Phrases title="Must contain" phrases={rule.requiredPhrases} />}
              {rule.forbiddenPhrases.length > 0 && <Phrases title="Must not contain" phrases={rule.forbiddenPhrases} />}
            </div>
          </Item>
        )}
      </dl>
    </article>
  );
}

function Item({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`min-w-0 ${className ?? ""}`}>
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 leading-relaxed text-[var(--ink-700)] [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

function Unset({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}

function Phrases({ title, phrases }: { title: string; phrases: string[] }) {
  return (
    <p className="flex flex-wrap items-center gap-1.5">
      <span>{title}:</span>
      {phrases.map((p) => (
        <span key={p} className="rounded-md border border-border bg-[var(--panel)] px-1.5 py-0.5 font-mono text-xs text-foreground [overflow-wrap:anywhere]">{p}</span>
      ))}
    </p>
  );
}
