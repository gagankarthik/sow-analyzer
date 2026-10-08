"use client";

// Foundations: every token, rendered from the live CSS so what you see is
// what ships. Colour values and contrast ratios are computed in the current
// theme (toggle dark mode and they update).

import * as React from "react";
import { cn } from "@/lib/utils";
import { contrastRatio, toHex, wcagLevel } from "@/components/ds/contrast";
import { OutcomeBadge, type Outcome } from "@/components/ds/OutcomeBadge";
import { StatusPill } from "@/components/ds/StatusPill";
import { Chapter, Specimen } from "./Specimen";
import { useResolvedColors } from "./useResolvedColors";

/* ─── Colour roles ───────────────────────────────────────────────── */

type SwatchDef = { name: string; use: string };
type SwatchGroup = { title: string; note?: string; against: string; items: SwatchDef[] };

const COLOR_GROUPS: SwatchGroup[] = [
  {
    title: "Navy (secondary, 30%)",
    against: "--surface-raised",
    note: "Structure: sidebar, header bands, section headings, dark panels, primary chart series. Ratio shown on a white card.",
    items: [
      { name: "--navy-50", use: "Structure tint (chips, quotes)" },
      { name: "--navy-200", use: "Structure borders" },
      { name: "--navy-300", use: "Comparison series" },
      { name: "--navy-500", use: "Sonar ink" },
      { name: "--navy-600", use: "Text on navy tint" },
      { name: "--navy-800", use: "Sidebar, bands, primary series" },
    ],
  },
  {
    title: "Surfaces",
    against: "--fg-primary",
    note: "Ratio shown: primary text on the surface.",
    items: [
      { name: "--surface-canvas", use: "Page background" },
      { name: "--surface-raised", use: "Cards, tables, sections" },
      { name: "--surface-sunken", use: "Wells, table headers, tracks" },
      { name: "--surface-overlay", use: "Menus, dialogs, tooltips" },
      { name: "--surface-hover", use: "Row and control hover" },
      { name: "--surface-selected", use: "Selected row, active nav" },
    ],
  },
  {
    title: "Text and icons",
    against: "--surface-raised",
    note: "Ratio shown: on the raised surface. Disabled is decorative only.",
    items: [
      { name: "--fg-primary", use: "Headings, values, body" },
      { name: "--fg-secondary", use: "Labels, descriptions" },
      { name: "--fg-tertiary", use: "Meta, captions, unknown values" },
      { name: "--fg-disabled", use: "Disabled controls (never information)" },
      { name: "--fg-link", use: "Links, active tab" },
    ],
  },
  {
    title: "Borders",
    against: "--surface-raised",
    note: "Control borders meet 3:1 (WCAG 1.4.11). Subtle/default/strong separate surfaces that are already distinct.",
    items: [
      { name: "--border-subtle", use: "Dividers inside a surface" },
      { name: "--border-default", use: "Edge of a surface" },
      { name: "--border-strong", use: "Emphasised separators" },
      { name: "--border-control", use: "Inputs, checkboxes, dashed unknown" },
    ],
  },
  {
    title: "Interactive",
    against: "--surface-raised",
    items: [
      { name: "--interactive", use: "Primary button, selected chip" },
      { name: "--interactive-hover", use: "Hover" },
      { name: "--interactive-pressed", use: "Pressed" },
      { name: "--interactive-subtle", use: "Selected background" },
      { name: "--focus", use: "Focus ring (2px, 2px offset)" },
    ],
  },
  {
    title: "Status meanings",
    against: "--surface-raised",
    note: "Marks (dots, bars). Text uses the -fg step on the -soft fill; see the contrast table.",
    items: [
      { name: "--status-ok", use: "Healthy, within matrix, on time" },
      { name: "--status-acceptable", use: "Acceptable but not ideal" },
      { name: "--status-caution", use: "Attention, running late" },
      { name: "--status-blocked", use: "Blocking, overdue, not acceptable" },
      { name: "--status-unknown", use: "Unknown, not assessed, no value yet" },
    ],
  },
  {
    title: "Sonar and tenant",
    against: "--surface-raised",
    items: [
      { name: "--ai-ink", use: "Found by Sonar (text, mark)" },
      { name: "--ai-surface", use: "Sonar surface" },
      { name: "--structure-soft", use: "Navy emphasis that is not an action" },
      { name: "--tenant-brand", use: "Tenant header band only" },
    ],
  },
];

