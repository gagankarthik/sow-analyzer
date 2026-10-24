"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import {
  ArrowRight, BarChart3, BookMarked, Briefcase, CalendarClock, Command, Copy, ExternalLink, FileText,
  Files, Gauge, House, Kanban, LayoutGrid, Link2, ListChecks, Search, Settings, Sonar, Upload, User,
  type LucideIcon,
} from "@/components/ui/icons";
import { useModKeyLabel } from "@/lib/hotkeys";
import {
  emptyView, parseRecent, pushRecent, searchHits, useSearchIndex, useSearchIndexLoading, SEARCH_CATEGORIES,
  type CategoryFilter, type SearchCommand, type SearchHit, type SearchIcon,
} from "@/lib/search-index";
import { useUIStore } from "@/lib/stores/ui";
import { useStoredValue, writeStoredValue } from "@/lib/use-stored-value";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonLine } from "@/components/ds/skeletons";

const RECENT_KEY = "palette:recent";
const PREVIEW_KEY = "palette:preview";
const WIDE_QUERY = "(min-width: 1024px)";
const FILTERS: CategoryFilter[] = ["All", ...SEARCH_CATEGORIES];

const ICONS: Record<SearchIcon, LucideIcon> = {
  contract: FileText, document: Files, project: Briefcase, page: LayoutGrid, workflow: Kanban,
  insights: BarChart3, settings: Settings, playbook: BookMarked, profile: User, home: House,
  upload: Upload, sonar: Sonar as LucideIcon, keyboard: Command, obligations: ListChecks,
  renewals: CalendarClock, reports: Gauge,
};

function absoluteUrl(href: string): string {
  return new URL(href, window.location.origin).toString();
}

async function copyLink(hit: SearchHit) {
  if (!hit.href) return;
  try {
    await navigator.clipboard.writeText(absoluteUrl(hit.href));
    toast.success("Link copied", { description: hit.label });
  } catch {
    toast.error("Couldn't copy the link", { description: "Your browser blocked clipboard access." });
  }
}

/**
 * The command palette: one place to find any contract, document, project or
 * page and to run workspace commands. Opened with Ctrl/Cmd+K, "/" or the
 * search field in the top bar.
 */
export function CommandPalette() {
  const open = useUIStore((s) => s.paletteOpen);
  const setOpen = useUIStore((s) => s.setPaletteOpen);
  const setCopilotOpen = useUIStore((s) => s.setCopilotOpen);
  const setShortcutsOpen = useUIStore((s) => s.setShortcutsOpen);
  const preview = useStoredValue(PREVIEW_KEY, "0") === "1";
  // A command runs once the palette has finished closing, so the dialog it
  // opens keeps focus instead of losing it to the palette's focus restore.
  const pending = useRef<SearchCommand | null>(null);

  function runAfterClose(command: SearchCommand) {
    pending.current = command;
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        onCloseAutoFocus={(e) => {
          const command = pending.current;
          if (!command) return;
          pending.current = null;
          e.preventDefault();
          if (command === "sonar") setCopilotOpen(true);
          else setShortcutsOpen(true);
        }}
        className={cn(
          "top-[8vh] flex max-h-[84dvh] translate-y-0 flex-col gap-0 overflow-hidden rounded-xl p-0 sm:top-[12vh] sm:max-h-[76dvh]",
          "border border-border shadow-lg ring-0 sm:max-w-[640px]",
          preview && "lg:max-w-[920px]",
        )}
      >
        <DialogTitle className="sr-only">Search and commands</DialogTitle>
        <DialogDescription className="sr-only">
          Type to search contracts, documents, projects, pages and commands. Use the arrow keys to move and Enter to open.
        </DialogDescription>
        <PaletteBody preview={preview} onClose={() => setOpen(false)} onCommand={runAfterClose} />
      </DialogContent>
    </Dialog>
  );
}

