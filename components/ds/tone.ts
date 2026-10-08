// Tone → class maps shared by every components/ds piece that carries a status.
// A tone is a MEANING from the product-owner colour table, not a hue:
//   ok · acceptable · caution · blocked · unknown   (status meanings)
//   brand (the navy "structure" role: You hold it, emphasis that is not
//   an action; teal is reserved for actions) · ai (found by Sonar)
// The legacy names success / info / warning / danger / neutral are accepted
// as aliases so existing call sites can migrate without renaming.

export type StatusTone = "ok" | "acceptable" | "caution" | "blocked" | "unknown";
export type Tone = StatusTone | "brand" | "ai";
export type ToneAlias = "success" | "info" | "warning" | "danger" | "neutral";
export type ToneInput = Tone | ToneAlias;

const ALIAS: Record<ToneAlias, StatusTone> = {
  success: "ok",
  info: "acceptable",
  warning: "caution",
  danger: "blocked",
  neutral: "unknown",
};

/** Resolve an alias (success, warning…) to its canonical tone. */
export function resolveTone(t: ToneInput | undefined): Tone {
  if (!t) return "unknown";
  return (ALIAS as Record<string, StatusTone>)[t] ?? (t as Tone);
}

/** Soft fill + readable text + hairline border: pills, callouts, tags. */
export const TONE_SOFT: Record<Tone, string> = {
  ok: "bg-status-ok-soft text-status-ok-fg border-status-ok-border",
  acceptable: "bg-status-acceptable-soft text-status-acceptable-fg border-status-acceptable-border",
  caution: "bg-status-caution-soft text-status-caution-fg border-status-caution-border",
  blocked: "bg-status-blocked-soft text-status-blocked-fg border-status-blocked-border",
  unknown: "bg-status-unknown-soft text-status-unknown-fg border-status-unknown-border",
  brand: "bg-structure-soft text-structure-soft-fg border-structure-border",
  ai: "bg-ai-surface text-ai-ink border-ai-border",
};

/** Solid mark colour (dots, meter fills, timeline nodes). */
export const TONE_DOT: Record<Tone, string> = {
  ok: "bg-status-ok",
  acceptable: "bg-status-acceptable",
  caution: "bg-status-caution",
  blocked: "bg-status-blocked",
  unknown: "bg-status-unknown",
  brand: "bg-structure dark:bg-navy-300",
  ai: "bg-ai-accent",
};

/** Text-only colour (inline figures, icons beside text). */
export const TONE_TEXT: Record<Tone, string> = {
  ok: "text-status-ok-fg",
  acceptable: "text-status-acceptable-fg",
  caution: "text-status-caution-fg",
  blocked: "text-status-blocked-fg",
  unknown: "text-fg-secondary",
  brand: "text-structure-soft-fg",
  ai: "text-ai-ink",
};

/** SVG fill classes for the same marks. */
export const TONE_FILL: Record<Tone, string> = {
  ok: "fill-status-ok",
  acceptable: "fill-status-acceptable",
  caution: "fill-status-caution",
  blocked: "fill-status-blocked",
  unknown: "fill-status-unknown",
  brand: "fill-structure dark:fill-navy-300",
  ai: "fill-ai-accent",
};

/** Spoken name of a tone, used where the visible label does not say it. */
export const TONE_SPOKEN: Record<Tone, string> = {
  ok: "On track",
  acceptable: "Acceptable",
  caution: "Needs attention",
  blocked: "Blocked",
  unknown: "Not assessed",
  brand: "",
  ai: "Found by Sonar",
};
