/**
 * The pure half of Govern real-time updates (lib/govern/realtime.ts runs the
 * socket). The backend's activity stream publishes one small invalidation per
 * activity entry to the tenant's AppSync Events channel:
 *
 *   { type: "contract.changed", contractId, action, actor, at }
 *
 * `actor` is a display name only ("Sonar" for system entries, null when only
 * an email is known). The page never trusts it for anything but "who": every
 * change is re-read through the REST API.
 */

export type ContractChange = {
  type: "contract.changed";
  contractId: string;
  action: string;
  actor: string | null;
  at: string;
};

/** Coalescing window: a burst of entries (one change can write several) is one refetch per key. */
export const COALESCE_MS = 300;
/** A burst that never pauses is still flushed this often. */
export const COALESCE_MAX_WAIT_MS = 1_000;
/** A write this browser made counts as "mine" for this long. */
export const OWN_WRITE_WINDOW_MS = 10_000;
/** At most one "Updated by …" toast per contract per window. */
export const TOAST_WINDOW_MS = 10_000;

/** A message from the channel, or null when it is not one we understand. */
export function parseChange(raw: unknown): ContractChange | null {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (v.type !== "contract.changed" || typeof v.contractId !== "string" || !v.contractId) return null;
  return {
    type: "contract.changed",
    contractId: v.contractId,
    action: typeof v.action === "string" ? v.action : "",
    actor: typeof v.actor === "string" && v.actor ? v.actor : null,
    at: typeof v.at === "string" ? v.at : "",
  };
}

// ── channels ─────────────────────────────────────────────────────────────────
// Must match lambdas/shared/govern/realtime.py (channel_for) and the subscribe
// handler (terraform/appsync/govern_channel.js), which refuses any other channel.

const TENANT_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
const SUB_RE = /^[A-Za-z0-9-]{1,60}$/;
const SEGMENT_MAX = 50;

/** The caller's workspace, derived as the API derives it (shared/auth.py). */
export function tenantFromClaims(claims: Record<string, unknown> | null): string | null {
  if (!claims) return null;
  const raw = claims["custom:tenantId"];
  if (typeof raw === "string" && raw.trim()) {
    const tenant = raw.trim();
    return TENANT_RE.test(tenant) ? tenant : null;
  }
  return typeof claims.sub === "string" && SUB_RE.test(claims.sub) ? `u-${claims.sub}` : null;
}

export function channelForTenant(tenant: string): string {
  const encoded = tenant.replace(/-/g, "-0").replace(/_/g, "-1").replace(/\./g, "-2");
  const segments: string[] = [];
  for (let i = 0; i < encoded.length; i += SEGMENT_MAX) segments.push(encoded.slice(i, i + SEGMENT_MAX));
  return `/govern/${segments.join("/")}`;
}

export function channelForClaims(claims: Record<string, unknown> | null): string | null {
  const tenant = tenantFromClaims(claims);
  return tenant ? channelForTenant(tenant) : null;
}

/** The realtime (WebSocket) host of an AppSync Events API's default HTTP host. */
export function realtimeHostFor(httpHost: string | undefined): string | null {
  if (!httpHost) return null;
  return httpHost.includes(".appsync-api.") ? httpHost.replace(".appsync-api.", ".appsync-realtime-api.") : null;
}

