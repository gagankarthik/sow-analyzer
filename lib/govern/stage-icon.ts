// What a stage's small round icon draws: a dashed ring for a new contract, a
// ring that fills a quarter at a time on its way to signature, a filled
// circle with a check once signed, a clock for renewal, a grey minus once
// closed out and a red cross when rejected. Pure, so the mapping is tested;
// the SVG lives in components/govern/StageIcon.tsx.

import type { Contract, Stage } from "./types"

export type StageGlyph =
  | { kind: "dashed" }
  | { kind: "progress"; fraction: number }
  | { kind: "clock" }
  | { kind: "filled"; mark: "check" | "minus" | "x" }

/** Share of the way to signature each review step has covered. */
const PROGRESS: Partial<Record<Stage, number>> = { review: 0.25, negotiation: 0.5, approval: 0.75 }

export function stageGlyph(stage: Stage, state?: Contract["state"]): StageGlyph {
  if (state === "rejected") return { kind: "filled", mark: "x" }
  if (stage === "draft") return { kind: "dashed" }
  const fraction = PROGRESS[stage]
  if (fraction !== undefined) return { kind: "progress", fraction }
  if (stage === "renewal") return { kind: "clock" }
  if (stage === "expired") return { kind: "filled", mark: "minus" }
  return { kind: "filled", mark: "check" } // signed, active
}

/** SVG path for a pie wedge of `fraction` (0–1) of a circle at (cx, cy),
 *  starting at twelve o'clock and running clockwise. */
export function wedgePath(fraction: number, cx: number, cy: number, r: number): string {
  const f = Math.min(Math.max(fraction, 0), 1)
  if (f === 0) return ""
  if (f === 1) return `M${cx} ${cy - r}A${r} ${r} 0 1 1 ${cx} ${cy + r}A${r} ${r} 0 1 1 ${cx} ${cy - r}Z`
  const angle = f * 2 * Math.PI
  const x = round(cx + r * Math.sin(angle))
  const y = round(cy - r * Math.cos(angle))
  return `M${cx} ${cy}L${cx} ${cy - r}A${r} ${r} 0 ${f > 0.5 ? 1 : 0} 1 ${x} ${y}Z`
}

const round = (n: number) => Math.round(n * 1000) / 1000
