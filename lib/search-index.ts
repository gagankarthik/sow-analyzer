import { useMemo } from "react";
import { docTypeLabel } from "@/lib/doc-types";
import { AGREEMENT_TYPE_LABEL, STAGE_LABEL } from "@/lib/govern/labels";
import { useContracts, useEditionFeature, useEditionTerms, useGovernMe } from "@/lib/govern/queries";
import { useDocuments } from "@/lib/queries/documents";
import { useProjects } from "@/lib/projects-store";

// One search index for the whole workspace: live contracts, projects and
// documents, the workspace pages, and commands. The top bar and the command
// palette both read it. Ranking and grouping are pure so they can be tested.

export type SearchCategory = "Contracts" | "Documents" | "Projects" | "Pages" | "Actions";
export const SEARCH_CATEGORIES: SearchCategory[] = ["Contracts", "Documents", "Projects", "Pages", "Actions"];

/** Names an icon; the component that renders a hit picks the glyph. */
export type SearchIcon =
  | "contract" | "document" | "project" | "page" | "workflow" | "insights" | "settings"
  | "playbook" | "profile" | "home" | "upload" | "sonar" | "keyboard" | "obligations" | "renewals" | "reports";

/** Commands a hit can run instead of navigating. */
export type SearchCommand = "sonar" | "shortcuts";

export type SearchFact = { label: string; value: string };

export type SearchHit = {
  id: string;
  label: string;
  sub: string;
  group: SearchCategory;
  icon: SearchIcon;
  /** Where the hit goes. Commands have no href. */
  href?: string;
  command?: SearchCommand;
  /** Extra words that find this hit (sponsor, PI, department, owner, IDs). */
  keywords?: string;
  /** Hidden from leaders (setup pages). */
  adminOnly?: boolean;
  /** Single-key shortcut shown beside the hit. */
  shortcut?: string;
  /** Key facts for the palette's preview pane. */
  facts?: SearchFact[];
};

/* ───────────── Ranking ───────────── */

export function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

/** True when `term` begins a word in `text` (start, or after a non-alphanumeric). */
export function startsWord(text: string, term: string): boolean {
  let i = text.indexOf(term);
  while (i !== -1) {
    if (i === 0 || !/[a-z0-9]/i.test(text[i - 1])) return true;
    i = text.indexOf(term, i + 1);
  }
  return false;
}

/**
 * How well a hit matches an already-normalized term; 0 means no match.
 * Label: exact > prefix > word-start > substring. Then the same against the
 * secondary text (sub line and keywords). A multi-word term that matches
 * nowhere whole still matches when every word is found somewhere.
 */
export function scoreHit(hit: SearchHit, term: string): number {
  if (!term) return 1;
  const label = hit.label.toLowerCase();
  if (label === term) return 100;
  if (label.startsWith(term)) return 80;
  if (startsWord(label, term)) return 60;
  if (label.includes(term)) return 40;
  const rest = `${hit.sub} ${hit.keywords ?? ""}`.toLowerCase();
  if (startsWord(rest, term)) return 20;
  if (rest.includes(term)) return 10;
  const words = term.split(" ");
  if (words.length > 1) {
    const all = `${label} ${rest}`;
    if (words.every((w) => all.includes(w))) return 5;
  }
  return 0;
}