/* ─── Contrast pairs ─────────────────────────────────────────────── */

type Pair = { fg: string; bg: string; use: "text" | "graphic" | "decorative"; label: string };

const PAIRS: Pair[] = [
  { fg: "--fg-primary", bg: "--surface-raised", use: "text", label: "Primary text on card" },
  { fg: "--fg-primary", bg: "--surface-canvas", use: "text", label: "Primary text on page" },
  { fg: "--fg-secondary", bg: "--surface-raised", use: "text", label: "Secondary text on card" },
  { fg: "--fg-secondary", bg: "--surface-sunken", use: "text", label: "Secondary text in a well / table header" },
  { fg: "--fg-tertiary", bg: "--surface-raised", use: "text", label: "Tertiary text on card" },
  { fg: "--fg-tertiary", bg: "--surface-canvas", use: "text", label: "Tertiary text on page" },
  { fg: "--fg-tertiary", bg: "--surface-sunken", use: "text", label: "Tertiary text in a well" },
  { fg: "--fg-link", bg: "--surface-raised", use: "text", label: "Link on card" },
  { fg: "--fg-link", bg: "--surface-selected", use: "text", label: "Active item on selected background" },
  { fg: "--fg-on-interactive", bg: "--interactive", use: "text", label: "Primary button label (teal)" },
  { fg: "--interactive", bg: "--surface-raised", use: "text", label: "Teal link on card" },
  { fg: "--interactive", bg: "--surface-canvas", use: "text", label: "Teal link on page" },
  { fg: "--structure-fg", bg: "--structure", use: "text", label: "White on navy band" },
  { fg: "--structure-soft-fg", bg: "--structure-soft", use: "text", label: "Navy chip (You hold it)" },
  { fg: "--sidebar-foreground", bg: "--sidebar", use: "text", label: "Sidebar item on navy" },
  { fg: "--sidebar-primary-foreground", bg: "--sidebar-primary", use: "text", label: "Active sidebar item (teal-300 pill)" },
  { fg: "--sidebar-primary", bg: "--sidebar", use: "graphic", label: "Active pill against the navy sidebar" },
  { fg: "--status-ok-fg", bg: "--status-ok-soft", use: "text", label: "OK pill" },
  { fg: "--status-acceptable-fg", bg: "--status-acceptable-soft", use: "text", label: "Acceptable pill" },
  { fg: "--status-caution-fg", bg: "--status-caution-soft", use: "text", label: "Caution pill" },
  { fg: "--status-blocked-fg", bg: "--status-blocked-soft", use: "text", label: "Blocked pill" },
  { fg: "--status-unknown-fg", bg: "--status-unknown-soft", use: "text", label: "Unknown pill" },
  { fg: "--status-ok-fg", bg: "--surface-raised", use: "text", label: "OK text on card" },
  { fg: "--status-caution-fg", bg: "--surface-raised", use: "text", label: "Caution text on card" },
  { fg: "--status-blocked-fg", bg: "--surface-raised", use: "text", label: "Blocked text on card" },
  { fg: "--outcome-beneficial-fg", bg: "--surface-raised", use: "text", label: "Favours you badge (success outline)" },
  { fg: "--outcome-missing-fg", bg: "--surface-raised", use: "text", label: "Missing badge (dashed)" },
  { fg: "--ai-ink", bg: "--ai-surface", use: "text", label: "Sonar text on Sonar surface" },
  { fg: "--tenant-brand-fg", bg: "--tenant-brand", use: "text", label: "Tenant header text" },
  { fg: "--focus", bg: "--surface-raised", use: "graphic", label: "Focus ring on card" },
  { fg: "--focus", bg: "--surface-canvas", use: "graphic", label: "Focus ring on page" },
  { fg: "--border-control", bg: "--surface-raised", use: "graphic", label: "Input border on card" },
  { fg: "--status-ok", bg: "--surface-raised", use: "graphic", label: "OK mark" },
  { fg: "--status-acceptable", bg: "--surface-raised", use: "graphic", label: "Acceptable mark" },
  { fg: "--status-caution", bg: "--surface-raised", use: "graphic", label: "Caution mark" },
  { fg: "--status-blocked", bg: "--surface-raised", use: "graphic", label: "Blocked mark" },
  { fg: "--status-unknown", bg: "--surface-raised", use: "graphic", label: "Unknown mark (always with a word)" },
  { fg: "--border-default", bg: "--surface-canvas", use: "decorative", label: "Card edge on page (surfaces already differ)" },
  { fg: "--fg-disabled", bg: "--surface-raised", use: "decorative", label: "Disabled label (exempt, WCAG 1.4.3)" },
];

