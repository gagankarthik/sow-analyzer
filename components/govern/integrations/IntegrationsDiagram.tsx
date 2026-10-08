"use client";

// "Blue IQ integrations at OSU · 4 connected platforms": Govern in the middle,
// the four systems around it, each line coloured by that connection's live
// status. Generic glyphs and words only, no product logos. Below `sm` the
// drawing would be too small to read, so the same facts show as a list.

import { cn } from "@/lib/utils";
import type { Connector, ConnectorId } from "@/lib/govern/types";
import { CONNECTOR_FLOW, CONNECTOR_NAME, STATUS_LABEL } from "./meta";

type Status = Connector["status"] | "unknown";

const EDGE_CLASS: Record<Status, string> = {
  connected: "stroke-[var(--success)]",
  error: "stroke-[var(--danger)]",
  not_connected: "stroke-[var(--ink-400)]",
  unknown: "stroke-[var(--ink-300)]",
};
const DOT_CLASS: Record<Status, string> = {
  connected: "fill-[var(--success)]",
  error: "fill-[var(--danger)]",
  not_connected: "fill-[var(--ink-400)]",
  unknown: "fill-[var(--ink-300)]",
};
const DOT_BG: Record<Status, string> = {
  connected: "bg-[var(--success)]",
  error: "bg-[var(--danger)]",
  not_connected: "bg-[var(--ink-400)]",
  unknown: "bg-[var(--ink-300)]",
};
const liveStatusText = (s: Status) => (s === "unknown" ? "Not set up" : STATUS_LABEL[s]);

// Layout in a 880 × 380 box: two systems on each side, Govern in the middle.
const NODE_W = 290;
const NODE_H = 120;
const NODES: Record<ConnectorId, { x: number; y: number; side: "left" | "right" }> = {
  huron: { x: 10, y: 20, side: "left" },
  workday: { x: 10, y: 240, side: "left" },
  m365: { x: 580, y: 20, side: "right" },
  docusign: { x: 580, y: 240, side: "right" },
};
const HUB = { x: 360, y: 135, w: 160, h: 110 };

/** Both-ways connections get an arrowhead at each end. */
const BOTH_WAYS: Record<ConnectorId, boolean> = { huron: true, workday: false, m365: true, docusign: false };

function edgePath(id: ConnectorId): string {
  const n = NODES[id];
  const top = n.y < HUB.y;
  const ny = n.y + NODE_H / 2;
  const hy = top ? HUB.y + 35 : HUB.y + HUB.h - 35;
  if (n.side === "left") {
    const x1 = n.x + NODE_W;
    const x2 = HUB.x;
    const mid = (x1 + x2) / 2;
    return `M${x1} ${ny} C ${mid} ${ny}, ${mid} ${hy}, ${x2} ${hy}`;
  }
  const x1 = n.x;
  const x2 = HUB.x + HUB.w;
  const mid = (x1 + x2) / 2;
  return `M${x1} ${ny} C ${mid} ${ny}, ${mid} ${hy}, ${x2} ${hy}`;
}

/** Simple line glyphs, 24 × 24, drawn in the node's corner. */
function Glyph({ id }: { id: ConnectorId }) {
  const common = "fill-none stroke-[var(--brand-primary-600)]";
  switch (id) {
    case "huron": // stacked research records
      return (
        <g className={common} strokeWidth={1.6} strokeLinejoin="round">
          <rect x="5" y="3" width="13" height="17" rx="2" />
          <path d="M8 8h7M8 12h7M8 16h4" strokeLinecap="round" />
          <path d="M20 7v14a1 1 0 0 1-1 1H8" strokeLinecap="round" />
        </g>
      );
    case "workday": // ledger / money
      return (
        <g className={common} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18M7 15h3M14 15h3" />
        </g>
      );
    case "m365": // envelope + person
      return (
        <g className={common} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round">
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="m3.5 7 8.5 6 8.5-6" />
        </g>
      );
    case "docusign": // pen on a signature line
      return (
        <g className={common} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round">
          <path d="M4 20h16" />
          <path d="m14.5 4.5 3 3L9 16l-4 1 1-4z" />
        </g>
      );
  }
}

/** `planned` draws the same picture as an illustration of what is coming:
 *  every connection reads "Planned" and no live status is implied. */
