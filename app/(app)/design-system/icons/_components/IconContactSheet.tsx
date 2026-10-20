"use client";

import * as React from "react";
import * as Icons from "@/components/ui/icons";
import type { LucideIcon } from "@/components/ui/icons";
import { ICON_SIZES } from "@/lib/icon-scale";
import { cn } from "@/lib/utils";

/* ─── Registry: every export of the icon module, aliases folded together ── */

type GroupId = "product" | "navigation" | "actions" | "status" | "utility";

const GROUPS: Array<{ id: GroupId; title: string; note: string; names: readonly string[] }> = [
  {
    id: "product",
    title: "Product",
    note: "Blue-IQ concepts. Use these, not a generic lucide stand-in, whenever the object is ours.",
    names: [
      "Sonar", "Contract", "FileText", "GitCompare", "DraftSow", "BookMarked", "Matrix", "Obligation",
      "Counterparty", "Blocker", "ShieldAlert", "ShieldCheck", "Upload",
    ],
  },
  {
    id: "navigation",
    title: "Navigation",
    note: "Sidebar and page-level destinations at 20px; arrows and chevrons for movement.",
    names: [
      "LayoutDashboard", "Briefcase", "Library", "Kanban", "CalendarClock", "BarChart3", "Settings", "Users",
      "Bell", "Help", "House", "Menu", "PanelLeft", "PanelRight", "LogOut", "ChevronLeft", "ChevronRight",
      "ChevronUp", "ChevronDown", "ChevronsLeft", "ChevronsRight", "ChevronsUp", "ChevronsDown", "ChevronsUpDown",
      "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "ArrowUpRight", "ArrowLeftRight", "ExternalLink",
      "CornerDownLeft", "Route",
    ],
  },
  {
    id: "actions",
    title: "Actions",
    note: "Buttons, menus and list toolbars, at 16px beside a label.",
    names: [
      "Plus", "Minus", "X", "Pencil", "Edit3", "PenLine", "Copy", "Trash2", "Download", "FileDown", "FileUp",
      "Send", "Share2", "Link", "Link2", "Save", "Printer", "Play", "RefreshCw", "Repeat", "Undo2", "RotateCcw",
      "Search", "Eye", "EyeOff", "Maximize2", "Minimize2", "Filter", "ListFilter", "SlidersHorizontal",
      "ArrowUpDown", "ArrowDownWideNarrow", "ArrowUpNarrowWide", "Columns3", "Rows3", "Table2", "List",
      "LayoutList", "LayoutGrid", "GripVertical", "MoreHorizontal", "EllipsisVertical", "Paperclip", "Bookmark",
      "Tag", "Archive", "Star", "Pin", "PinOff", "Lock", "Unlock",
    ],
  },
  {
    id: "status",
    title: "Status",
    note: "Always paired with a word; colour is never the only signal.",
    names: [
      "Info", "Loader2", "AlertCircle", "AlertTriangle", "Check", "CheckCircle2", "XCircle", "CircleDot",
      "CircleDashed", "BadgeCheck", "Ban", "ShieldX", "Hourglass", "Clock", "History", "Flag", "BellOff",
    ],
  },
  { id: "utility", title: "Utility", note: "Everything else the module exports.", names: [] },
];

type Entry = { names: string[]; Icon: LucideIcon; custom: boolean; group: GroupId };

function isIcon(value: unknown): value is LucideIcon {
  return (typeof value === "object" && value !== null && "$$typeof" in value) || typeof value === "function";
}

function buildRegistry(): Entry[] {
  const byIcon = new Map<LucideIcon, string[]>();
  for (const [name, value] of Object.entries(Icons)) {
    if (!isIcon(value)) continue;
    const names = byIcon.get(value) ?? [];
    names.push(name);
    byIcon.set(value, names);
  }
  const groupOf = (names: string[]): GroupId =>
    GROUPS.find((g) => names.some((n) => g.names.includes(n)))?.id ?? "utility";
  const rank = (names: string[], group: GroupId) => {
    const list = GROUPS.find((g) => g.id === group)?.names ?? [];
    const hit = names.map((n) => list.indexOf(n)).filter((i) => i >= 0);
    return hit.length ? Math.min(...hit) : Number.POSITIVE_INFINITY;
  };
  return [...byIcon.entries()]
    .map(([Icon, names]) => {
      const group = groupOf(names);
      // Lead with the name the group list uses, so the tile reads as documented.
      const lead = GROUPS.find((g) => g.id === group)?.names.find((n) => names.includes(n));
      const ordered = lead ? [lead, ...names.filter((n) => n !== lead)] : names;
      const displayName = (Icon as { displayName?: string }).displayName ?? "";
      return { names: ordered, Icon, group, custom: displayName.endsWith("Icon") };
    })
    .sort((a, b) => rank(a.names, a.group) - rank(b.names, b.group) || a.names[0].localeCompare(b.names[0]));
}

