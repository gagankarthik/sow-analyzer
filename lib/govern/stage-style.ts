// One colour per stage, the same on every surface: pills, board columns,
// charts and the stage bar. Tokens live in app/globals.css (--stage-*).
// Class names are written out in full so Tailwind can see them.

import type { Stage } from "./types"

/** Solid fill: dots, bars, column edges. */
export const STAGE_BG: Record<Stage, string> = {
  draft: "bg-[var(--stage-draft)]",
  review: "bg-[var(--stage-review)]",
  negotiation: "bg-[var(--stage-negotiation)]",
  approval: "bg-[var(--stage-approval)]",
  signed: "bg-[var(--stage-signed)]",
  active: "bg-[var(--stage-active)]",
  renewal: "bg-[var(--stage-renewal)]",
  expired: "bg-[var(--stage-expired)]",
}

/** Soft tint behind a stage label. */
export const STAGE_SOFT_BG: Record<Stage, string> = {
  draft: "bg-[var(--stage-draft-soft)]",
  review: "bg-[var(--stage-review-soft)]",
  negotiation: "bg-[var(--stage-negotiation-soft)]",
  approval: "bg-[var(--stage-approval-soft)]",
  signed: "bg-[var(--stage-signed-soft)]",
  active: "bg-[var(--stage-active-soft)]",
  renewal: "bg-[var(--stage-renewal-soft)]",
  expired: "bg-[var(--stage-expired-soft)]",
}

/** Ring in the stage's colour (the current step on a progress track). */
export const STAGE_BORDER: Record<Stage, string> = {
  draft: "border-[var(--stage-draft)]",
  review: "border-[var(--stage-review)]",
  negotiation: "border-[var(--stage-negotiation)]",
  approval: "border-[var(--stage-approval)]",
  signed: "border-[var(--stage-signed)]",
  active: "border-[var(--stage-active)]",
  renewal: "border-[var(--stage-renewal)]",
  expired: "border-[var(--stage-expired)]",
}

/** The stage's colour for chart marks and SVG strokes. */
export const STAGE_COLOR: Record<Stage, string> = {
  draft: "var(--stage-draft)",
  review: "var(--stage-review)",
  negotiation: "var(--stage-negotiation)",
  approval: "var(--stage-approval)",
  signed: "var(--stage-signed)",
  active: "var(--stage-active)",
  renewal: "var(--stage-renewal)",
  expired: "var(--stage-expired)",
}

/** The stage's colour as currentColor: stage icons draw with it. */
export const STAGE_TEXT: Record<Stage, string> = {
  draft: "text-[var(--stage-draft)]",
  review: "text-[var(--stage-review)]",
  negotiation: "text-[var(--stage-negotiation)]",
  approval: "text-[var(--stage-approval)]",
  signed: "text-[var(--stage-signed)]",
  active: "text-[var(--stage-active)]",
  renewal: "text-[var(--stage-renewal)]",
  expired: "text-[var(--stage-expired)]",
}
