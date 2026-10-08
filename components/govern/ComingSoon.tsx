"use client";

// How a "Later" feature shows up while it is switched off (lib/govern/features.ts):
// a small neutral pill, a short panel saying what it will do, or a button that
// looks like the real one but does nothing. No fake data, no dead controls.

import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GOVERN_FEATURE_LABEL, type GovernFeature } from "@/lib/govern/features";
import { useGovernFeature } from "@/lib/govern/queries";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Hourglass } from "@/components/ui/icons";

export const COMING_SOON = "Coming soon";

export function ComingSoonBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-full border border-border bg-[var(--ink-100)] px-2 text-xs font-semibold whitespace-nowrap text-[var(--ink-700)]",
        className,
      )}
    >
      {COMING_SOON}
    </span>
  );
}

/** The badge, shown only while `feature` is switched off (server answer first, then the build list). */
export function FeatureComingSoonBadge({ feature, className }: { feature: GovernFeature; className?: string }) {
  const isOn = useGovernFeature(feature);
  return isOn ? null : <ComingSoonBadge className={className} />;
}

/** A section placeholder: the feature's name, one sentence of what it will do, and the badge.
 *  Pass `feature` to use the registry's wording, or `title`/`description` to override it. */
export function ComingSoonPanel({
  feature, title, description, children, className,
}: {
  feature?: GovernFeature;
  title?: string;
  description?: string;
  /** Optional illustration under the text (e.g. a "Planned" diagram). */
  children?: ReactNode;
  className?: string;
}) {
  const label = feature ? GOVERN_FEATURE_LABEL[feature] : null;
  const heading = title ?? label?.title ?? COMING_SOON;
  const body = description ?? label?.description;
  return (
    <section
      aria-label={`${heading} — ${COMING_SOON.toLowerCase()}`}
      className={cn("rounded-xl border border-dashed border-border bg-[var(--panel)] px-5 py-5", className)}
    >
      <div className="flex items-start gap-3">
        <Hourglass size={16} className="mt-1 shrink-0 text-[var(--ink-500)]" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{heading}</h2>
            <ComingSoonBadge />
          </div>
          {body && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--ink-700)]">{body}</p>}
        </div>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}

/** Looks like the button it stands in for, stays focusable so the tooltip is
 *  reachable by keyboard, and does nothing when pressed. */
export function ComingSoonButton({
  children, className, ...props
}: Omit<ComponentProps<typeof Button>, "onClick" | "disabled" | "asChild">) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          {...props}
          type="button"
          aria-disabled="true"
          onClick={(e) => e.preventDefault()}
          className={cn("cursor-not-allowed border-dashed bg-[var(--ink-50)] text-[var(--ink-600)] hover:bg-[var(--ink-50)] hover:text-[var(--ink-600)]", className)}
        >
          {children}
          <span className="sr-only"> ({COMING_SOON.toLowerCase()})</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{COMING_SOON}</TooltipContent>
    </Tooltip>
  );
}