const REGISTRY = buildRegistry();

/* ─── Rules ───────────────────────────────────────────────────────────── */

const RULES: Array<[string, string]> = [
  ["Grid", "Drawn on 24×24. Strokes stay on 3–21 (never closer than 2 to the edge), corners are radius 2, caps and joins round."],
  ["Stroke", "One optical weight: 1.5px on screen at every size. Call-site strokeWidth is ignored on purpose."],
  ["Sizes", "12, 16, 20, 24. Any other size snaps to the nearest step (13 → 12, 14–17 → 16, 18–22 → 20, 23+ → 24); 28 and up is reserved for display marks."],
  ["12", "Dense badges, pills and table meta only."],
  ["16", "The default: buttons, inputs, menus, table cells, toolbars."],
  ["20", "Sidebar navigation and page-level headers."],
  ["24", "Empty states only."],
  ["Meaning", "An icon that carries meaning sits beside a word. Icons alone are decoration and stay aria-hidden."],
  ["Icon-only buttons", "Need an aria-label on the button (and a tooltip). Pass aria-label to the icon itself only when it is the labelled image."],
  ["Source", "Import from @/components/ui/icons, never from lucide-react, so every glyph gets the scale and the stroke."],
];

function Rules() {
  return (
    <section aria-labelledby="icon-rules-title" className="rounded-container border border-border-default bg-surface-raised">
      <h2 id="icon-rules-title" className="border-b border-border-subtle px-4 py-3 text-body font-semibold text-fg-primary">
        Rules
      </h2>
      <dl>
        {RULES.map(([term, desc]) => (
          <div key={term} className="flex gap-3 border-b border-border-subtle px-4 py-2.5 last:border-b-0">
            <dt className="w-28 shrink-0 text-caption font-semibold text-fg-secondary tabular-nums">
              {/^\d+$/.test(term) ? `${term}px` : term}
            </dt>
            <dd className="min-w-0 max-w-[65ch] text-body text-fg-primary">{desc}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ─── Inspector: one icon large, over its grid ────────────────────────── */

function GridOverlay() {
  const lines = Array.from({ length: 25 }, (_, i) => i);
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="absolute inset-0 size-full text-border-default">
      {lines.map((i) => (
        <React.Fragment key={i}>
          <line x1={i} y1="0" x2={i} y2="24" stroke="currentColor" strokeWidth="0.04" />
          <line x1="0" y1={i} x2="24" y2={i} stroke="currentColor" strokeWidth="0.04" />
        </React.Fragment>
      ))}
      <rect x="2" y="2" width="20" height="20" fill="none" stroke="var(--danger)" strokeOpacity="0.45" strokeWidth="0.08" strokeDasharray="0.4 0.3" />
      <circle cx="12" cy="12" r="9" fill="none" stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="0.06" />
      <rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="0.06" />
    </svg>
  );
}

function Inspector({ entry }: { entry: Entry }) {
  const { Icon, names, custom } = entry;
  return (
    <section
      aria-labelledby="icon-inspector-title"
      className="flex flex-col gap-4 rounded-container border border-border-default bg-surface-raised p-4 sm:flex-row sm:items-center"
    >
      <div className="relative size-24 shrink-0 bg-surface-canvas text-fg-primary">
        <GridOverlay />
        <Icon size={96} className="absolute inset-0" />
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <h2 id="icon-inspector-title" className="font-mono text-body font-semibold text-fg-primary">
          {names[0]}
          <span className="ml-2 font-sans text-caption font-normal text-fg-tertiary">{custom ? "Blue-IQ drawing" : "lucide"}</span>
        </h2>
        {names.length > 1 && <p className="text-caption text-fg-secondary">Also exported as {names.slice(1).join(", ")}</p>}
        <code className="w-fit max-w-full truncate rounded-control bg-surface-sunken px-2 py-1 font-mono text-caption text-fg-secondary">
          {`import { ${names[0]} } from "@/components/ui/icons";`}
        </code>
        <div className="flex items-end gap-4 text-fg-primary">
          {ICON_SIZES.map((s) => (
            <div key={s} className="flex flex-col items-center gap-1">
              <Icon size={s} />
              <span className="text-caption text-fg-tertiary tabular-nums">{s}</span>
            </div>
          ))}
        </div>
        <p className="text-caption text-fg-tertiary">
          Grid: 1 unit lines, dashed 2-unit safe area, circle and square keylines.
        </p>
      </div>
    </section>
  );
}

/* ─── Contact sheet ───────────────────────────────────────────────────── */

function Tile({ entry, selected, onSelect }: { entry: Entry; selected: boolean; onSelect: () => void }) {
  const { Icon, names, custom } = entry;
  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          "flex w-full min-w-0 flex-col gap-3 rounded-container border bg-surface-raised p-3 text-left transition-colors duration-150 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          selected ? "border-accent" : "border-border-default",
        )}
      >
        <span className="flex h-6 items-end gap-3 text-fg-primary">
          {ICON_SIZES.map((s) => (
            <Icon key={s} size={s} />
          ))}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate font-mono text-caption font-semibold text-fg-primary" title={names[0]}>
              {names[0]}
            </span>
            {custom && (
              <span className="shrink-0 rounded-sm bg-surface-selected px-1 text-caption font-medium text-fg-link">
                Blue-IQ
              </span>
            )}
          </span>
          {names.length > 1 && (
            <span className="truncate font-mono text-caption text-fg-tertiary" title={names.slice(1).join(", ")}>
              = {names.slice(1).join(", ")}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

export function IconContactSheet() {
  const registry = REGISTRY;
  const [query, setQuery] = React.useState("");
  const [selectedName, setSelectedName] = React.useState("Sonar");
  const SearchGlyph = Icons.Search;

  const q = query.trim().toLowerCase();
  const visible = q ? registry.filter((e) => e.names.some((n) => n.toLowerCase().includes(q))) : registry;
  const selected = registry.find((e) => e.names.includes(selectedName)) ?? registry[0];
  const nameCount = registry.reduce((sum, e) => sum + e.names.length, 0);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <Rules />
        {selected && <Inspector entry={selected} />}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex h-8 w-full items-center gap-2 rounded-control border border-border-control bg-surface-raised px-2.5 text-fg-secondary focus-within:ring-2 focus-within:ring-accent sm:w-60">
          <SearchGlyph size={16} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find an icon"
            aria-label="Find an icon by name"
            className="min-w-0 flex-1 bg-transparent text-body text-fg-primary outline-none placeholder:text-fg-tertiary"
          />
        </label>
        <p className="text-caption text-fg-tertiary tabular-nums">
          {visible.length} of {registry.length} glyphs · {nameCount} export names · rendered at {ICON_SIZES.join(" / ")}
        </p>
      </div>

      {GROUPS.map((g) => {
        const items = visible.filter((e) => e.group === g.id);
        if (items.length === 0) return null;
        return (
          <section key={g.id} aria-labelledby={`icons-${g.id}`} className="flex min-w-0 flex-col gap-3">
            <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 id={`icons-${g.id}`} className="text-body-lg font-semibold text-fg-primary">
                {g.title} <span className="text-body font-normal text-fg-tertiary tabular-nums">{items.length}</span>
              </h2>
              <p className="text-caption text-fg-secondary">{g.note}</p>
            </header>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
              {items.map((e) => (
                <Tile key={e.names[0]} entry={e} selected={e === selected} onSelect={() => setSelectedName(e.names[0])} />
              ))}
            </ul>
          </section>
        );
      })}

      {visible.length === 0 && (
        <p className="rounded-container border border-dashed border-border-default px-4 py-8 text-center text-body text-fg-secondary">
          No icon is named like “{query}”. Search by export name, e.g. “Contract” or “ArrowUpDown”.
        </p>
      )}
    </div>
  );
}
