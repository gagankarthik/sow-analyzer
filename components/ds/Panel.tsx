// Panels: one bordered card per section (white, 1px border, 8px radius, no
// shadow), a 44px header with an H3 (14px/600) and a right-aligned actions
// slot, then a 16px body. One card per section, never per metric or row:
// inside a panel, separate rows with dividers.
//
// Two explicit variants instead of a `flush` boolean:
//   <Panel>      padded body (text, charts, forms)
//   <ListPanel>  edge-to-edge body for divided lists and tables

import * as React from "react";
import { cn } from "@/lib/utils";

export type PanelProps = Omit<React.ComponentProps<"section">, "title"> & {
  /** The panel title (H3). Plain label, sentence case: "Needs you". */
  title: React.ReactNode;
  /** Short meta beside the title, 12px muted: a count or a freshness note. */
  meta?: React.ReactNode;
  /** Right-aligned header actions: a "See all" link, an icon button, a menu. */
  actions?: React.ReactNode;
  /** A footer row under the body ("Show all 12", totals). */
  footer?: React.ReactNode;
  /** Heading level. Panels are H3 by default; a page with no H2s may use h2. */
  as?: "h2" | "h3";
  bodyClassName?: string;
};

function PanelFrame({
  title,
  meta,
  actions,
  footer,
  as: Heading = "h3",
  className,
  bodyClassName,
  children,
  id,
  padded,
  ...props
}: PanelProps & { padded: boolean }) {
  const autoId = React.useId();
  const headingId = `${id ?? autoId}-title`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        "flex min-w-0 scroll-mt-20 flex-col overflow-hidden rounded-container border border-border-default bg-surface-raised",
        className,
      )}
      {...props}
    >
      <header className="flex min-h-11 min-w-0 items-center justify-between gap-3 border-b border-border-subtle px-4 py-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <Heading id={headingId} className="min-w-0 truncate text-base font-semibold text-fg-primary">
            {title}
          </Heading>
          {meta && <span className="shrink-0 text-caption tabular-nums text-fg-tertiary">{meta}</span>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", padded && "p-4", bodyClassName)}>{children}</div>
      {footer && <div className="border-t border-border-default px-4 py-2.5">{footer}</div>}
    </section>
  );
}

/** A titled panel with a 16px padded body. */
export function Panel(props: PanelProps) {
  return <PanelFrame {...props} padded />;
}

/** A titled panel whose body runs edge to edge, for divided lists and tables. */
export function ListPanel(props: PanelProps) {
  return <PanelFrame {...props} padded={false} />;
}

/** One row of a ListPanel: 16px gutters, hairline divider, optional hover. */
export function PanelRow({ className, ...props }: React.ComponentProps<"li">) {
  return <li className={cn("min-w-0 border-b border-border-subtle px-4 py-2.5 last:border-b-0", className)} {...props} />;
}

/** The quiet "nothing here" line inside a panel body. */
export function PanelEmpty({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("px-4 py-6 text-body text-fg-tertiary", className)}>{children}</p>;
}
