import * as React from "react";
import { cn } from "@/lib/utils";

/** A top-level chapter of the reference (anchor target for the side nav). */
export function Chapter({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex min-w-0 scroll-mt-24 flex-col gap-6">
      <header className="border-b border-border-default pb-3">
        <h2 id={`${id}-title`} className="text-title font-semibold tracking-tight text-fg-primary">{title}</h2>
        {intro && <p className="mt-1.5 max-w-prose-ds text-body-lg text-fg-secondary">{intro}</p>}
      </header>
      {children}
    </section>
  );
}

/** One documented item: name, import path, purpose, then live examples. */
export function Specimen({
  name,
  importPath,
  purpose,
  children,
  className,
  bodyClassName,
}: {
  name: string;
  importPath?: string;
  purpose: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const id = `spec-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <article id={id} aria-labelledby={`${id}-title`} className={cn("min-w-0 scroll-mt-24 rounded-container border border-border-default bg-surface-raised", className)}>
      <header className="flex flex-col gap-1 border-b border-border-subtle px-4 py-3 md:px-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 id={`${id}-title`} className="text-body-lg font-semibold text-fg-primary">{name}</h3>
          {importPath && <code className="font-mono text-caption text-fg-tertiary">{importPath}</code>}
        </div>
        <p className="text-body text-fg-secondary">{purpose}</p>
      </header>
      <div className={cn("flex min-w-0 flex-col gap-5 p-4 md:p-5", bodyClassName)}>{children}</div>
    </article>
  );
}

/** A labelled variant/state within a specimen. */
export function Variant({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <p className="text-caption font-semibold tracking-wide text-fg-tertiary uppercase">{label}</p>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** "Example data" marker: every sample figure on this page carries it. */
export function ExampleDataLabel({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-md border border-dashed border-border-control px-2 text-caption font-semibold text-fg-secondary",
        className,
      )}
    >
      <svg viewBox="0 0 12 12" aria-hidden className="size-3" fill="none" stroke="currentColor" strokeWidth="1.4">
        <rect x="1.5" y="1.5" width="9" height="9" rx="1.5" strokeDasharray="2 1.5" />
      </svg>
      Example data
    </span>
  );
}