const VIZ_CAT = ["--viz-cat-1", "--viz-cat-2", "--viz-cat-3", "--viz-cat-4", "--viz-cat-5", "--viz-cat-6", "--viz-cat-7", "--viz-cat-8"];
const VIZ_SEQ = ["--viz-seq-1", "--viz-seq-2", "--viz-seq-3", "--viz-seq-4", "--viz-seq-5", "--viz-seq-6", "--viz-seq-7"];
const VIZ_DIV = ["--viz-div-neg-3", "--viz-div-neg-2", "--viz-div-neg-1", "--viz-div-mid", "--viz-div-pos-1", "--viz-div-pos-2", "--viz-div-pos-3"];

const ALL_VARS: readonly string[] = Array.from(
  new Set([
    ...COLOR_GROUPS.flatMap((g) => [g.against, ...g.items.map((i) => i.name)]),
    ...PAIRS.flatMap((p) => [p.fg, p.bg]),
    ...VIZ_CAT,
    ...VIZ_SEQ,
    ...VIZ_DIV,
    "--viz-surface",
  ]),
);

function Ratio({ value, use }: { value: number | null; use: Pair["use"] }) {
  if (value === null) return <span className="text-fg-tertiary">…</span>;
  const level = use === "decorative" ? "n/a" : wcagLevel(value, use === "text" ? "text" : "graphic");
  return (
    <span className="inline-flex items-center gap-2 tabular-nums">
      <span className="font-semibold text-fg-primary">{value.toFixed(2)}:1</span>
      <StatusPill size="sm" tone={level === "Fail" ? "blocked" : level === "n/a" ? "unknown" : "ok"}>
        {level === "n/a" ? "Exempt" : level}
      </StatusPill>
    </span>
  );
}

function ColorSwatch({ name, use, ratio, hex }: { name: string; use: string; ratio: number | null; hex: string | null }) {
  return (
    <li className="flex min-w-0 items-center gap-3 rounded-lg border border-border-subtle p-2">
      <svg aria-hidden viewBox="0 0 40 40" className="size-10 shrink-0 rounded-md">
        <rect width="40" height="40" rx="6" fill={`var(${name})`} stroke="var(--border-default)" />
      </svg>
      <div className="min-w-0 flex-1">
        <code className="block truncate font-mono text-caption font-semibold text-fg-primary">{name}</code>
        <p className="truncate text-caption text-fg-secondary">{use}</p>
      </div>
      <div className="shrink-0 text-end text-caption">
        <div className="font-mono text-fg-tertiary">{hex ?? "…"}</div>
        <div className="font-semibold tabular-nums text-fg-primary">{ratio === null ? "…" : `${ratio.toFixed(2)}:1`}</div>
      </div>
    </li>
  );
}