function PaletteBody({
  preview, onClose, onCommand,
}: {
  preview: boolean;
  onClose: () => void;
  onCommand: (command: SearchCommand) => void;
}) {
  const router = useRouter();
  const index = useSearchIndex();
  const indexLoading = useSearchIndexLoading();
  const mod = useModKeyLabel();
  const baseId = useId();
  const listId = `${baseId}-list`;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const recentRaw = useStoredValue(RECENT_KEY);
  const recent = useMemo(() => parseRecent(recentRaw), [recentRaw]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isEmpty = query.trim() === "";
  const view = useMemo(
    () => (isEmpty && category === "All" ? emptyView(index, recent) : searchHits(index, query, category)),
    [index, recent, query, category, isEmpty],
  );
  const keyOf = (h: SearchHit) => `${h.group}:${h.id}`;
  const found = view.flat.findIndex((h) => keyOf(h) === activeKey);
  const activeIndex = found === -1 ? 0 : found;
  const active: SearchHit | undefined = view.flat[activeIndex];
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  // Keep the selected row in view as the arrow keys move it.
  useEffect(() => {
    document.getElementById(`${baseId}-opt-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [baseId, activeIndex, view]);

  function remember(hit: SearchHit) {
    writeStoredValue(RECENT_KEY, JSON.stringify(pushRecent(recent, hit)));
  }

  function openHit(hit: SearchHit, newTab = false) {
    remember(hit);
    if (hit.command) { onCommand(hit.command); return; }
    if (!hit.href) return;
    if (newTab) {
      window.open(absoluteUrl(hit.href), "_blank", "noopener,noreferrer");
      return;
    }
    onClose();
    router.push(hit.href);
  }

  function move(delta: number) {
    const n = view.flat.length;
    if (!n) return;
    setActiveKey(keyOf(view.flat[(activeIndex + delta + n) % n]));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Home" && e.ctrlKey) { e.preventDefault(); setActiveKey(null); }
    else if (e.key === "Enter") {
      if (!active) return;
      e.preventDefault();
      openHit(active, e.metaKey || e.ctrlKey);
    } else if (e.key === "Tab" && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
      // The preview pane only shows on wide screens; elsewhere Tab moves focus as usual.
      if (!window.matchMedia(WIDE_QUERY).matches) return;
      e.preventDefault();
      writeStoredValue(PREVIEW_KEY, preview ? "0" : "1");
    }
  }

  function pickCategory(c: CategoryFilter) {
    setCategory(c);
    setActiveKey(null);
    inputRef.current?.focus();
  }

  // Where each group's rows start in the flat, arrow-key order.
  const offsets = view.groups.map((_, gi) => view.groups.slice(0, gi).reduce((n, g) => n + g.items.length, 0));

  return (
    <>
      {/* Search field */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 focus-within:border-[var(--ink-900)]">
        <Search size={16} aria-hidden className="shrink-0 text-[var(--ink-500)]" />
        <input
          ref={inputRef}
          autoFocus
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActiveKey(null); }}
          onKeyDown={onKeyDown}
          placeholder="Search contracts, documents, pages, or type a command"
          role="combobox"
          aria-label="Search and commands"
          aria-expanded
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active ? optionId(activeIndex) : undefined}
          autoComplete="off"
          spellCheck={false}
          className="h-full min-w-0 flex-1 bg-transparent text-lg text-foreground placeholder:text-[var(--ink-500)] focus:outline-none"
        />
        <Kbd className="hidden sm:inline-flex">Esc</Kbd>
      </div>

      {/* Category filter */}
      <div role="group" aria-label="Filter by category" className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border px-3 py-2">
        {FILTERS.map((c) => {
          const selected = c === category;
          const count = c === "All" ? undefined : view.counts[c];
          return (
            <button
              key={c}
              type="button"
              aria-pressed={selected}
              onClick={() => pickCategory(c)}
              className={cn(
                "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                selected
                  ? "border-[var(--ink-300)] bg-[var(--ink-100)] text-[var(--ink-900)]"
                  : "border-transparent text-[var(--ink-600)] hover:bg-[var(--ink-50)] hover:text-[var(--ink-900)]",
              )}
            >
              {c}
              {count !== undefined && !isEmpty && (
                <span className="tabular-nums text-[var(--ink-500)]">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Results */}
        <div id={listId} role="listbox" aria-label="Results" className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain py-1.5">
          {view.flat.length === 0 && indexLoading ? (
            <ResultsSkeleton />
          ) : view.flat.length === 0 ? (
            <div role="presentation" className="px-6 py-10 text-center">
              <p className="text-sm text-[var(--ink-800)] break-words">
                {isEmpty ? `Nothing in ${category} yet.` : <>No matches for <span className="font-semibold">&ldquo;{query.trim()}&rdquo;</span></>}
              </p>
              {!isEmpty && (
                <p className="mt-1 text-xs text-[var(--ink-500)]">Try a title, counterparty, PI, owner or Huron ID.</p>
              )}
            </div>
          ) : (
            view.groups.map((g, gi) => {
              const headId = `${baseId}-g-${g.key}`;
              const truncated = g.count > g.items.length && category === "All" && g.key !== "recent";
              return (
                <div key={g.key} role="group" aria-labelledby={headId} className="pb-1">
                  <div role="presentation" className="flex h-8 items-center justify-between px-4">
                    <span id={headId} className="text-xs font-medium text-[var(--ink-500)]">
                      {g.label}
                      <span className="ml-1.5 tabular-nums text-[var(--ink-500)]" aria-label={`${g.count} results`}>{g.count}</span>
                    </span>
                    {truncated && (
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => pickCategory(g.key as CategoryFilter)}
                        className="text-xs font-medium text-[var(--ink-600)] hover:text-[var(--ink-900)] hover:underline"
                      >
                        Show all {g.count}
                      </button>
                    )}
                  </div>
                  {g.items.map((hit, j) => {
                    const i = offsets[gi] + j;
                    return (
                      <ResultRow
                        key={keyOf(hit)}
                        id={optionId(i)}
                        hit={hit}
                        selected={i === activeIndex}
                        onHover={() => setActiveKey(keyOf(hit))}
                        onOpen={(newTab) => openHit(hit, newTab)}
                      />
                    );
                  })}
                </div>
              );
            })
          )}
          {/* Pages and commands answer at once; contracts and documents join when loaded. */}
          {view.flat.length > 0 && indexLoading && !isEmpty && <ResultsSkeleton rows={2} />}
        </div>

        {/* Preview: wide screens only, toggled with Tab */}
        {preview && (
          <aside aria-label="Preview" aria-live="polite" className="hidden w-[300px] shrink-0 overflow-y-auto border-l border-border bg-[var(--ink-25)] lg:block">
            {active ? <Preview hit={active} onOpen={(newTab) => openHit(active, newTab)} /> : (
              <p className="p-5 text-sm text-[var(--ink-500)]">Select a result to see its details.</p>
            )}
          </aside>
        )}
      </div>

      {/* Key hints */}
      <div className="hidden shrink-0 items-center gap-4 border-t border-border bg-[var(--ink-25)] px-4 py-2 text-xs text-[var(--ink-500)] sm:flex">
        <Hint keys={["↑", "↓"]} label="Navigate" />
        <Hint keys={["↵"]} label="Open" />
        <Hint keys={[mod, "↵"]} label="New tab" />
        <Hint keys={["Tab"]} label={preview ? "Hide preview" : "Preview"} className="hidden lg:inline-flex" />
        <Hint keys={["Esc"]} label="Close" className="ml-auto" />
      </div>
    </>
  );
}

/** Result rows (44px, icon + title + subtitle) while contracts and documents load. */
function ResultsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="presentation" aria-busy="true" className="pb-1">
      <span role="status" className="sr-only">Loading contracts and documents</span>
      <div aria-hidden className="flex h-8 items-center px-4">
        <SkeletonLine text="text-xs" width="w-20" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} aria-hidden className="mx-1.5 flex h-11 items-center gap-3 px-2.5">
          <Skeleton className="size-4 shrink-0 rounded-[4px]" />
          <span className="flex min-w-0 flex-1 items-baseline gap-2">
            <SkeletonLine text="text-sm" width={i % 2 ? "w-40" : "w-56"} />
            <SkeletonLine text="text-xs" width="w-32" className="hidden sm:block" />
          </span>
        </div>
      ))}
    </div>
  );
}

function Hint({ keys, label, className }: { keys: string[]; label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="inline-flex items-center gap-0.5">{keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</span>
      {label}
    </span>
  );
}

function ResultRow({
  id, hit, selected, onHover, onOpen,
}: {
  id: string;
  hit: SearchHit;
  selected: boolean;
  onHover: () => void;
  onOpen: (newTab: boolean) => void;
}) {
  const Icon = ICONS[hit.icon];
  return (
    <div role="presentation" className="group/row relative mx-1.5 flex items-center" onMouseMove={selected ? undefined : onHover}>
      <div
        id={id}
        role="option"
        aria-selected={selected}
        onClick={(e) => onOpen(e.metaKey || e.ctrlKey)}
        className={cn(
          "relative flex h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md px-2.5 transition-colors duration-100",
          selected ? "bg-[var(--ink-100)]" : "hover:bg-[var(--ink-50)]",
        )}
      >
        {/* The one accent: a 2px bar on the selected row. */}
        <span aria-hidden className={cn("absolute inset-y-2 left-0 w-0.5 rounded-full", selected ? "bg-[var(--brand-primary-600)]" : "bg-transparent")} />
        <Icon size={16} aria-hidden className={cn("shrink-0", selected ? "text-[var(--ink-800)]" : "text-[var(--ink-500)]")} />
        <span className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="truncate text-sm font-medium text-[var(--ink-900)]">{hit.label}</span>
          {hit.sub && <span className="hidden min-w-0 truncate text-xs text-[var(--ink-500)] sm:block">{hit.sub}</span>}
        </span>
        {hit.shortcut && (
          <Kbd className={cn("shrink-0", hit.href && "group-hover/row:hidden", hit.href && selected && "hidden")} aria-label={`Shortcut ${hit.shortcut}`}>
            {hit.shortcut}
          </Kbd>
        )}
      </div>
      {hit.href && (
        // Pointer shortcuts for the row; keyboard users have Enter, Mod+Enter and the preview.
        <div className={cn("absolute right-2 items-center gap-0.5", selected ? "flex" : "hidden group-hover/row:flex")}>
          <RowAction label="Open" icon={ArrowRight} onClick={() => onOpen(false)} />
          <RowAction label="Open in new tab" icon={ExternalLink} onClick={() => onOpen(true)} />
          <RowAction label="Copy link" icon={Link2} onClick={() => void copyLink(hit)} />
        </div>
      )}
    </div>
  );
}

function RowAction({ label, icon: Icon, onClick }: { label: string; icon: LucideIcon; onClick: () => void }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      title={label}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="inline-flex h-7 w-7 items-center justify-center rounded text-[var(--ink-600)] hover:bg-[var(--ink-200)] hover:text-[var(--ink-900)]"
    >
      <Icon size={16} aria-hidden />
    </button>
  );
}

function Preview({ hit, onOpen }: { hit: SearchHit; onOpen: (newTab: boolean) => void }) {
  const Icon = ICONS[hit.icon];
  return (
    <div className="flex flex-col gap-4 p-5">
      <div>
        <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--ink-500)]">
          <Icon size={12} aria-hidden />
          {hit.group === "Contracts" ? "Contract" : hit.group === "Actions" ? "Command" : hit.group.replace(/s$/, "")}
        </p>
        <h3 className="mt-1.5 text-base leading-snug font-semibold text-[var(--ink-900)] break-words">{hit.label}</h3>
        {hit.sub && <p className="mt-1 text-sm text-[var(--ink-600)] break-words">{hit.sub}</p>}
      </div>
      {hit.facts && hit.facts.length > 0 && (
        <dl className="divide-y divide-[var(--ink-100)] border-y border-[var(--ink-100)]">
          {hit.facts.map((f) => (
            <div key={f.label} className="grid grid-cols-[88px_1fr] gap-3 py-2">
              <dt className="text-xs text-[var(--ink-500)]">{f.label}</dt>
              <dd className="text-sm text-[var(--ink-800)] break-words">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {hit.shortcut && (
        <p className="flex items-center gap-2 text-xs text-[var(--ink-500)]">Shortcut <Kbd>{hit.shortcut}</Kbd></p>
      )}
      <div className="flex flex-wrap gap-1.5">
        <PreviewButton onClick={() => onOpen(false)} icon={ArrowRight}>{hit.command ? "Run" : "Open"}</PreviewButton>
        {hit.href && (
          <>
            <PreviewButton onClick={() => onOpen(true)} icon={ExternalLink}>New tab</PreviewButton>
            <PreviewButton onClick={() => void copyLink(hit)} icon={Copy}>Copy link</PreviewButton>
          </>
        )}
      </div>
    </div>
  );
}

function PreviewButton({ onClick, icon: Icon, children }: { onClick: () => void; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--ink-200)] bg-card px-2.5 text-xs font-medium text-[var(--ink-800)] transition-colors hover:bg-[var(--ink-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <Icon size={12} aria-hidden />
      {children}
    </button>
  );
}
