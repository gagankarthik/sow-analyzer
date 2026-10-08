import type { ReactNode } from "react";

/* Icon set for the public site's menus. One 24px grid, one 1.5 stroke,
   round caps and joins, drawn in currentColor so the parent sets the
   colour. Decorative (aria-hidden): the label beside each icon carries
   the meaning. Generic drawings, never a vendor's logo. */

export type IconProps = { className?: string; size?: number };
export type Icon = (props: IconProps) => ReactNode;

function Glyph({ size = 20, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/* ─── Product ─────────────────────────────────────────────────── */

/** Matrix review: a clause grid with one row ticked. */
export const IconMatrix: Icon = (p) => (
  <Glyph {...p}>
    <rect x="3.5" y="4" width="17" height="16" rx="2" />
    <path d="M3.5 9.5h17M3.5 15h17M9 4v16" />
    <path d="m12.5 12.25 1.5 1.5 3-3" />
  </Glyph>
);

/** Workflow: three stage lanes with a card moving right. */
export const IconWorkflow: Icon = (p) => (
  <Glyph {...p}>
    <path d="M4 4.5v15M12 4.5v15M20 4.5v15" />
    <rect x="5.75" y="8" width="4.5" height="4" rx="1" />
    <path d="M13.75 15.5h4.5M16.5 13.75l1.75 1.75-1.75 1.75" />
  </Glyph>
);

/** Value: a stack of coins with a rising mark. */
export const IconValue: Icon = (p) => (
  <Glyph {...p}>
    <ellipse cx="9" cy="7" rx="5.5" ry="2.5" />
    <path d="M3.5 7v5c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V7" />
    <path d="M3.5 12v5c0 1.4 2.5 2.5 5.5 2.5 1.2 0 2.3-.2 3.2-.5" />
    <path d="M16 19.5 20.5 15M17.5 15h3v3" />
  </Glyph>
);

/** Bottlenecks: bars of unequal height and a clock. */
export const IconBottleneck: Icon = (p) => (
  <Glyph {...p}>
    <path d="M4 20h9M5.5 20v-5M9 20V9M12.5 20v-3" />
    <circle cx="17.5" cy="8.5" r="4" />
    <path d="M17.5 6.5v2l1.25 1.25" />
  </Glyph>
);

/** Capture: a page with scan lines across it. */
export const IconCapture: Icon = (p) => (
  <Glyph {...p}>
    <path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z" />
    <path d="M14 3.5V8h4.5" />
    <path d="M3.5 13h17" />
    <path d="M8.5 16.5h7M8.5 10h3" />
  </Glyph>
);

/** Integrations: two plugs meeting. */
export const IconConnect: Icon = (p) => (
  <Glyph {...p}>
    <path d="M9.5 14.5 7 17a2.5 2.5 0 0 1-3.5-3.5L6 11" />
    <path d="M14.5 9.5 17 7a2.5 2.5 0 0 1 3.5 3.5L18 13" />
    <path d="m8 9 7 7M6 11l7 7M11 6l7 7" />
  </Glyph>
);

/* ─── Teams ───────────────────────────────────────────────────── */

/** Research administration: a folder of records. */
export const IconRecords: Icon = (p) => (
  <Glyph {...p}>
    <path d="M3.5 7.5v10a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-6.5l-2-2.5H5.5a2 2 0 0 0-2 2z" />
    <path d="M8 13h8M8 16h5" />
  </Glyph>
);

/** Technology commercialization: a key, for a license granted. */
export const IconLicense: Icon = (p) => (
  <Glyph {...p}>
    <circle cx="8" cy="15.5" r="4" />
    <path d="m10.8 12.7 8.2-8.2M16.5 7l2.5 2.5M14 9.5l2 2" />
  </Glyph>
);

/** Sponsored programs: an award ribbon. */
export const IconAward: Icon = (p) => (
  <Glyph {...p}>
    <circle cx="12" cy="9" r="5" />
    <path d="m9 13.5-1.5 7 4.5-2.5 4.5 2.5-1.5-7" />
  </Glyph>
);

/** Legal affairs: balanced scales. */
export const IconScale: Icon = (p) => (
  <Glyph {...p}>
    <path d="M12 4v16M8 20h8M5.5 7h13" />
    <path d="M5.5 7 3 13a2.75 2.75 0 0 0 5 0z" />
    <path d="M18.5 7 16 13a2.75 2.75 0 0 0 5 0z" />
  </Glyph>
);

/** Finance and leadership: a trend line over a baseline. */
export const IconLeadership: Icon = (p) => (
  <Glyph {...p}>
    <path d="M4 4v16h16" />
    <path d="m7.5 15 3.5-4 3 2.5 5-6" />
    <path d="M16 7.5h3v3" />
  </Glyph>
);

/* ─── Industries ──────────────────────────────────────────────── */

/** Research universities: a columned hall. */
export const IconUniversity: Icon = (p) => (
  <Glyph {...p}>
    <path d="M3.5 9 12 4.5 20.5 9" />
    <path d="M4.5 9.5h15M5 19.5h14M3.5 19.5h17" />
    <path d="M7 12v5M10.5 12v5M13.5 12v5M17 12v5" />
  </Glyph>
);

/** Academic medical centres: a building with a cross. */
export const IconMedical: Icon = (p) => (
  <Glyph {...p}>
    <path d="M5 20V6.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2V20" />
    <path d="M3.5 20h17" />
    <path d="M12 8v5M9.5 10.5h5" />
    <path d="M10 20v-3.5h4V20" />
  </Glyph>
);

/** Research institutes: a flask. */
export const IconFlask: Icon = (p) => (
  <Glyph {...p}>
    <path d="M9.5 3.5h5M10 3.5v6L4.75 18a1.75 1.75 0 0 0 1.5 2.5h11.5a1.75 1.75 0 0 0 1.5-2.5L14 9.5v-6" />
    <path d="M7 14.5h10" />
  </Glyph>
);

/** Life sciences companies: a double helix. */
export const IconHelix: Icon = (p) => (
  <Glyph {...p}>
    <path d="M7 3.5c0 5.5 10 7.5 10 13s0 3.5 0 4" />
    <path d="M17 3.5c0 5.5-10 7.5-10 13v4" />
    <path d="M8.5 7h7M8.5 17h7M10 12h4" />
  </Glyph>
);

/* ─── Resources ───────────────────────────────────────────────── */

/** Security: a shield with a lock. */
export const IconShield: Icon = (p) => (
  <Glyph {...p}>
    <path d="M12 3.5 5 6v5.5c0 4.25 3 7.5 7 9 4-1.5 7-4.75 7-9V6z" />
    <rect x="9.25" y="11" width="5.5" height="4.25" rx="1" />
    <path d="M10.5 11V9.75a1.5 1.5 0 0 1 3 0V11" />
  </Glyph>
);

/** Privacy: an eye behind a line. */
export const IconPrivacy: Icon = (p) => (
  <Glyph {...p}>
    <path d="M3.5 12S6.5 6.5 12 6.5c1.5 0 2.8.4 4 1M20.5 12s-3 5.5-8.5 5.5c-1.5 0-2.8-.4-4-1" />
    <path d="M10 14a2.75 2.75 0 0 1 4-4" />
    <path d="M4.5 19.5 19.5 4.5" />
  </Glyph>
);

/** Data processing: a page with a signature line. */
export const IconAgreement: Icon = (p) => (
  <Glyph {...p}>
    <path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z" />
    <path d="M14 3.5V8h4.5M8.5 11.5h7" />
    <path d="M8.5 16.5c1-1.5 1.75-1.5 2.25 0s1.25 1.5 2.25 0 1.75-.75 2.5 0" />
  </Glyph>
);

/** Savings calculator. */
export const IconCalculator: Icon = (p) => (
  <Glyph {...p}>
    <rect x="5" y="3.5" width="14" height="17" rx="2" />
    <path d="M8 7.5h8" />
    <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01M8.5 15h.01M12 15h.01M15.5 15h.01M8.5 18h.01M12 18h.01" strokeWidth={2} />
  </Glyph>
);

/* ─── Security controls (drawn large, 40px) ──────────────────── */

/** Encrypted in transit and at rest: a lock over a data stream. */
export const IconEncrypted: Icon = (p) => (
  <Glyph {...p}>
    <rect x="6" y="10" width="12" height="9" rx="2" />
    <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
    <path d="M12 13.5v2" />
    <path d="M2.5 21h3M9 21h6M18.5 21h3" />
  </Glyph>
);

/** Access by project: two people inside a folder outline. */
export const IconProjectAccess: Icon = (p) => (
  <Glyph {...p}>
    <path d="M3.5 7.5v10a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-6.5l-2-2.5H5.5a2 2 0 0 0-2 2z" />
    <circle cx="10" cy="12" r="1.75" />
    <circle cx="15" cy="12" r="1.75" />
    <path d="M7.25 17a2.75 2.75 0 0 1 5.5 0M12.25 17a2.75 2.75 0 0 1 5.5 0" />
  </Glyph>
);

/** Append-only activity log: entries with a clock. */
export const IconActivityLog: Icon = (p) => (
  <Glyph {...p}>
    <path d="M4 5.5h9M4 10h7M4 14.5h5M4 19h9" />
    <circle cx="17" cy="14.5" r="4.5" />
    <path d="M17 12.25v2.25l1.5 1.5" />
  </Glyph>
);

/** Rules, not a model: a ruled checklist. */
export const IconRules: Icon = (p) => (
  <Glyph {...p}>
    <rect x="4" y="3.5" width="16" height="17" rx="2" />
    <path d="m7.5 8.5 1.25 1.25 2.25-2.5M7.5 14.5l1.25 1.25 2.25-2.5" />
    <path d="M13.5 9h3M13.5 15h3" />
  </Glyph>
);

/* ─── Lifecycle stages ────────────────────────────────────────── */

/** Negotiate: arrows passing back and forth. */
export const IconNegotiate: Icon = (p) => (
  <Glyph {...p}>
    <path d="M4 8.5h13M14 5l3.5 3.5L14 12" />
    <path d="M20 15.5H7M10 12l-3.5 3.5L10 19" />
  </Glyph>
);

/** Approve: a seal with a tick. */
export const IconApprove: Icon = (p) => (
  <Glyph {...p}>
    <path d="m12 3 2.1 1.5 2.6-.1.8 2.5 2.1 1.5-.8 2.5.8 2.5-2.1 1.5-.8 2.5-2.6-.1L12 21l-2.1-1.5-2.6.1-.8-2.5-2.1-1.5.8-2.5-.8-2.5 2.1-1.5.8-2.5 2.6.1z" />
    <path d="m9 12 2 2 4-4" />
  </Glyph>
);

/** Sign: a pen on a signature line. */
export const IconSign: Icon = (p) => (
  <Glyph {...p}>
    <path d="M14.5 4.5 19.5 9.5 10 19H5v-5z" />
    <path d="m12.5 6.5 5 5" />
    <path d="M13 20.5h7" />
  </Glyph>
);

/** Obligations: a calendar with a due mark. */
export const IconCalendar: Icon = (p) => (
  <Glyph {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
    <path d="m9.5 15 1.75 1.75L14.5 13.5" />
  </Glyph>
);

/** Renew: a circular arrow. */
export const IconRenew: Icon = (p) => (
  <Glyph {...p}>
    <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
    <path d="M19.5 4.5v4.25h-4.25" />
  </Glyph>
);