export function Foundations() {
  const colors = useResolvedColors(ALL_VARS);
  const ratio = (fg: string, bg: string) => (colors?.[fg] && colors?.[bg] ? contrastRatio(colors[fg], colors[bg]) : null);
  const hex = (v: string) => (colors?.[v] ? toHex(colors[v]) : null);

  return (
    <>
      <Chapter
        id="colour"
        title="Colour"
        intro="Semantic roles over the primitive ramps. Components ask for a role (secondary text, raised surface, caution), never a hue. Values and ratios below are computed live in the current theme."
      >
        <Specimen
          name="60 · 30 · 10"
          purpose="Navy & Teal. Warm white dominates; navy gives structure; teal is the accent for actions only. If a screen looks teal, something decorative is using the accent."
        >
          <svg role="img" aria-label="Colour proportions: 60% warm white, 30% navy, 10% teal" viewBox="0 0 100 12" preserveAspectRatio="none" className="block h-12 w-full overflow-hidden rounded-lg border border-border-default">
            <rect x="0" width="60" height="12" fill="var(--surface-canvas)" />
            <rect x="60" width="30" height="12" fill="var(--navy-800)" />
            <rect x="90" width="10" height="12" fill="var(--brand-primary-600)" />
          </svg>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(
              [
                ["60% dominant", "Warm white canvas #F8F7F4, white cards, warm neutrals", "Page, cards, tables. Body text 16.06:1 on canvas."],
                ["30% secondary", "Navy #14213D and its ramp", "Sidebar, header bands, section headings, dark panels, primary chart series. White on navy 15.97:1."],
                ["10% accent", "Teal #0F766E and its ramp", "Primary buttons, links, focus, active nav, selected tab. White on teal 5.47:1; teal on white 5.47:1."],
              ] as const
            ).map(([role, colour, use]) => (
              <div key={role} className="flex flex-col gap-1 border-t border-border-default pt-3">
                <dt className="text-body font-semibold text-fg-primary">{role}</dt>
                <dd className="text-caption text-fg-secondary">{colour}</dd>
                <dd className="text-caption text-fg-tertiary">{use}</dd>
              </div>
            ))}
          </dl>
        </Specimen>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {COLOR_GROUPS.map((g) => (
            <Specimen key={g.title} name={g.title} purpose={g.note ?? `Ratio shown against ${g.against}.`}>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {g.items.map((it) => (
                  <ColorSwatch
                    key={it.name}
                    name={it.name}
                    use={it.use}
                    hex={hex(it.name)}
                    ratio={g.title === "Surfaces" ? ratio(g.against, it.name) : ratio(it.name, g.against)}
                  />
                ))}
              </ul>
            </Specimen>
          ))}
        </div>

        <Specimen
          name="Meaning of colour"
          purpose="One meaning per colour, everywhere. Every status ships with a word and a dot, icon or pattern; colour is never the only signal."
        >
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Colour meanings (scrollable)">
            <table className="w-full min-w-[40rem] text-body">
              <caption className="sr-only">Colour meanings</caption>
              <thead>
                <tr className="text-caption text-fg-secondary">
                  <th scope="col" className="py-2 pe-4 text-start font-semibold">Meaning</th>
                  <th scope="col" className="py-2 pe-4 text-start font-semibold">Token</th>
                  <th scope="col" className="py-2 pe-4 text-start font-semibold">Example</th>
                  <th scope="col" className="py-2 text-start font-semibold">Used for</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {(
                  [
                    ["Healthy", "--status-ok", <StatusPill key="a" tone="ok">On time</StatusPill>, "Within tier, on-track SLA, signed value"],
                    ["Acceptable", "--status-acceptable", <StatusPill key="b" tone="acceptable">Acceptable fallback</StatusPill>, "Fallback tier, informational"],
                    ["Attention", "--status-caution", <StatusPill key="c" tone="caution">Running late</StatusPill>, "Deviates tier, amber SLA, held-up value"],
                    ["Blocking", "--status-blocked", <StatusPill key="d" tone="blocked">Overdue</StatusPill>, "Unacceptable tier, red SLA, rejected"],
                    ["Unknown", "--status-unknown", <StatusPill key="e" tone="unknown" dashed>No value yet</StatusPill>, "No value, no target, check by hand, missing"],
                    ["Action (teal accent)", "--interactive", <span key="f" className="text-body font-medium text-fg-link underline">Open contract</span>, "Primary buttons, links, focus, selected"],
                    ["You hold it (navy)", "--structure-soft", <StatusPill key="f2" tone="brand">Reviewer</StatusPill>, "Emphasis that is not an action"],
                    ["Sonar provenance", "--ai-ink", <StatusPill key="g" tone="ai">Found by Sonar</StatusPill>, "Found-by-Sonar marks only"],
                  ] as const
                ).map(([meaning, token, example, used]) => (
                  <tr key={token}>
                    <th scope="row" className="py-2.5 pe-4 text-start font-medium text-fg-primary">{meaning}</th>
                    <td className="py-2.5 pe-4"><code className="font-mono text-caption text-fg-secondary">{token}</code></td>
                    <td className="py-2.5 pe-4">{example}</td>
                    <td className="py-2.5 text-fg-secondary">{used}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Specimen>

        <Specimen
          name="Matrix outcomes"
          importPath="@/components/ds › OutcomeBadge"
          purpose="A dedicated set for review results, separate from risk and brand: colour + shape + word. Each shape differs, so the badge reads in greyscale and forced-colours mode."
        >
          <div className="flex flex-wrap gap-2">
            {(["within", "fallback", "deviates", "unacceptable", "review", "missing", "beneficial"] as Outcome[]).map((o) => (
              <OutcomeBadge key={o} outcome={o} />
            ))}
          </div>
        </Specimen>

        <Specimen
          name="Contrast pairs"
          purpose="Every text/background and mark/background pair the system uses, computed now in this theme. Text needs 4.5:1; marks, focus rings and control borders need 3:1."
        >
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Contrast pairs (scrollable)">
            <table className="w-full min-w-[44rem] text-body">
              <caption className="sr-only">Contrast ratios for token pairs in the current theme</caption>
              <thead>
                <tr className="text-caption text-fg-secondary">
                  <th scope="col" className="py-2 pe-4 text-start font-semibold">Pair</th>
                  <th scope="col" className="py-2 pe-4 text-start font-semibold">Foreground</th>
                  <th scope="col" className="py-2 pe-4 text-start font-semibold">Background</th>
                  <th scope="col" className="py-2 pe-4 text-start font-semibold">Sample</th>
                  <th scope="col" className="py-2 text-start font-semibold">Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {PAIRS.map((p) => (
                  <tr key={`${p.fg}-${p.bg}`}>
                    <th scope="row" className="py-2 pe-4 text-start font-normal text-fg-primary">{p.label}</th>
                    <td className="py-2 pe-4"><code className="font-mono text-caption text-fg-secondary">{p.fg}</code></td>
                    <td className="py-2 pe-4"><code className="font-mono text-caption text-fg-secondary">{p.bg}</code></td>
                    <td className="py-2 pe-4">
                      <svg aria-hidden viewBox="0 0 64 24" className="h-6 w-16">
                        <rect width="64" height="24" rx="4" fill={`var(${p.bg})`} stroke="var(--border-default)" />
                        {p.use === "text" ? (
                          <text x="32" y="16" textAnchor="middle" fill={`var(${p.fg})`} className="text-[12px] font-semibold">Aa 12</text>
                        ) : (
                          <rect x="12" y="8" width="40" height="8" rx="2" fill={`var(${p.fg})`} />
                        )}
                      </svg>
                    </td>
                    <td className="py-2"><Ratio value={ratio(p.fg, p.bg)} use={p.use} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Specimen>
      </Chapter>

      <Chapter
        id="data-viz-colour"
        title="Data-visualisation colour"
        intro="Single-series charts use navy (--viz-primary); comparisons navy-300 (--viz-compare); teal (--viz-highlight) marks at most one highlighted series. Categorical for identity (fixed order, never cycled), sequential for magnitude, diverging for polarity around a meaningful zero. Validated with the dataviz palette validator for lightness, chroma, colour-vision-deficiency separation and 3:1 contrast in both themes."
      >
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Specimen name="Categorical (8)" purpose="Assign in order. Past eight series fold into Other. Scatter and small multiples cap at the first three.">
            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {VIZ_CAT.map((v, i) => (
                <li key={v} className="flex min-w-0 flex-col gap-1">
                  <svg aria-hidden viewBox="0 0 80 28" className="h-7 w-full" preserveAspectRatio="none">
                    <rect width="80" height="28" rx="4" fill={`var(${v})`} />
                  </svg>
                  <code className="font-mono text-caption text-fg-primary">{i + 1}. {hex(v) ?? "…"}</code>
                  <span className="text-caption tabular-nums text-fg-tertiary">
                    {ratio(v, "--viz-surface")?.toFixed(2) ?? "…"}:1 on card
                  </span>
                </li>
              ))}
            </ol>
          </Specimen>
          <Specimen name="Hatch patterns" purpose="The colour-blind, print and forced-colours channel. Use on adjacent series that must stay distinct without colour (held up vs potential value).">
            <div className="flex flex-wrap gap-3">
              <span className="ds-hatch h-10 w-24 rounded-md text-viz-cat-1" aria-hidden />
              <span className="ds-hatch-reverse h-10 w-24 rounded-md text-viz-cat-2" aria-hidden />
              <span className="ds-hatch h-10 w-24 rounded-md text-status-caution" aria-hidden />
              <span className="ds-hatch-reverse h-10 w-24 rounded-md text-status-unknown" aria-hidden />
            </div>
            <p className="text-caption text-fg-tertiary">
              CSS: <code className="font-mono">ds-hatch</code> / <code className="font-mono">ds-hatch-reverse</code> with a text colour. SVG: <code className="font-mono">HatchPattern</code> or <code className="font-mono">hatch: true</code> on a chart series.
            </p>
          </Specimen>
          <Specimen name="Sequential" purpose="Navy, light to dark (flips anchor in dark mode). Heatmap cells always print their value.">
            <RampRow vars={VIZ_SEQ} hex={hex} />
          </Specimen>
          <Specimen name="Diverging" purpose="Orange (below) ← warm grey midpoint → navy (above). Equal steps per arm.">
            <RampRow vars={VIZ_DIV} hex={hex} />
          </Specimen>
        </div>
      </Chapter>

      <Chapter id="type" title="Typography" intro="IBM Plex Sans for the interface; IBM Plex Mono for codes and identifiers. Eight steps in rem so browser zoom works. 12px is the minimum.">
        <Specimen name="Type scale" importPath="text-caption … text-display-lg" purpose="Use the role name, never a pixel size. Tight leading on display sizes, comfortable on body.">
          <ul className="flex flex-col divide-y divide-border-subtle">
            {(
              [
                ["text-caption", "12 / 16", "Meta, table headers, pills, axis ticks", "text-caption"],
                ["text-body", "14 / 20", "Default UI and body text", "text-body"],
                ["text-body-lg", "16 / 24", "Lead paragraphs, section titles", "text-body-lg"],
                ["text-title-sm", "20 / 28", "Section headings", "text-title-sm"],
                ["text-title", "24 / 32", "Page titles (mobile), KPI values", "text-title"],
                ["text-headline", "32 / 40", "Page titles (desktop), focal KPI", "text-headline"],
                ["text-display", "40 / 48", "A single hero number", "text-display"],
                ["text-display-lg", "56 / 64", "Empty-canvas hero only", "text-display-lg"],
              ] as const
            ).map(([name, size, use, cls]) => (
              <li key={name} className="grid grid-cols-1 gap-1 py-3 md:grid-cols-[12rem_minmax(0,1fr)] md:items-baseline md:gap-6">
                <div className="flex flex-col">
                  <code className="font-mono text-caption font-semibold text-fg-primary">{name}</code>
                  <span className="text-caption text-fg-tertiary">{size} · {use}</span>
                </div>
                <p className={cn(cls, "min-w-0 truncate font-semibold tracking-tight text-fg-primary")}>38 contracts waiting on your organization</p>
              </li>
            ))}
          </ul>
        </Specimen>
      </Chapter>

      <Chapter id="space" title="Space, radius, elevation" intro="A 4px grid that matches Tailwind's numeric scale exactly. Borders separate surfaces; shadows are reserved for two levels.">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Specimen name="Spacing" importPath="--space-1 … --space-24" purpose="p-4 = --space-4 = 16px. Sections 24/32, cards 16/20, controls 8/12.">
            <ul className="flex flex-col gap-1.5">
              {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24].map((n) => (
                <li key={n} className="grid grid-cols-[6rem_3rem_minmax(0,1fr)] items-center gap-3 text-caption">
                  <code className="font-mono text-fg-primary">--space-{n}</code>
                  <span className="tabular-nums text-fg-tertiary">{n * 4}px</span>
                  <svg aria-hidden height="10" width="100%" className="block">
                    <rect height="10" width={n * 4} rx="2" className="fill-interactive" />
                  </svg>
                </li>
              ))}
            </ul>
          </Specimen>
          <Specimen name="Radius" purpose="Controls 10px, containers 14px, pills full. Nested corners step down one size.">
            <div className="flex flex-wrap gap-4">
              {(
                [
                  ["rounded-sm", "6 · tags"],
                  ["rounded-md", "8 · menus"],
                  ["rounded-control", "10 · controls"],
                  ["rounded-container", "14 · cards"],
                  ["rounded-pill", "full · pills"],
                ] as const
              ).map(([cls, label]) => (
                <div key={cls} className="flex flex-col items-center gap-1.5">
                  <span aria-hidden className={cn("size-16 border-2 border-interactive bg-interactive-subtle", cls)} />
                  <code className="font-mono text-caption text-fg-primary">{cls}</code>
                  <span className="text-caption text-fg-tertiary">{label}</span>
                </div>
              ))}
            </div>
          </Specimen>
          <Specimen name="Elevation" purpose="Border-first. Level 0 flat, level 1 raised card (hairline shadow), level 2 overlays only.">
            <div className="grid grid-cols-1 gap-4 bg-surface-canvas p-4 sm:grid-cols-3">
              <div className="rounded-container border border-border-default bg-surface-raised p-4 text-caption">
                <code className="font-mono font-semibold text-fg-primary">elevation-0</code>
                <p className="text-fg-tertiary">Border only</p>
              </div>
              <div className="rounded-container border border-border-default bg-surface-raised p-4 text-caption shadow-raised">
                <code className="font-mono font-semibold text-fg-primary">shadow-raised</code>
                <p className="text-fg-tertiary">Cards, tiles</p>
              </div>
              <div className="rounded-container border border-border-default bg-surface-overlay p-4 text-caption shadow-overlay">
                <code className="font-mono font-semibold text-fg-primary">shadow-overlay</code>
                <p className="text-fg-tertiary">Menus, dialogs</p>
              </div>
            </div>
          </Specimen>
          <Specimen name="Motion" purpose="Fast and purposeful; every duration collapses to 0 under prefers-reduced-motion. Hover the samples.">
            <ul className="flex flex-col gap-3">
              {(
                [
                  ["--duration-instant", "75ms", "Colour and opacity", "duration-(--duration-instant)"],
                  ["--duration-fast", "150ms", "Most state changes", "duration-(--duration-fast)"],
                  ["--duration-moderate", "200ms", "Panels, popovers", "duration-(--duration-moderate)"],
                  ["--duration-slow", "300ms", "Page reveals, chart entrance", "duration-(--duration-slow)"],
                ] as const
              ).map(([name, ms, use, cls]) => (
                <li key={name} className="group grid grid-cols-[minmax(0,1fr)_6rem] items-center gap-3">
                  <div className="min-w-0 text-caption">
                    <code className="font-mono font-semibold text-fg-primary">{name}</code>
                    <span className="text-fg-tertiary"> · {ms} · {use}</span>
                  </div>
                  <span className="relative block h-6 rounded-pill bg-surface-sunken" aria-hidden>
                    <span className={cn("absolute start-1 top-1 size-4 rounded-full bg-interactive transition-transform ease-enter group-hover:translate-x-[4.25rem] rtl:group-hover:-translate-x-[4.25rem]", cls)} />
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-caption text-fg-tertiary">Easing: <code className="font-mono">ease-enter</code> (things arriving), <code className="font-mono">ease-exit</code> (leaving), <code className="font-mono">ease-standard</code> (moving).</p>
          </Specimen>
          <Specimen name="Layers and breakpoints" purpose="Named z-index layers and the Tailwind breakpoints the components respond to. Tested at 320, 360, 768, 1024 and 1440.">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-caption">
                {(
                  [
                    ["--z-raised", "1"],
                    ["--z-sticky", "20"],
                    ["--z-header", "30"],
                    ["--z-overlay", "40"],
                    ["--z-modal", "50"],
                    ["--z-toast", "60"],
                    ["--z-skip", "100"],
                  ] as const
                ).map(([n, v]) => (
                  <React.Fragment key={n}>
                    <dt><code className="font-mono text-fg-primary">{n}</code></dt>
                    <dd className="text-end tabular-nums text-fg-tertiary">{v}</dd>
                  </React.Fragment>
                ))}
              </dl>
              <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-caption">
                {(
                  [
                    ["sm", "640px"],
                    ["md", "768px · table → cards below"],
                    ["lg", "1024px · P2 columns"],
                    ["xl", "1280px · P3 columns"],
                    ["2xl", "1536px"],
                  ] as const
                ).map(([n, v]) => (
                  <React.Fragment key={n}>
                    <dt><code className="font-mono text-fg-primary">{n}</code></dt>
                    <dd className="text-end text-fg-tertiary">{v}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </div>
          </Specimen>
        </div>
      </Chapter>
    </>
  );
}

function RampRow({ vars, hex }: { vars: string[]; hex: (v: string) => string | null }) {
  return (
    <ol className="grid grid-cols-7 gap-1">
      {vars.map((v) => (
        <li key={v} className="flex min-w-0 flex-col gap-1">
          <svg aria-hidden viewBox="0 0 40 32" className="h-8 w-full" preserveAspectRatio="none">
            <rect width="40" height="32" rx="3" fill={`var(${v})`} />
          </svg>
          <code className="truncate font-mono text-caption text-fg-tertiary" title={v}>{hex(v) ?? "…"}</code>
        </li>
      ))}
    </ol>
  );
}
