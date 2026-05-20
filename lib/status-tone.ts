/** Shared status badge colours — used by dashboard + projects pages */
export const STATUS_TONE: Record<string, { dot: string; text: string; bg: string }> = {
  draft:       { dot: "bg-[var(--ink-400)]",   text: "text-[var(--ink-600)]",  bg: "bg-[var(--ink-100)]" },
  review:      { dot: "bg-[var(--info)]",       text: "text-[var(--info)]",      bg: "bg-[var(--info-soft)]" },
  negotiation: { dot: "bg-[var(--warning)]",    text: "text-[var(--warning)]",   bg: "bg-[var(--warning-soft)]" },
  approval:    { dot: "bg-[var(--ai-ink)]",     text: "text-[var(--ai-ink)]",    bg: "bg-[var(--ai-surface)]" },
  signed:      { dot: "bg-[var(--success)]",    text: "text-[var(--success)]",   bg: "bg-[var(--success-soft)]" },
  active:      { dot: "bg-[var(--success)]",    text: "text-[var(--success)]",   bg: "bg-[var(--success-soft)]" },
  renewal:     { dot: "bg-[var(--warning)]",    text: "text-[var(--warning)]",   bg: "bg-[var(--warning-soft)]" },
  expired:     { dot: "bg-[var(--danger)]",     text: "text-[var(--danger)]",    bg: "bg-[var(--danger-soft)]" },
};
