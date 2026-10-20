/** Lifecycle stage colours, the same as the workflow board (STAGE_DOT): a navy
 *  ramp towards signature, green once signed (current value), grey after.
 *  A stage is not a status, so no amber or red: negotiation is not a warning
 *  and an expired agreement is not an error. */
const STAGE_TEXT = "text-[var(--ink-700)]";
const STAGE_BG = "bg-[var(--ink-100)]";
export const STATUS_TONE: Record<string, { dot: string; text: string; bg: string }> = {
  draft:       { dot: "bg-[var(--ink-400)]",  text: STAGE_TEXT, bg: STAGE_BG },
  review:      { dot: "bg-[var(--navy-300)]", text: STAGE_TEXT, bg: STAGE_BG },
  negotiation: { dot: "bg-[var(--navy-500)]", text: STAGE_TEXT, bg: STAGE_BG },
  approval:    { dot: "bg-[var(--navy-800)]", text: STAGE_TEXT, bg: STAGE_BG },
  signed:      { dot: "bg-[var(--success)]",  text: "text-[var(--success-fg)]", bg: "bg-[var(--success-soft)]" },
  active:      { dot: "bg-[var(--success)]",  text: "text-[var(--success-fg)]", bg: "bg-[var(--success-soft)]" },
  renewal:     { dot: "bg-[var(--ink-500)]",  text: STAGE_TEXT, bg: STAGE_BG },
  expired:     { dot: "bg-[var(--ink-300)]",  text: "text-[var(--ink-600)]", bg: STAGE_BG },
};