/** base64url(JSON) — the `header-…` WebSocket subprotocol AppSync reads auth from. */
export function encodeAuthHeader(header: Record<string, string>): string {
  const bytes = new TextEncoder().encode(JSON.stringify(header));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Reconnect delay: 1 s doubling to 60 s, ±20% jitter so tabs do not reconnect in step. */
export function reconnectDelay(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(60_000, 1_000 * 2 ** Math.max(0, attempt));
  return Math.round(base * (0.8 + 0.4 * random()));
}

// ── what to refetch ──────────────────────────────────────────────────────────

/** The contract a mutation's result is about, if it is one (writes return the contract). */
export function contractIdOf(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as { contractId?: unknown; contract?: { contractId?: unknown } };
  if (typeof d.contractId === "string" && d.contractId) return d.contractId;
  const nested = d.contract?.contractId;
  return typeof nested === "string" && nested ? nested : null;
}

export type PlanContext = {
  /** The signed-in person's display name (null: unknown, so nothing counts as "mine"). */
  me: string | null;
  /** contractId → when this browser last saved a write to it (ms). */
  localWrites: ReadonlyMap<string, number>;
  /** The contract whose page is open, if any. */
  viewing: string | null;
  now: number;
};

export type RefreshPlan = {
  /** Re-read the list (board, home, reports) and the bell. */
  refreshList: boolean;
  /** Re-read these contracts' records and timelines. */
  contractIds: string[];
  /** Say quietly that the open contract was changed by someone else. */
  toast: { contractId: string; actor: string | null } | null;
};

function wroteRecently(ctx: PlanContext, contractId: string): boolean {
  const at = ctx.localWrites.get(contractId);
  return at !== undefined && ctx.now - at <= OWN_WRITE_WINDOW_MS;
}

/**
 * One plan for a coalesced burst. A change is skipped only when it is surely
 * this person's own write that this browser has already applied (their name
 * AND a recent local write to that contract): the mutation put its result in
 * the cache and re-read the list. Anything else — other people, automations,
 * Sonar, or an unknown name — is refetched.
 */
export function planRefresh(changes: readonly ContractChange[], ctx: PlanContext): RefreshPlan {
  const ids = new Set<string>();
  let toast: RefreshPlan["toast"] = null;
  for (const c of changes) {
    const mine = ctx.me !== null && c.actor === ctx.me;
    const recent = wroteRecently(ctx, c.contractId);
    if (mine && recent) continue;
    ids.add(c.contractId);
    // A toast only for someone else's change, not one that follows the
    // person's own save (e.g. an automation it triggered).
    if (c.contractId === ctx.viewing && !mine && !recent) toast = { contractId: c.contractId, actor: c.actor };
  }
  return { refreshList: ids.size > 0, contractIds: [...ids], toast };
}

/** True when a toast for this contract may show now; records it when so. */
export function allowToast(shown: Map<string, number>, contractId: string, now: number): boolean {
  const last = shown.get(contractId);
  if (last !== undefined && now - last < TOAST_WINDOW_MS) return false;
  shown.set(contractId, now);
  return true;
}

export function toastText(actor: string | null): string {
  return `Updated by ${actor ?? "a teammate"}`;
}

/** The contract id in a contract page's path (/contracts/<id>), else null. */
export function contractIdFromPath(pathname: string | null): string | null {
  const m = pathname?.match(/^\/contracts\/([^/?#]+)\/?$/);
  return m ? decodeURIComponent(m[1]) : null;
}

// ── coalescing ───────────────────────────────────────────────────────────────

type Timers = {
  set: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clear: (t: ReturnType<typeof setTimeout>) => void;
  now: () => number;
};

const defaultTimers: Timers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (t) => clearTimeout(t),
  now: () => Date.now(),
};

/**
 * Collects items and flushes them together once the stream has been quiet
 * for `delayMs` — or `maxWaitMs` after the first, so a long burst still lands.
 */
export function createCoalescer<T>(
  flush: (items: T[]) => void,
  { delayMs = COALESCE_MS, maxWaitMs = COALESCE_MAX_WAIT_MS, timers = defaultTimers }:
    { delayMs?: number; maxWaitMs?: number; timers?: Timers } = {},
) {
  let items: T[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let firstAt = 0;

  const run = () => {
    timer = null;
    const batch = items;
    items = [];
    if (batch.length) flush(batch);
  };

  return {
    push(item: T) {
      const now = timers.now();
      if (!items.length) firstAt = now;
      items.push(item);
      if (timer !== null) timers.clear(timer);
      timer = timers.set(run, Math.max(0, Math.min(delayMs, firstAt + maxWaitMs - now)));
    },
    cancel() {
      if (timer !== null) timers.clear(timer);
      timer = null;
      items = [];
    },
  };
}
