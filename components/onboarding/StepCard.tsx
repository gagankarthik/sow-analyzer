import type { ReactNode } from "react";

/** The id the flow focuses when the step changes. */
export const STEP_TITLE_ID = "onboarding-step-title";

/** Shared frame for one setup step: heading, lead, body, and a footer row
 *  that holds Back on the left and the step's one primary action on the right. */
export function StepCard({
  title,
  lead,
  children,
  footer,
}: {
  title: string;
  lead?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section aria-labelledby={STEP_TITLE_ID} className="rounded-xl border border-border bg-card p-4 md:p-6">
      <h2
        id={STEP_TITLE_ID}
        tabIndex={-1}
        className="text-lg font-semibold text-foreground focus:outline-none"
      >
        {title}
      </h2>
      {lead && <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-[var(--ink-600)]">{lead}</p>}
      {children && <div className="mt-4">{children}</div>}
      {footer && (
        <div className="mt-4 flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          {footer}
        </div>
      )}
    </section>
  );
}
