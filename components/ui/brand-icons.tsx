import { forwardRef, type ReactNode } from "react";
import type { LucideIcon, LucideProps } from "lucide-react";

/* ──────────────────────────────────────────────────────────────
   Blue-IQ icon set.
   Drawn on a 24×24 grid with a 3px safe margin, 2px corner radius,
   round caps and joins, and a 1.75 stroke. Every icon is typed as
   `LucideIcon`, so it drops in wherever a lucide icon is expected.
   ────────────────────────────────────────────────────────────── */

export const ICON_STROKE = 1.75;

function createIcon(name: string, shapes: ReactNode): LucideIcon {
  const Icon = forwardRef<SVGSVGElement, LucideProps>(function Icon(
    { size = 24, strokeWidth = ICON_STROKE, absoluteStrokeWidth, className, children, ...rest },
    ref,
  ) {
    const stroke = absoluteStrokeWidth ? (Number(strokeWidth) * 24) / Number(size) : strokeWidth;
    const labelled = "aria-label" in rest || "aria-labelledby" in rest;
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={labelled ? undefined : true}
        className={className}
        {...rest}
      >
        {shapes}
        {children}
      </svg>
    );
  });
  Icon.displayName = name;
  return Icon;
}

/** Dashboard: one wide headline tile over two unequal panels. */
export const DashboardIcon = createIcon(
  "DashboardIcon",
  <>
    <rect x="3" y="3" width="18" height="6" rx="2" />
    <rect x="3" y="12" width="10" height="9" rx="2" />
    <rect x="16" y="12" width="5" height="9" rx="2" />
  </>,
);

/** Projects: a folder with the contract lines inside it. */
export const ProjectsIcon = createIcon(
  "ProjectsIcon",
  <>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M7 12.5h6" />
    <path d="M7 16h4" />
  </>,
);

/** Library: a stack of three contracts, the front one legible. */
export const LibraryIcon = createIcon(
  "LibraryIcon",
  <>
    <path d="M3 15V5a2 2 0 0 1 2-2h10" />
    <path d="M6 18V8a2 2 0 0 1 2-2h10" />
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M12.5 14h5" />
    <path d="M12.5 17h3" />
  </>,
);

/** Workflow: a board rail with three stage columns of different depth. */
export const WorkflowIcon = createIcon(
  "WorkflowIcon",
  <>
    <path d="M3 4h18" />
    <rect x="3" y="8" width="5" height="9" rx="1.5" />
    <rect x="9.5" y="8" width="5" height="13" rx="1.5" />
    <rect x="16" y="8" width="5" height="6" rx="1.5" />
  </>,
);

/** Renewals: a calendar with a return arrow in the date area. */
export const RenewalsIcon = createIcon(
  "RenewalsIcon",
  <>
    <path d="M8 3v4" />
    <path d="M16 3v4" />
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18" />
    <path d="M15 15.5a3 3 0 1 1-1.2-2.4" />
    <path d="M14 11.3v1.8h-1.8" />
  </>,
);

/** Draft SOW: a page being written, with the pen across its corner. */
export const DraftIcon = createIcon(
  "DraftIcon",
  <>
    <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8l4 4v2" />
    <path d="M14 3v4h4" />
    <path d="M8 10h5" />
    <path d="M8 14h3" />
    <path d="M12 21l1-3.5 6.3-6.3a1.77 1.77 0 0 1 2.5 2.5L15.5 20z" />
  </>,
);

/** Sonar: a source dot with two open echo rings, gaps on opposite sides. */
export const SonarIcon = createIcon(
  "SonarIcon",
  <>
    <path d="M21 12a9 9 0 1 1-9-9" />
    <path d="M7 12a5 5 0 1 1 5 5" />
    <circle cx="12" cy="12" r="0.75" fill="currentColor" />
  </>,
);

/** Insights: axes with a trend that ends on a marked reading. */
export const InsightsIcon = createIcon(
  "InsightsIcon",
  <>
    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
    <path d="M7 16l3.5-4 3 2.5 3.3-4.9" />
    <circle cx="18" cy="7.5" r="1.75" />
  </>,
);

/** Settings: two sliders set to different positions. */
export const SettingsIcon = createIcon(
  "SettingsIcon",
  <>
    <path d="M3 8h9.5" />
    <path d="M17.5 8H21" />
    <circle cx="15" cy="8" r="2.5" />
    <path d="M3 16h3.5" />
    <path d="M11.5 16H21" />
    <circle cx="9" cy="16" r="2.5" />
  </>,
);

/** Help: a question mark in a circle, the convention people look for. */
export const HelpIcon = createIcon(
  "HelpIcon",
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.25a2.5 2.5 0 1 1 3.6 2.25c-.7.35-1.1.9-1.1 1.6v.4" />
    <path d="M12 16.75h.01" />
  </>,
);

/** Info: a note marker. */
export const InfoIcon = createIcon(
  "InfoIcon",
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </>,
);

/** Clause / document: a page with one clause held in a bracket. */
export const ClauseIcon = createIcon(
  "ClauseIcon",
  <>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M10 12H8.5v5.5H10" />
    <path d="M12.5 13.25H16" />
    <path d="M12.5 16.25H15" />
  </>,
);

/** Amendment: the original behind, the amended page in front with a ± mark. */
export const AmendmentIcon = createIcon(
  "AmendmentIcon",
  <>
    <path d="M4 16V5a2 2 0 0 1 2-2h8" />
    <rect x="8" y="7" width="12" height="14" rx="2" />
    <path d="M11.5 12h5" />
    <path d="M14 9.5v5" />
    <path d="M11.5 17.5h5" />
  </>,
);

/** Playbook: a bound book carrying a measured standard line. */
export const PlaybookIcon = createIcon(
  "PlaybookIcon",
  <>
    <path d="M4 19V5a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v13H6a2 2 0 0 0 0 4h14" />
    <path d="M8 10h8" />
    <path d="M8 8.5v3" />
    <path d="M16 8.5v3" />
  </>,
);

const SHIELD = "M12 3l7 3v5.5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5V6z";

/** Risk: a shield raising an alert. */
export const RiskIcon = createIcon(
  "RiskIcon",
  <>
    <path d={SHIELD} />
    <path d="M12 8.5v4" />
    <path d="M12 16h.01" />
  </>,
);

/** Compliance: a shield that passed its check. */
export const ComplianceIcon = createIcon(
  "ComplianceIcon",
  <>
    <path d={SHIELD} />
    <path d="M9 12l2.2 2.2L15 10.5" />
  </>,
);

/** Upload: a document arrow rising out of the intake tray. */
export const UploadIcon = createIcon(
  "UploadIcon",
  <>
    <path d="M12 15V4" />
    <path d="M8 8l4-4 4 4" />
    <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
  </>,
);

/** Team: a reviewer with a second reviewer behind. */
export const TeamIcon = createIcon(
  "TeamIcon",
  <>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" />
    <path d="M16 5.2a3 3 0 0 1 0 5.6" />
    <path d="M18 14.3a5 5 0 0 1 3 4.7v1" />
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

/** Gives a lucide utility glyph the set's default stroke weight. */
export function withBrandStroke(Glyph: LucideIcon, name: string): LucideIcon {
  const Icon = forwardRef<SVGSVGElement, LucideProps>(function Icon(props, ref) {
    return <Glyph ref={ref} strokeWidth={ICON_STROKE} {...props} />;
  });
  Icon.displayName = name;
  return Icon;
}
