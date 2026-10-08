"use client";

// Small pieces the contract page's sections share.

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Check, Copy, FileText, Sonar, UserRound } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

import type { MatrixReview } from "@/lib/govern/types";

/** A clause type in words: the review's own label, else the type made readable. */
export function clauseLabel(clauseType: string | null, review: MatrixReview | null): string | null {
  if (!clauseType) return null;
  const found = review?.clauses.find((c) => c.clauseType === clauseType);
  if (found) return found.label;
  const words = clauseType.replace(/[_-]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : null;
}

/** A titled block inside a tab. */
export function Section({ title, description, actions, children, className, id }: {
  title: string; description?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; id?: string;
}) {
  return (
    <section id={id} aria-label={title} className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          {description && <p className="mt-0.5 max-w-[58ch] text-sm leading-relaxed text-[var(--ink-600)]">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/** Suggested contract language, set apart, with a copy button. */
export function SuggestedLanguage({ text, label = "Suggested language", className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied", { description: "Paste it into the redline." });
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy", { description: "Select the text and copy it by hand." });
    }
  }
  return (
    <figure className={cn("border-l border-[var(--ink-300)] py-0.5 pl-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <figcaption className="text-xs font-semibold text-[var(--brand-primary-700)]">{label}</figcaption>
        <Button type="button" variant="ghost" size="xs" onClick={copy} aria-label={`Copy ${label.toLowerCase()}`} className="text-[var(--brand-primary-700)]">
          {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <blockquote className="mt-1.5 max-w-[29rem] whitespace-pre-line break-words text-sm leading-relaxed text-foreground">{text}</blockquote>
    </figure>
  );
}

/** A label/value pair in a details list; unknown shows as a dash. */
export function Fact({ label, children, provenance, className }: {
  label: string; children: React.ReactNode; provenance?: React.ReactNode; className?: string;
}) {
  const empty = children === null || children === undefined || children === "";
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs font-medium text-[var(--ink-600)]">{label}</dt>
      <dd className={cn("mt-0.5 break-words text-sm", empty ? "text-[var(--ink-500)]" : "font-medium text-foreground")}>{empty ? "—" : children}</dd>
      {!empty && provenance && <dd className="mt-1">{provenance}</dd>}
    </div>
  );
}

const PROVENANCE_TONE = {
  person: "text-[var(--ink-700)]",
  sonar: "text-[var(--ai-ink)]",
  intake: "text-[var(--ink-600)]",
} as const;

/** Where a value came from: a person, Sonar (with its clause), or intake.
 *  Words and icon carry the meaning; the AI colour marks Sonar only. */
export function ProvenanceMark({ kind, text, className }: { kind: keyof typeof PROVENANCE_TONE; text: string; className?: string }) {
  const Icon = kind === "person" ? UserRound : kind === "sonar" ? Sonar : FileText;
  return (
    <span className={cn("inline-flex items-start gap-1 text-xs leading-snug", PROVENANCE_TONE[kind], className)}>
      <Icon size={12} className="mt-px shrink-0" aria-hidden />
      <span className="min-w-0">{text}</span>
    </span>
  );
}
