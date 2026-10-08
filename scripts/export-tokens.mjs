#!/usr/bin/env node
// Export the design tokens in app/globals.css as W3C Design Tokens Community
// Group (DTCG) JSON at tokens/tokens.json.
//
// app/globals.css stays the single source of truth: this script only READS
// the CSS custom properties declared in `:root` (light) and `.dark`, sorts
// them into the three tiers (primitive → semantic → component), turns
// `var(--x)` references into DTCG aliases ("{tier.group.name}"), and writes
// the dark value alongside as an extension. Never edit tokens.json by hand.
//
//   node scripts/export-tokens.mjs           write tokens/tokens.json
//   node scripts/export-tokens.mjs --check   exit 1 if tokens.json is stale (CI)

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CSS_PATH = resolve(ROOT, "app/globals.css");
const OUT_PATH = resolve(ROOT, "tokens/tokens.json");

/** Collect `--name: value;` declarations from every top-level block whose selector matches. */
function collect(css, selectorTest) {
  const out = new Map();
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const blockRe = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = blockRe.exec(noComments))) {
    const selector = m[1].split(/[;}]/).pop().trim();
    if (!selectorTest(selector)) continue;
    const declRe = /(--[\w-]+)\s*:\s*([^;]+);/g;
    let d;
    while ((d = declRe.exec(m[2]))) out.set(d[1], d[2].trim().replace(/\s+/g, " "));
  }
  return out;
}

// Tier rules, checked in order. Tier 1 = raw palette and scales, tier 2 =
// roles that point at tier 1, tier 3 = component decisions.
const TIERS = [
  ["component", /^--(target|control-height|pill|table|chart-height|radius-(control|container|pill))\b/],
  ["primitive", /^--(brand-primary-\d+|ink-\d+|paper|paper-elev|panel|navy|risk-\d|shadow-|radius(-(xs|sm|md|lg|xl))?$|text-(xs|sm|base|lg|xl|\dxl)|tracking-|font-|ease-(in|out|in-out)$)/],
  ["primitive", /^--(success|warning|danger|info)(-soft)?$/],
  ["semantic", /^--/],
];

function tierOf(name) {
  for (const [tier, re] of TIERS) if (re.test(name)) return tier;
  return "semantic";
}

/** Group = first segment after the tier ("--viz-cat-1" → viz). */
function groupOf(name) {
  const bare = name.slice(2);
  const known = ["brand-primary", "surface", "fg", "border", "interactive", "status", "outcome", "sla", "viz", "space",
    "elevation", "duration", "ease", "z", "bp", "tenant", "ai", "shadow", "radius", "text", "tracking", "font", "ink",
    "chart", "sidebar", "navy", "risk", "control", "table", "target", "pill", "success", "warning", "danger", "info", "neutral", "structure"];
  return known.find((g) => bare === g || bare.startsWith(`${g}-`)) ?? "base";
}

function typeOf(name, value) {
  if (/^--(duration)/.test(name)) return "duration";
  if (/^--(ease)/.test(name) || /cubic-bezier/.test(value)) return "cubicBezier";
  if (/^--(shadow|elevation)/.test(name)) return "shadow";
  if (/^--font-/.test(name)) return "fontFamily";
  if (/^--z-/.test(name)) return "number";
  if (/^--(space|radius|text|bp|target|control|pill|table|chart-height|tracking)/.test(name)) return "dimension";
  if (/^#|^rgba?\(|^color-mix|^transparent$/.test(value) || /^--(viz|structure|surface|fg|border|interactive|focus|status|outcome|sla|tenant|ai|success|warning|danger|info|neutral|ink|brand|paper|panel|navy|risk|chart|sidebar|background|foreground|card|popover|primary|secondary|muted|accent|destructive|input|ring)/.test(name)) return "color";
  return "string";
}

const light = collect(readFileSync(CSS_PATH, "utf8"), (s) => s === ":root");
const dark = collect(readFileSync(CSS_PATH, "utf8"), (s) => s === ".dark");

function pathOf(name) {
  const tier = tierOf(name);
  const group = groupOf(name);
  const bare = name.slice(2);
  const leaf = group === "base" ? bare : bare === group ? "default" : bare.slice(group.length + 1) || "default";
  return [tier, group, leaf];
}

function toDtcgValue(value) {
  const ref = /^var\((--[\w-]+)\)$/.exec(value);
  if (ref && light.has(ref[1])) return `{${pathOf(ref[1]).join(".")}}`;
  return value;
}

const tree = {};
for (const [name, value] of light) {
  const [tier, group, leaf] = pathOf(name);
  tree[tier] ??= { $description: TIER_DESCRIPTION(tier) };
  tree[tier][group] ??= {};
  const token = { $value: toDtcgValue(value), $type: typeOf(name, value) };
  const ext = { cssVar: name };
  if (dark.has(name) && dark.get(name) !== value) ext.dark = toDtcgValue(dark.get(name));
  token.$extensions = { "com.blue-iq": ext };
  tree[tier][group][leaf] = token;
}

function TIER_DESCRIPTION(tier) {
  return {
    primitive: "Tier 1: raw palette and scales. Never referenced by components/ds directly.",
    semantic: "Tier 2: roles (surface, fg, border, interactive, status, outcome, viz…) that point at primitives.",
    component: "Tier 3: component decisions (target sizes, control heights, table rows, chart heights).",
  }[tier];
}

const output = {
  $description: "Blue-IQ design tokens, generated from app/globals.css by scripts/export-tokens.mjs. Do not edit by hand.",
  ...tree,
};
const json = `${JSON.stringify(output, null, 2)}\n`;

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(OUT_PATH, "utf8");
  } catch {
    /* missing file is stale */
  }
  if (current !== json) {
    console.error("tokens/tokens.json is out of date. Run: node scripts/export-tokens.mjs");
    process.exit(1);
  }
  console.log("tokens/tokens.json is up to date.");
} else {
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, json);
  const counts = Object.fromEntries(
    ["primitive", "semantic", "component"].map((t) => [t, Object.values(tree[t] ?? {}).reduce((n, g) => n + (typeof g === "object" ? Object.keys(g).length : 0), 0)]),
  );
  console.log(`Wrote ${OUT_PATH} (${light.size} tokens: ${JSON.stringify(counts)})`);
}
