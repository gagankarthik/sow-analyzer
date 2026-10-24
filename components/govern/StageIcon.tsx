// A stage as a small round icon in the stage's colour whose fill says how far
// along it is (lib/govern/stage-icon.ts). Decorative by default: the stage's
// name is printed beside it. Pass `label` when it stands alone.

import { STAGE_LABEL } from "@/lib/govern/labels";
import { stageGlyph, wedgePath } from "@/lib/govern/stage-icon";
import { STAGE_TEXT } from "@/lib/govern/stage-style";
import type { Contract, Stage } from "@/lib/govern/types";
import { cn } from "@/lib/utils";

export function StageIcon({ stage, state, size = 14, label, className }: {
  stage: Stage;
  state?: Contract["state"];
  size?: 12 | 14 | 16;
  /** Accessible name when no text sits beside the icon. */
  label?: string;
  className?: string;
}) {
  const glyph = stageGlyph(stage, state);
  const rejected = state === "rejected";
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("shrink-0", rejected ? "text-[var(--danger)]" : STAGE_TEXT[stage], className)}
      fill="none"
    >
      {glyph.kind === "dashed" && <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.4 1.85" />}
      {glyph.kind === "progress" && (
        <>
          <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
          <path d={wedgePath(glyph.fraction, 8, 8, 3.6)} fill="currentColor" />
        </>
      )}
      {glyph.kind === "clock" && (
        <>
          <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 4.6V8l2.4 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {glyph.kind === "filled" && (
        <>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          {glyph.mark === "check" && <path d="M5 8.2l2 2 4-4.2" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
          {glyph.mark === "minus" && <path d="M5 8h6" stroke="white" strokeWidth="1.6" strokeLinecap="round" />}
          {glyph.mark === "x" && <path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" stroke="white" strokeWidth="1.6" strokeLinecap="round" />}
        </>
      )}
    </svg>
  );
}

/** Icon and the stage's name ("Rejected" when rejected). */
export function StageLabel({ stage, state, size = 14, className, textClassName }: {
  stage: Stage;
  state?: Contract["state"];
  size?: 12 | 14 | 16;
  className?: string;
  textClassName?: string;
}) {
  const rejected = state === "rejected";
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <StageIcon stage={stage} state={state} size={size} />
      <span className={cn("truncate", rejected && "text-[var(--danger)]", textClassName)}>{rejected ? "Rejected" : STAGE_LABEL[stage]}</span>
    </span>
  );
}
