import { forwardRef, type ReactNode } from "react";
import type { LucideIcon, LucideProps } from "lucide-react";
import { ICON_OPTICAL_STROKE, iconStrokeWidth, snapIconSize } from "@/lib/icon-scale";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────
   Blue-IQ icon set.

   Grid      24×24 viewBox. Strokes sit on 3–21 (a 2.25px live margin
             once the stroke is drawn), never closer than 2.
   Keylines  circle r9 · square 16 (4–20) · portrait 14×18 (5–19 × 3–21)
             · landscape 18×14, so a circle, a page and a box carry the
             same visual weight.
   Corners   2 on every rect and path corner; round caps and joins.
   Detail    parallel strokes ≥ 4 apart (they stay separate at 16px),
             dots are r0.5 filled circles (they grow with the stroke).
   Stroke    1.5 screen px at every size (see renderProps).
   Sizes     12 / 16 / 20 / 24; other sizes snap (lib/icon-scale.ts).

   Every icon is typed as `LucideIcon`, so it drops in wherever a
   lucide icon is expected.
   ────────────────────────────────────────────────────────────── */

/** The rendered stroke in screen pixels (kept as an export for older imports). */
export const ICON_STROKE = ICON_OPTICAL_STROKE;

/**
 * Pins the stroke to 1.5 screen pixels even when CSS sizes the svg (e.g. a
 * parent's `[&_svg]:size-4`), where the width attribute and therefore the
 * viewBox scale are not what the size prop said. The `stroke-width`
 * attribute below is the same answer for renderers without CSS.
 */
const OPTICAL_STROKE_CLASS = "[stroke-width:1.5] [&_*]:[vector-effect:non-scaling-stroke]";

type A11yProps = { "aria-label"?: string; "aria-labelledby"?: string };

function isLabelled(rest: A11yProps): boolean {
  return Boolean(rest["aria-label"] || rest["aria-labelledby"]);
}

/**
 * Size and stroke for every icon. `strokeWidth` and `absoluteStrokeWidth`
 * from call sites are deliberately ignored: the audit found nine different
 * weights (1 to 3) across the app, which made the same glyph look bold in one
 * table and hairline in the next. One optical weight is the rule; size is the
 * only knob, and it snaps to the scale.
 */
function renderProps(size: LucideProps["size"], className: string | undefined) {
  const snapped = snapIconSize(size);
  return {
    width: snapped,
    height: snapped,
    strokeWidth: iconStrokeWidth(snapped),
    className: cn(OPTICAL_STROKE_CLASS, className),
  };
}

function createIcon(name: string, shapes: ReactNode): LucideIcon {
  const Icon = forwardRef<SVGSVGElement, LucideProps>(function Icon(
    // strokeWidth / absoluteStrokeWidth are pulled out so they never reach the svg.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    { size, strokeWidth, absoluteStrokeWidth, className, children, ...rest },
    ref,
  ) {
    const labelled = isLabelled(rest);
    const { width, height, strokeWidth: stroke, className: cls } = renderProps(size, className);
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        role={labelled ? "img" : undefined}
        aria-hidden={labelled ? undefined : true}
        focusable="false"
        {...rest}
        width={width}
        height={height}
        strokeWidth={stroke}
        className={cls}
      >
        {shapes}
        {children}
      </svg>
    );
  });
  Icon.displayName = name;
  return Icon;
}

