"use client";

import * as React from "react";
import { PageHeader } from "@/components/PageHeader";
import { ComponentGallery } from "./ComponentGallery";
import { ChartGallery } from "./ChartGallery";
import { Foundations } from "./Foundations";
import { GovernExample } from "./GovernExample";

const NAV = [
  { id: "principles", label: "Principles" },
  { id: "colour", label: "Colour" },
  { id: "data-viz-colour", label: "Data-viz colour" },
  { id: "type", label: "Typography" },
  { id: "space", label: "Space and motion" },
  { id: "layout", label: "Layout" },
  { id: "data-display", label: "Data display" },
  { id: "inputs", label: "Inputs" },
  { id: "feedback", label: "Feedback" },
  { id: "charts", label: "Charts" },
  { id: "gov-example", label: "Govern example" },
];

const PRINCIPLES = [
  ["Answer first", "Each view leads with the one number or sentence that answers its question, then the breakdown, then the detail."],
  ["Plain words", "“3 contracts waiting on Legal Affairs for more than 10 days”, never a stage code. Wording comes from lib/govern/labels.ts."],
  ["One primary action", "One filled button per view. Everything else is outline, ghost or a row menu."],
  ["Unknown is not zero", "Missing values print “—” or “No value yet”, are announced as “Not known”, sort last and are counted separately in totals."],
  ["Never colour alone", "Every status carries a word plus a dot, icon, shape or pattern. Red always means blocking or not acceptable."],
  ["Accessible by default", "WCAG 2.1 AA and Section 508: keyboard, visible focus, 4.5:1 text, 3:1 marks, reflow at 320px, text alternatives for every chart."],
] as const;

/** The living reference for components/ds: tokens, components and a Govern composition. */
export function DesignSystemReference() {
  return (
    <div className="min-w-0">
      <PageHeader
        title="Design system"
        subtitle="Tokens, components and patterns for Blue-IQ, rendered live from the code. Use it to pick the right component and to check contrast in either theme."
      />
      <div className="app-container py-6 md:py-8">
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[13rem_minmax(0,1fr)]">
          <nav aria-label="Design system sections" className="min-w-0 xl:sticky xl:top-24 xl:self-start">
            <ul className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1 pb-1 xl:flex-col xl:overflow-visible">
              {NAV.map((n) => (
                <li key={n.id} className="shrink-0">
                  <a
                    href={`#${n.id}`}
                    className="flex h-10 items-center rounded-control px-3 text-body font-medium whitespace-nowrap text-fg-secondary transition-colors duration-(--duration-instant) hover:bg-surface-hover hover:text-fg-primary xl:h-9"
                  >
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex min-w-0 flex-col gap-14">
            <section id="principles" aria-labelledby="principles-title" className="scroll-mt-24">
              <h2 id="principles-title" className="text-title font-semibold tracking-tight text-fg-primary">Principles</h2>
              <p className="mt-1.5 max-w-prose-ds text-body-lg text-fg-secondary">
                Built for leaders who are not technical and reviewers who live in tables. Clarity beats decoration.
              </p>
              <ol className="mt-6 grid grid-cols-1 gap-x-10 gap-y-5 md:grid-cols-2">
                {PRINCIPLES.map(([title, body], i) => (
                  <li key={title} className="flex gap-4 border-t border-border-default pt-4">
                    <span className="font-mono text-caption font-semibold text-fg-tertiary tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h3 className="text-body-lg font-semibold text-fg-primary">{title}</h3>
                      <p className="mt-1 text-body text-fg-secondary">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
            <Foundations />
            <ComponentGallery />
            <ChartGallery />
            <GovernExample />
          </div>
        </div>
      </div>
    </div>
  );
}
