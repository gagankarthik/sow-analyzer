import * as React from "react";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────
   StatePanel — the one layout for "there is nothing to show here":
   404s, error boundaries and full-page empty states. A drawing, a
   plain title, one sentence on what to do, then the actions.
   ────────────────────────────────────────────────────────────── */

type Art = "missing" | "error" | "empty";

export function StatePanel({
  art = "empty",
  title,
  description,
  detail,
  children,
  className,
}: {
  art?: Art;
  title: string;
  description?: React.ReactNode;
  /** Small technical line (error message, reference code). */
  detail?: React.ReactNode;
  /** Action buttons. */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-5 py-16 text-center md:py-24", className)}>
      <StateArt art={art} />
      <h1 className="text-2xl font-semibold mt-8 tracking-[-0.02em] text-foreground">{title}</h1>
      {description && (
        <p className="mt-3 max-w-md text-base leading-relaxed text-[var(--ink-600)]">{description}</p>
      )}
      {detail && (
        <p className="mt-4 max-w-md break-words rounded-lg border border-border bg-muted px-3 py-2 font-mono text-xs text-[var(--ink-600)]">
          {detail}
        </p>
      )}
      {children && <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}

/* A contract page in three states: a clause that is not there (404),
   a page that failed to read (error), and a blank page (empty). */
function StateArt({ art }: { art: Art }) {
  return (
    <svg viewBox="0 0 200 150" className="h-36 w-48" aria-hidden="true">
      {/* page behind */}
      <rect x="62" y="14" width="96" height="124" rx="8" className="fill-[var(--ink-100)]" transform="rotate(6 110 76)" />
      {/* page */}
      <rect x="52" y="12" width="96" height="124" rx="8" className="fill-card stroke-[var(--ink-300)]" strokeWidth="1.5" />
      <rect x="64" y="28" width="44" height="6" rx="3" className="fill-[var(--ink-300)]" />

      {art === "missing" && (
        <>
          <rect x="64" y="46" width="72" height="5" rx="2.5" className="fill-[var(--ink-200)]" />
          <rect x="64" y="58" width="72" height="24" rx="5" className="fill-[var(--navy-50)] stroke-[var(--navy-300)]" strokeWidth="1.5" strokeDasharray="4 4" />
          <text x="100" y="75" textAnchor="middle" className="fill-[var(--navy-500)] font-mono text-xs font-semibold">
            404
          </text>
          <rect x="64" y="92" width="72" height="5" rx="2.5" className="fill-[var(--ink-200)]" />
          <rect x="64" y="104" width="48" height="5" rx="2.5" className="fill-[var(--ink-200)]" />
        </>
      )}

      {art === "error" && (
        <>
          <rect x="64" y="46" width="72" height="5" rx="2.5" className="fill-[var(--ink-200)]" />
          <rect x="64" y="58" width="60" height="5" rx="2.5" className="fill-[var(--ink-200)]" />
          <rect x="64" y="70" width="72" height="5" rx="2.5" className="fill-[var(--danger-soft)]" />
          <rect x="64" y="82" width="40" height="5" rx="2.5" className="fill-[var(--ink-200)]" />
          <circle cx="140" cy="112" r="20" className="fill-[var(--danger)]" />
          <path d="M140 102v12" className="stroke-white" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="140" cy="121" r="2.2" className="fill-white" />
        </>
      )}

      {art === "empty" && (
        <>
          <rect x="64" y="46" width="72" height="5" rx="2.5" className="fill-[var(--ink-100)]" />
          <rect x="64" y="58" width="72" height="5" rx="2.5" className="fill-[var(--ink-100)]" />
          <rect x="64" y="70" width="52" height="5" rx="2.5" className="fill-[var(--ink-100)]" />
          <circle cx="140" cy="112" r="20" className="fill-[var(--navy-700)]" />
          <path d="M140 103v18M131 112h18" className="stroke-white" strokeWidth="3.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