export function IntegrationsDiagram({ connectors, planned = false }: { connectors: Connector[] | undefined; planned?: boolean }) {
  const statusOf = (id: ConnectorId): Status => (planned ? "unknown" : connectors?.find((c) => c.id === id)?.status ?? "unknown");
  const statusText = (s: Status) => (planned ? "Planned" : liveStatusText(s));
  const ids = Object.keys(NODES) as ConnectorId[];
  const summary = ids.map((id) => `${CONNECTOR_NAME[id]}: ${statusText(statusOf(id))}`).join("; ");
  const title = planned ? "Planned: Blue IQ integrations at OSU · 4 platforms" : "Blue IQ integrations at OSU · 4 connected platforms";

  return (
    <figure className="min-w-0">
      <svg
        viewBox="0 0 880 380"
        role="img"
        aria-labelledby="int-diagram-title int-diagram-desc"
        className="hidden h-auto w-full sm:block"
      >
        <title id="int-diagram-title">{title}</title>
        <desc id="int-diagram-desc">
          Huron records flow into Govern and findings flow back; Workday and DocuSign feed data in; Microsoft 365 handles
          sign-on, alerts and intake. {planned ? "Planned" : "Current status"} — {summary}.
        </desc>
        <defs>
          {(["connected", "error", "not_connected", "unknown"] as Status[]).map((s) => (
            <marker key={s} id={`int-arrow-${s}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" className={DOT_CLASS[s]} />
            </marker>
          ))}
        </defs>

        {/* connections */}
        {ids.map((id) => {
          const s = statusOf(id);
          const live = s === "connected" || s === "error";
          // Direction: in = system → Govern. The path is drawn system → hub, so the
          // end marker points into Govern; both-ways adds a start marker.
          return (
            <path
              key={`edge-${id}`}
              d={edgePath(id)}
              className={cn("fill-none", EDGE_CLASS[s])}
              strokeWidth={live ? 2.5 : 2}
              strokeDasharray={live ? undefined : "6 5"}
              markerEnd={`url(#int-arrow-${s})`}
              markerStart={BOTH_WAYS[id] ? `url(#int-arrow-${s})` : undefined}
            />
          );
        })}

        {/* hub */}
        <g>
          <rect x={HUB.x} y={HUB.y} width={HUB.w} height={HUB.h} rx="14" className="fill-[var(--navy-800)]" />
          <text x={HUB.x + HUB.w / 2} y={HUB.y + 44} textAnchor="middle" className="fill-white text-[20px] font-semibold">Govern</text>
          <text x={HUB.x + HUB.w / 2} y={HUB.y + 68} textAnchor="middle" className="fill-[var(--navy-100)] text-[12px]">Sonar checks every</text>
          <text x={HUB.x + HUB.w / 2} y={HUB.y + 84} textAnchor="middle" className="fill-[var(--navy-100)] text-[12px]">agreement against</text>
          <text x={HUB.x + HUB.w / 2} y={HUB.y + 100} textAnchor="middle" className="fill-[var(--navy-100)] text-[12px]">OSU&apos;s matrix</text>
        </g>

        {/* systems */}
        {ids.map((id) => {
          const n = NODES[id];
          const s = statusOf(id);
          const flow = CONNECTOR_FLOW[id];
          return (
            <g key={`node-${id}`}>
              <rect x={n.x} y={n.y} width={NODE_W} height={NODE_H} rx="12" className="fill-[var(--card)] stroke-[var(--ink-200)]" strokeWidth="1" />
              <g transform={`translate(${n.x + 16} ${n.y + 14})`}><Glyph id={id} /></g>
              <text x={n.x + 50} y={n.y + 32} className="fill-[var(--ink-900)] text-[15px] font-semibold">{CONNECTOR_NAME[id]}</text>
              <circle cx={n.x + 22} cy={n.y + 55} r="4.5" className={DOT_CLASS[s]} />
              <text x={n.x + 34} y={n.y + 59} className="fill-[var(--ink-600)] text-[12px]">{statusText(s)}</text>
              <text x={n.x + 16} y={n.y + 84} className="fill-[var(--ink-700)] text-[12px]">
                <tspan className="font-semibold">In</tspan> · {flow.into}
              </text>
              {flow.out && (
                <text x={n.x + 16} y={n.y + 104} className="fill-[var(--ink-700)] text-[12px]">
                  <tspan className="font-semibold">Back</tspan> · {flow.out}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Phone: the same facts as a list. */}
      <ul className="space-y-2 sm:hidden" aria-label={planned ? "Planned platforms" : "Connected platforms"}>
        <li className="rounded-lg bg-[var(--navy-800)] px-3 py-2.5 text-sm text-white">
          <span className="font-semibold">Govern</span> sits in the middle: Sonar checks every agreement against OSU&apos;s matrix.
        </li>
        {ids.map((id) => {
          const s = statusOf(id);
          const flow = CONNECTOR_FLOW[id];
          return (
            <li key={id} className="rounded-lg border border-border bg-card px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">{CONNECTOR_NAME[id]}</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-600)]">
                  <span aria-hidden className={cn("h-2 w-2 rounded-full", DOT_BG[s])} />
                  {statusText(s)}
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--ink-700)]"><span className="font-semibold">In</span> · {flow.into}</p>
              {flow.out && <p className="text-sm text-[var(--ink-700)]"><span className="font-semibold">Back</span> · {flow.out}</p>}
            </li>
          );
        })}
      </ul>

      <figcaption className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--ink-600)]">
        {!planned && <LegendItem className="border-[var(--success)]" label="Connected" />}
        {!planned && <LegendItem className="border-[var(--danger)]" label="Needs attention" />}
        <LegendItem className="border-dashed border-[var(--ink-400)]" label={planned ? "Planned (designed, not live)" : "Not connected yet (designed, not live)"} />
        <span>Arrow into Govern = data comes in; arrow at both ends = data goes back too.</span>
      </figcaption>
    </figure>
  );
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className={cn("w-6 border-t-[2.5px]", className)} />
      {label}
    </span>
  );
}