/** Matching hits, best first; equal scores keep the index order. */
export function rankHits(hits: SearchHit[], query: string, limit = Infinity): SearchHit[] {
  const term = normalizeQuery(query);
  return hits
    .map((hit, i) => ({ hit, i, score: scoreHit(hit, term) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, limit)
    .map((r) => r.hit);
}

/* ───────────── Grouping ───────────── */

export type CategoryFilter = SearchCategory | "All";

export type ResultGroup = {
  key: string;
  label: string;
  /** Every match in the group, including any not shown. */
  count: number;
  items: SearchHit[];
};

export type SearchView = {
  groups: ResultGroup[];
  /** Matches per category before the category filter (for the chips). */
  counts: Record<SearchCategory, number>;
  /** Shown hits in display order: what the arrow keys move through. */
  flat: SearchHit[];
};

export function emptyCounts(): Record<SearchCategory, number> {
  return { Contracts: 0, Documents: 0, Projects: 0, Pages: 0, Actions: 0 };
}

/**
 * Ranks, filters and groups hits for the palette. Groups are ordered by their
 * best match (ties keep SEARCH_CATEGORIES order). Under "All" each group shows
 * at most `perGroup` hits; a single category shows up to `max`.
 */
export function searchHits(
  hits: SearchHit[],
  query: string,
  category: CategoryFilter = "All",
  { perGroup = 5, max = 50 }: { perGroup?: number; max?: number } = {},
): SearchView {
  const term = normalizeQuery(query);
  const scored = hits
    .map((hit, i) => ({ hit, i, score: scoreHit(hit, term) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i);

  const counts = emptyCounts();
  for (const r of scored) counts[r.hit.group] += 1;

  const buckets = new Map<SearchCategory, { top: number; hits: SearchHit[] }>();
  for (const r of scored) {
    if (category !== "All" && r.hit.group !== category) continue;
    const b = buckets.get(r.hit.group) ?? { top: r.score, hits: [] };
    b.hits.push(r.hit);
    buckets.set(r.hit.group, b);
  }

  const cap = category === "All" ? perGroup : max;
  const groups: ResultGroup[] = [...buckets.entries()]
    .sort(([ga, a], [gb, b]) => b.top - a.top || SEARCH_CATEGORIES.indexOf(ga) - SEARCH_CATEGORIES.indexOf(gb))
    .map(([group, b]) => ({ key: group, label: group, count: b.hits.length, items: b.hits.slice(0, cap) }));

  return { groups, counts, flat: groups.flatMap((g) => g.items) };
}

/* ───────────── Recent items ───────────── */

export const RECENT_LIMIT = 8;

/** A stored snapshot of an opened hit, so recents render before data loads. */
export type RecentHit = Pick<SearchHit, "id" | "label" | "sub" | "group" | "icon" | "href" | "command">;

export function toRecent(hit: SearchHit): RecentHit {
  const { id, label, sub, group, icon, href, command } = hit;
  return { id, label, sub, group, icon, href, command };
}

/** Moves `hit` to the front, without duplicates, keeping at most `limit`. */
export function pushRecent(list: RecentHit[], hit: SearchHit, limit = RECENT_LIMIT): RecentHit[] {
  return [toRecent(hit), ...list.filter((r) => r.id !== hit.id)].slice(0, limit);
}

/** Reads the stored JSON; anything malformed is dropped rather than thrown. */
export function parseRecent(raw: string | null): RecentHit[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value
      .filter((r): r is RecentHit =>
        !!r && typeof r === "object" && typeof r.id === "string" && typeof r.label === "string"
        && typeof r.group === "string" && SEARCH_CATEGORIES.includes(r.group as SearchCategory))
      .slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}

/**
 * The view for an empty query under "All": recent items (the live hit when it
 * still exists, so its preview is current; recents that link nowhere and are
 * gone from the index are dropped) and then the commands.
 */
export function emptyView(hits: SearchHit[], recent: RecentHit[]): SearchView {
  const byId = new Map(hits.map((h) => [h.id, h]));
  const recentHits: SearchHit[] = recent
    .map((r) => byId.get(r.id) ?? (r.href || r.command ? { ...r, sub: r.sub ?? "" } : null))
    .filter((h): h is SearchHit => h !== null);
  const recentIds = new Set(recentHits.map((h) => h.id));
  const actions = hits.filter((h) => h.group === "Actions" && !recentIds.has(h.id));
  const groups: ResultGroup[] = [];
  if (recentHits.length) groups.push({ key: "recent", label: "Recent", count: recentHits.length, items: recentHits });
  if (actions.length) groups.push({ key: "Actions", label: "Actions", count: actions.length, items: actions });
  const counts = emptyCounts();
  for (const h of hits) counts[h.group] += 1;
  return { groups, counts, flat: groups.flatMap((g) => g.items) };
}

/* ───────────── The live index ───────────── */

const PAGE_HITS: SearchHit[] = [
  // Each `sub` says what the page actually shows today (kept in step with the page headers).
  { id: "p-dashboard", label: "Risk and documents", sub: "Clause risk, value and compliance", href: "/home?view=risk", group: "Pages", icon: "insights" },
  { id: "p-contracts", label: "Contracts", sub: "Every agreement, in progress and signed", href: "/contracts", group: "Pages", icon: "contract" },
  { id: "p-workflow", label: "Workflow", sub: "Who has each agreement and what moves it to signature", href: "/workflow", group: "Pages", icon: "workflow" },
  { id: "p-library", label: "Library", sub: "Every uploaded document", href: "/library", group: "Pages", icon: "document" },
  { id: "p-insights", label: "Insights", sub: "Portfolio insights", href: "/insights", group: "Pages", icon: "insights" },
  { id: "p-playbook", label: "Playbook", sub: "Settings · negotiation standards", href: "/settings/playbook", group: "Pages", icon: "playbook", adminOnly: true },
  { id: "p-clauses", label: "Clause library", sub: "Settings · clauses extracted from your documents", href: "/settings/clauses", group: "Pages", icon: "document", adminOnly: true },
  { id: "p-settings", label: "Settings", sub: "Review matrix, routing, team and integrations", href: "/settings", group: "Pages", icon: "settings", adminOnly: true },
  { id: "p-profile", label: "Profile", sub: "Your account, password and sessions", href: "/profile", group: "Pages", icon: "profile" },
];

const ACTION_HITS: SearchHit[] = [
  { id: "a-upload", label: "Upload a contract", sub: "Add an agreement for Sonar to review", href: "/projects/upload", group: "Actions", icon: "upload", shortcut: "U", keywords: "new add document file" },
  { id: "a-sonar", label: "Ask Sonar", sub: "Open the assistant", command: "sonar", group: "Actions", icon: "sonar", shortcut: "S", keywords: "assistant ai copilot chat question" },
  { id: "a-home", label: "Go to Home", sub: "What needs you today", href: "/home", group: "Actions", icon: "home", shortcut: "H", keywords: "navigate" },
  { id: "a-workflow", label: "Go to Workflow", sub: "The board, by stage", href: "/workflow", group: "Actions", icon: "workflow", shortcut: "W", keywords: "navigate board" },
  { id: "a-contracts", label: "Go to Contracts", sub: "Every agreement", href: "/contracts", group: "Actions", icon: "contract", shortcut: "C", keywords: "navigate agreements" },
  { id: "a-obligations", label: "Go to Obligations", sub: "Deliverables and reports due", href: "/obligations", group: "Actions", icon: "obligations", shortcut: "O", keywords: "navigate" },
  { id: "a-renewals", label: "Go to Renewals", sub: "Agreements ending soon", href: "/renewals", group: "Actions", icon: "renewals", shortcut: "R", keywords: "navigate expiring" },
  { id: "a-reports", label: "Go to Reports", sub: "Cycle time, bottlenecks and value", href: "/reports", group: "Actions", icon: "reports", keywords: "navigate" },
  { id: "a-settings", label: "Go to Settings", sub: "Matrix, routing, team and integrations", href: "/settings", group: "Actions", icon: "settings", keywords: "navigate", adminOnly: true },
  { id: "a-shortcuts", label: "Show keyboard shortcuts", sub: "Every key the workspace answers to", command: "shortcuts", group: "Actions", icon: "keyboard", shortcut: "?", keywords: "hotkeys keys help" },
];

/** The live index: contracts, projects, documents, pages, then commands. */
/** True while the records the index is built from (contracts, documents)
 *  are still on their first load: "no matches" would not yet be true. */
export function useSearchIndexLoading(): boolean {
  const docs = useDocuments();
  const contracts = useContracts(true);
  return docs.isLoading || contracts.isLoading;
}

export function useSearchIndex(): SearchHit[] {
  const hasPlaybook = useEditionFeature("commercialPlaybook");
  const hasDraft = useEditionFeature("sowDrafting");
  const terms = useEditionTerms();
  const { data } = useDocuments();
  const projects = useProjects();
  const contracts = useContracts(true).data?.contracts;
  const isLeader = useGovernMe().data?.role === "leader";

  return useMemo<SearchHit[]>(() => {
    // Contracts first: found by title, sponsor or counterparty, PI, department,
    // owner and Huron / Workday IDs, in plain words.
    const contractHits: SearchHit[] = (contracts ?? []).map((c) => ({
      id: `c-${c.contractId}`,
      label: c.title || "Untitled contract",
      sub: [AGREEMENT_TYPE_LABEL[c.agreementType], c.sponsor || c.counterparty, STAGE_LABEL[c.stage]].filter(Boolean).join(" · "),
      href: `/contracts/${encodeURIComponent(c.contractId)}`,
      group: "Contracts",
      icon: "contract",
      keywords: [c.piName, c.department, c.college, c.owner?.name, c.owner?.email, c.huronRecordId, c.workdayRef, c.counterparty, c.sponsor]
        .filter(Boolean).join(" "),
      facts: [
        { label: "Counterparty", value: c.sponsor || c.counterparty || "Not captured" },
        { label: "Stage", value: STAGE_LABEL[c.stage] ?? c.stage },
        { label: "Owner", value: c.owner?.name || c.owner?.email || "Unassigned" },
        { label: "Waiting on", value: c.waitingOn?.label || "Nothing pending" },
        { label: "Next step", value: c.nextStep?.headline || "None" },
      ],
    }));
    const projectNoun = terms.projects.slice(0, -1);
    const projectHits: SearchHit[] = projects.map((p) => ({
      id: p.id,
      label: p.name,
      sub: p.client ? `${projectNoun} · ${p.client}` : projectNoun,
      href: `/projects/${p.id}`,
      group: "Projects",
      icon: "project",
      facts: [{ label: "Client", value: p.client || "Not set" }],
    }));
    const docHits: SearchHit[] = (data ?? []).map((d) => {
      const stage = STAGE_LABEL[d.lifecycle as keyof typeof STAGE_LABEL] ?? d.lifecycle;
      return {
        id: d.docId,
        label: d.title || "Untitled document",
        sub: `${docTypeLabel(d.docType)} · ${stage}`,
        href: `/projects/${d.docId}`,
        group: "Documents",
        icon: "document",
        facts: [
          { label: "Type", value: docTypeLabel(d.docType) },
          { label: "Stage", value: String(stage ?? "Unknown") },
        ],
      };
    });
    // Pages the customer's edition hides are not offered (Requirement 7).
    const editionPages: SearchHit[] = [
      { id: "p-projects", label: terms.projects, sub: terms.projectsHint, href: "/projects", group: "Pages", icon: "project" },
      { id: "p-obligations", label: "Obligations", sub: terms.obligationsHint, href: "/obligations", group: "Pages", icon: "obligations" },
      ...(hasDraft ? [{ id: "p-draft", label: "Draft SOW", sub: "Sonar drafts a statement of work from a short questionnaire", href: "/draft", group: "Pages" as const, icon: "document" as const }] : []),
    ];
    const visible = (h: SearchHit) => (h.href !== "/settings/playbook" || hasPlaybook) && !(isLeader && h.adminOnly);
    const pages = [...editionPages, ...PAGE_HITS].filter(visible);
    const actions = ACTION_HITS.filter(visible);
    return [...contractHits, ...projectHits, ...docHits, ...pages, ...actions];
  }, [contracts, data, projects, hasPlaybook, hasDraft, terms, isLeader]);
}
