// Layout primitives. They remove class noise, not flexibility: each one is a
// plain element with the system's spacing baked in and `className` open.

import * as React from "react";
import { cn } from "@/lib/utils";

/* ─── Page ───────────────────────────────────────────────────────── */

export type PageProps = React.ComponentProps<"div"> & {
  /** The page header. Pass `<PageHeader>` (components/PageHeader) or `<PageIntro>`. */
  header?: React.ReactNode;
  /** Narrow pages (settings forms, a single document) cap the body at 960px. */
  width?: "full" | "narrow";
};

/**
 * The page frame: an optional full-bleed header, then the body in the app
 * container (1480px max, 16→32px gutter) with the section rhythm (24/32px).
 */
export function Page({ header, width = "full", className, children, ...props }: PageProps) {
  return (
    <div className="min-w-0" {...props}>
      {header}
      <div
        className={cn(
          "app-container flex flex-col gap-6 py-6 md:gap-8 md:py-8",
          width === "narrow" && "max-w-[960px]",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export type PageIntroProps = Omit<React.ComponentProps<"header">, "title"> & {
  title: React.ReactNode;
  /** One sentence that answers the page's question. */
  description?: React.ReactNode;
  /** Primary + secondary actions. Keep one primary action per view. */
  actions?: React.ReactNode;
  /** Meta row under the title (LastUpdated, filters summary). */
  meta?: React.ReactNode;
};

/** A lightweight in-body page heading (no band), for pages that do not use PageHeader. */
export function PageIntro({ title, description, actions, meta, className, ...props }: PageIntroProps) {
  return (
    <header className={cn("flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between", className)} {...props}>
      <div className="flex min-w-0 flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-fg-primary text-balance">{title}</h1>
        {description && <p className="max-w-prose-ds text-body-lg text-fg-secondary">{description}</p>}
        {meta && <div className="mt-1">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:pt-1">{actions}</div>}
    </header>
  );
}

/* ─── PageSection ────────────────────────────────────────────────── */

export type PageSectionProps = Omit<React.ComponentProps<"section">, "title"> & {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Section-level actions (a link to the full list, an export). */
  actions?: React.ReactNode;
  /** `card`: bordered raised surface. `plain`: heading over open canvas. */
  variant?: "plain" | "card";
  /** Card body without padding, for edge-to-edge tables and lists. */
  flush?: boolean;
  /** Heading level for the title (default h2). */
  as?: "h2" | "h3";
};

/**
 * A titled block of a page. One question per section: the title states it,
 * the description answers it in a sentence, the body shows the evidence.
 */
export function PageSection({
  title,
  description,
  actions,
  variant = "plain",
  flush = false,
  as: Heading = "h2",
  className,
  children,
  id,
  ...props
}: PageSectionProps) {
  const autoId = React.useId();
  const headingId = title ? `${id ?? autoId}-title` : undefined;
  const isCard = variant === "card";
  const hasHeader = Boolean(title || description || actions);

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        "min-w-0 scroll-mt-24",
        isCard && "overflow-hidden rounded-container border border-border-default bg-surface-raised shadow-raised",
        className,
      )}
      {...props}
    >
      {hasHeader && (
        <div
          className={cn(
            "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
            isCard ? "border-b border-border-subtle px-4 py-4 sm:px-5" : "mb-4",
          )}
        >
          <div className="min-w-0">
            {title && (
              <Heading id={headingId} className="text-body-lg font-semibold tracking-tight text-fg-primary">
                {title}
              </Heading>
            )}
            {description && <p className="mt-1 max-w-prose-ds text-body text-fg-secondary">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn(isCard && !flush && "p-4 sm:p-5")}>{children}</div>
    </section>
  );
}

/* ─── Grid / Stack / Inline ──────────────────────────────────────── */

const GRID_COLS = {
  /** KPI rows: 1 → 2 → 4. */
  kpi: "grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4",
  /** Two equal columns from lg. */
  halves: "grid-cols-1 lg:grid-cols-2",
  /** Three columns from xl, two from md. */
  thirds: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
  /** Asymmetric main + aside (2:1) from lg: the focal block leads. */
  "main-aside": "grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]",
  /** Aside + main (1:2) from lg. */
  "aside-main": "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]",
} as const;

export type GridProps = React.ComponentProps<"div"> & {
  /** A named responsive column recipe. */
  cols?: keyof typeof GRID_COLS;
  /** Gap step on the 4px scale: 3 = 12px, 4 = 16px, 6 = 24px. */
  gap?: 3 | 4 | 6 | 8;
};

const GAP = { 3: "gap-3", 4: "gap-4", 6: "gap-4 md:gap-6", 8: "gap-6 md:gap-8" } as const;

/** Responsive grid with named recipes (kpi, halves, thirds, main-aside, aside-main). */
export function Grid({ cols = "halves", gap = 6, className, ...props }: GridProps) {
  return <div className={cn("grid min-w-0", GRID_COLS[cols], GAP[gap], className)} {...props} />;
}

export type StackProps = React.ComponentProps<"div"> & { gap?: 1 | 2 | 3 | 4 | 6 | 8 };
const STACK_GAP = { 1: "gap-1", 2: "gap-2", 3: "gap-3", 4: "gap-4", 6: "gap-6", 8: "gap-8" } as const;

/** Vertical flow with one gap step. */
export function Stack({ gap = 4, className, ...props }: StackProps) {
  return <div className={cn("flex min-w-0 flex-col", STACK_GAP[gap], className)} {...props} />;
}

export type InlineProps = React.ComponentProps<"div"> & {
  gap?: 1 | 2 | 3 | 4 | 6;
  /** Cross-axis alignment. */
  align?: "start" | "center" | "baseline" | "end";
  /** Push the last child to the end. */
  justify?: "start" | "between" | "end";
  wrap?: boolean;
};
const ALIGN = { start: "items-start", center: "items-center", baseline: "items-baseline", end: "items-end" } as const;
const JUSTIFY = { start: "justify-start", between: "justify-between", end: "justify-end" } as const;

/** Horizontal flow that wraps by default. */
export function Inline({ gap = 2, align = "center", justify = "start", wrap = true, className, ...props }: InlineProps) {
  return (
    <div
      className={cn("flex min-w-0", wrap && "flex-wrap", STACK_GAP[gap], ALIGN[align], JUSTIFY[justify], className)}
      {...props}
    />
  );
}
