import type { ReactNode, SVGProps } from "react";

/* Icons drawn for the home page's security figures, where the stock set has
   no shape for "isolated tenant" or "never used for training". Same grid
   and weight as the app's icons: 24px viewBox, 1.75 stroke, round joins,
   currentColor, decorative only. */

type IconProps = Omit<SVGProps<SVGSVGElement>, "children">;

function Frame({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** A document sealed behind a padlock: encrypted at rest. */
export function IconAtRest(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M6 3h7l4 4v4" />
      <path d="M13 3v4h4" />
      <path d="M6 3v17h6" />
      <rect x="13" y="15" width="8" height="6" rx="1.5" />
      <path d="M15 15v-2a2 2 0 0 1 4 0v2" />
    </Frame>
  );
}

/** Two endpoints with a locked channel between them: encrypted in transit. */
export function IconInTransit(props: IconProps) {
  return (
    <Frame {...props}>
      <rect x="2" y="9" width="5" height="6" rx="1.5" />
      <rect x="17" y="9" width="5" height="6" rx="1.5" />
      <path d="M7 12h2.5" />
      <path d="M14.5 12H17" />
      <rect x="9.5" y="10" width="5" height="4" rx="1" />
      <path d="M10.75 10V9a1.25 1.25 0 0 1 2.5 0v1" />
    </Frame>
  );
}

/** Three workspaces, each walled off, one highlighted: tenant isolation. */
export function IconIsolated(props: IconProps) {
  return (
    <Frame {...props}>
      <rect x="2.5" y="4" width="8" height="7" rx="1.5" />
      <rect x="13.5" y="4" width="8" height="7" rx="1.5" />
      <rect x="2.5" y="13" width="8" height="7" rx="1.5" />
      <rect x="13.5" y="13" width="8" height="7" rx="1.5" strokeDasharray="2 2" />
      <path d="M5.5 7.5h2" />
    </Frame>
  );
}

/** A document kept out of a model, crossed through: never used for training. */
export function IconNoTraining(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M4 3h6l3 3v6" />
      <path d="M4 3v15h5" />
      <circle cx="17" cy="16" r="4.5" />
      <path d="M17 13.5v1.5" />
      <path d="M14.75 17.25 16 16.5" />
      <path d="M19.25 17.25 18 16.5" />
      <path d="M3 21 21 3" />
    </Frame>
  );
}