/** A dot that keeps its weight at any size (i, ?, ! marks). */
function Dot({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r="0.5" fill="currentColor" />;
}

/* Shared outlines, so related icons are literally the same drawing. */
const PAGE = "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z";
const PAGE_FOLD = "M14 3v4a1 1 0 0 0 1 1h4";
const SHIELD = "M12 3l7 2.5V11c0 4.6-2.9 8.3-7 10-4.1-1.7-7-5.4-7-10V5.5z";
const RING = <circle cx="12" cy="12" r="9" />;

/* ─── Navigation ───────────────────────────────────────────────── */

/** Dashboard: one wide headline tile over two unequal panels. */
export const DashboardIcon = createIcon(
  "DashboardIcon",
  <>
    <rect x="4" y="4" width="16" height="5" rx="2" />
    <rect x="4" y="13" width="8" height="7" rx="2" />
    <rect x="16" y="13" width="4" height="7" rx="2" />
  </>,
);

/** Projects: a folder holding one contract line. */
export const ProjectsIcon = createIcon(
  "ProjectsIcon",
  <>
    <path d="M3 7a2 2 0 0 1 2-2h3.5a2 2 0 0 1 1.6.8L11.5 7.5H19a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M8 13.5h6" />
  </>,
);

/** Library: the archive box every signed contract goes into. */
export const LibraryIcon = createIcon(
  "LibraryIcon",
  <>
    <rect x="3" y="4" width="18" height="5" rx="2" />
    <path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" />
    <path d="M10 13h4" />
  </>,
);

/** Workflow: a board with three stage columns of different depth. */
export const WorkflowIcon = createIcon(
  "WorkflowIcon",
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M7.5 7.5v9" />
    <path d="M12 7.5V12" />
    <path d="M16.5 7.5V14" />
  </>,
);

/** Renewals: a "repeating event". A plain calendar whose bottom-right
 *  corner is left open for a three-quarter turn ending in an arrowhead,
 *  so nothing is crammed inside the date area and it reads at 16px. */
export const RenewalsIcon = createIcon(
  "RenewalsIcon",
  <>
    <path d="M8 3v4" />
    <path d="M16 3v4" />
    <path d="M12 21H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5" />
    <path d="M3 10h18" />
    <path d="M18 14.5a3.5 3.5 0 1 1-3.5 3.5" />
    <path d="M13 19.5l1.5-1.5 1.5 1.5" />
  </>,
);

/** Insights: an axis with three bars of different height. */
export const InsightsIcon = createIcon(
  "InsightsIcon",
  <>
    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
    <path d="M8 17v-5" />
    <path d="M12.5 17V7" />
    <path d="M17 17V9.5" />
  </>,
);

/** Settings: a six-tooth gear around its hub. */
export const SettingsIcon = createIcon(
  "SettingsIcon",
  <>
    <path d="M9.63 5.84L10.28 3.17A9 9 0 0 1 13.72 3.17L14.37 5.84A6.6 6.6 0 0 1 16.15 6.87L18.79 6.1A9 9 0 0 1 20.51 9.07L18.52 10.97A6.6 6.6 0 0 1 18.52 13.03L20.51 14.93A9 9 0 0 1 18.79 17.9L16.15 17.13A6.6 6.6 0 0 1 14.37 18.16L13.72 20.83A9 9 0 0 1 10.28 20.83L9.63 18.16A6.6 6.6 0 0 1 7.85 17.13L5.21 17.9A9 9 0 0 1 3.49 14.93L5.48 13.03A6.6 6.6 0 0 1 5.48 10.97L3.49 9.07A9 9 0 0 1 5.21 6.1L7.85 6.87A6.6 6.6 0 0 1 9.63 5.84Z" />
    <circle cx="12" cy="12" r="2.5" />
  </>,
);

/** Team: a reviewer with a second reviewer behind. */
export const TeamIcon = createIcon(
  "TeamIcon",
  <>
    <circle cx="9" cy="7.5" r="3" />
    <path d="M3 20a6 6 0 0 1 12 0" />
    <path d="M15.5 4.7a3 3 0 0 1 0 5.6" />
    <path d="M17.5 14.4A6 6 0 0 1 21 20" />
  </>,
);

/** Notifications: a bell with its hanger and clapper. */
export const NotificationsIcon = createIcon(
  "NotificationsIcon",
  <>
    <path d="M12 3v2" />
    <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z" />
    <path d="M10 21h4" />
  </>,
);

/* ─── Product concepts ─────────────────────────────────────────── */

/** Sonar, the AI mark: a solid spark sending out two sonar waves. */
export const SonarIcon = createIcon(
  "SonarIcon",
  <>
    <path
      d="M8.5 12c.45 2.1 1.4 3.05 3.5 3.5-2.1.45-3.05 1.4-3.5 3.5-.45-2.1-1.4-3.05-3.5-3.5 2.1-.45 3.05-1.4 3.5-3.5Z"
      fill="currentColor"
    />
    <path d="M8.5 8.5a7 7 0 0 1 7 7" />
    <path d="M8.5 4.5a11 11 0 0 1 11 11" />
  </>,
);

/** Clause / document: a page with two lines of text. */
export const ClauseIcon = createIcon(
  "ClauseIcon",
  <>
    <path d={PAGE} />
    <path d={PAGE_FOLD} />
    <path d="M9 12.5h6" />
    <path d="M9 16.5h4" />
  </>,
);

/** Contract: a page with a heading line and a signature. */
export const ContractIcon = createIcon(
  "ContractIcon",
  <>
    <path d={PAGE} />
    <path d={PAGE_FOLD} />
    <path d="M9 11.5h3" />
    <path d="M8.5 17.5c1-2 2-2.5 2.5-1.5s.5 2 1.5 1.5 1.5-2 2.5-1.5" />
  </>,
);

/** Amendment: the original behind, the amended page in front carrying a plus. */
export const AmendmentIcon = createIcon(
  "AmendmentIcon",
  <>
    <path d="M4 16.5V5a2 2 0 0 1 2-2h8.5" />
    <rect x="8" y="7" width="12" height="14" rx="2" />
    <path d="M14 11v6" />
    <path d="M11 14h6" />
  </>,
);

/** Draft SOW: a page being written, with the pen across its corner. */
export const DraftIcon = createIcon(
  "DraftIcon",
  <>
    <path d="M10 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v2" />
    <path d={PAGE_FOLD} />
    <path d="M9 12.5h4" />
    <path d="M12.5 21v-2.5l5.4-5.4a1.77 1.77 0 0 1 2.5 2.5L15 21z" />
  </>,
);

/** Playbook: a bound book with a bookmark ribbon. */
export const PlaybookIcon = createIcon(
  "PlaybookIcon",
  <>
    <path d="M5 19V5a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v13H7a2 2 0 0 0 0 4h12" />
    <path d="M10 3v7l2-1.5 2 1.5V3" />
  </>,
);

/** Matrix: an approval grid with one cell checked. */
export const MatrixIcon = createIcon(
  "MatrixIcon",
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 9v12" />
    <path d="M12 15l2 2 4-4" />
  </>,
);

/** Obligation: a checklist whose second item is still on the clock. */
export const ObligationIcon = createIcon(
  "ObligationIcon",
  <>
    <path d="M4 6.5L5.5 8l3-3" />
    <path d="M12 6.5h8" />
    <path d="M4 14.5L5.5 16l3-3" />
    <circle cx="16.5" cy="16.5" r="4" />
    <path d="M16.5 14.5v2l1.5 1.5" />
  </>,
);

/** Counterparty: the other side's building, a tower with a lower wing. */
export const CounterpartyIcon = createIcon(
  "CounterpartyIcon",
  <>
    <path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
    <path d="M15 9h3a2 2 0 0 1 2 2v10" />
    <path d="M3 21h18" />
    <path d="M8.5 8h3" />
    <path d="M8.5 12h3" />
    <path d="M8.5 16h3" />
  </>,
);

/** Blocker: a striped road barrier on two legs. */
export const BlockerIcon = createIcon(
  "BlockerIcon",
  <>
    <rect x="3" y="7" width="18" height="6" rx="2" />
    <path d="M10 7l-3 6" />
    <path d="M17 7l-3 6" />
    <path d="M6 13v7" />
    <path d="M18 13v7" />
    <path d="M6 4v3" />
    <path d="M18 4v3" />
  </>,
);

/** Risk: a shield raising an alert. */
export const RiskIcon = createIcon(
  "RiskIcon",
  <>
    <path d={SHIELD} />
    <path d="M12 7.5V12" />
    <Dot x={12} y={16} />
  </>,
);

/** Compliance: a shield that passed its check. */
export const ComplianceIcon = createIcon(
  "ComplianceIcon",
  <>
    <path d={SHIELD} />
    <path d="M9 12l2 2 4-4" />
  </>,
);

/** Upload: an arrow rising out of the intake tray. */
export const UploadIcon = createIcon(
  "UploadIcon",
  <>
    <path d="M12 15V4" />
    <path d="M7.5 8.5L12 4l4.5 4.5" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </>,
);

/* ─── Status ───────────────────────────────────────────────────── */

/** Loading: a faint ring with one arc, spun with `animate-spin`. */
export const SpinnerIcon = createIcon(
  "SpinnerIcon",
  <>
    <circle cx="12" cy="12" r="9" opacity="0.22" />
    <path d="M21 12a9 9 0 0 0-9-9" />
  </>,
);

/** Help: a question mark in a circle, the convention people look for. */
export const HelpIcon = createIcon(
  "HelpIcon",
  <>
    {RING}
    <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5" />
    <Dot x={12} y={17} />
  </>,
);

/** Info: a note marker. */
export const InfoIcon = createIcon(
  "InfoIcon",
  <>
    {RING}
    <path d="M12 12v5" />
    <Dot x={12} y={7.5} />
  </>,
);

/**
 * Gives a lucide utility glyph the set's rendering: snapped size, 1.5px
 * optical stroke (call-site strokeWidth ignored, see renderProps), and
 * aria-hidden unless the call site labels it.
 */
export function withBrandStroke(Glyph: LucideIcon, name: string): LucideIcon {
  const Icon = forwardRef<SVGSVGElement, LucideProps>(function Icon(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    { size, strokeWidth, absoluteStrokeWidth, className, ...rest },
    ref,
  ) {
    const labelled = isLabelled(rest);
    const { width, strokeWidth: stroke, className: cls } = renderProps(size, className);
    return (
      <Glyph
        ref={ref}
        role={labelled ? "img" : undefined}
        aria-hidden={labelled ? undefined : true}
        focusable="false"
        {...rest}
        size={width}
        strokeWidth={stroke}
        absoluteStrokeWidth={false}
        className={cls}
      />
    );
  });
  Icon.displayName = name;
  return Icon;
}
