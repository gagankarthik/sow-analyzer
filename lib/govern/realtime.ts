"use client";

/**
 * Govern real-time updates. Mounted once in the app shell: subscribes to the
 * tenant's AppSync Events channel and, when anyone in the workspace changes a
 * contract, re-reads the contract list (board, home, reports), that contract's
 * record and timeline, and the bell — through the normal REST API.
 *
 * - Bursts are coalesced (300 ms) into one refetch per key.
 * - The person's own writes, already applied by the mutation, are skipped.
 * - Reconnects with backoff; disconnects while the tab is hidden and re-reads
 *   once on return. While connected the queries poll every 5 minutes as a
 *   safety net (lib/govern/realtime-state.ts); otherwise every minute.
 *
 * Off (polling only) when NEXT_PUBLIC_GOVERN_REALTIME_HOST is not set.
 */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { getIdToken } from "@/lib/auth/cognito";
import { decodeJwt } from "@/lib/auth/session";
import { documentKeys } from "@/lib/queries/documents";
import { governKeys } from "./queries";
import { setGovernLive } from "./realtime-state";
import {
  allowToast, channelForClaims, contractIdFromPath, contractIdOf, createCoalescer, encodeAuthHeader,
  parseChange, planRefresh, realtimeHostFor, reconnectDelay, toastText, type ContractChange,
} from "./realtime-logic";

const HTTP_HOST = process.env.NEXT_PUBLIC_GOVERN_REALTIME_HOST || "";
const WS_HOST = process.env.NEXT_PUBLIC_GOVERN_REALTIME_WS_HOST || realtimeHostFor(HTTP_HOST) || "";

/** Keep-alive window when the server does not say. */
const DEFAULT_TIMEOUT_MS = 300_000;

// Once per page load: the first subscription needs no catch-up read, every
// later one (reconnect, token renewal) re-reads what may have been missed.
let subscribedBefore = false;

export function useGovernRealtime(): void {
  const qc = useQueryClient();
  const { status, user } = useAuth();
  const pathname = usePathname();
  const ctx = useRef({ me: null as string | null, viewing: null as string | null });

  useEffect(() => {
    ctx.current.me = user?.name?.trim() || null;
    ctx.current.viewing = contractIdFromPath(pathname);
  }, [user?.name, pathname]);

  const sub = user?.sub;
  const exp = user?.exp;
  useEffect(() => {
    if (status !== "authenticated" || !sub || !HTTP_HOST || !WS_HOST) return;
    return startRealtime(qc, () => ctx.current);
    // Re-keyed on the token's expiry (`exp`): a renewed ID token opens a fresh
    // connection, so it is never authorized by an expired one.
  }, [qc, status, sub, exp]);
}

// ── refetching ───────────────────────────────────────────────────────────────

function invalidate(qc: QueryClient, queryKey: readonly unknown[]) {
  // A fetch already running (focus, polling) is reused, not restarted.
  void qc.invalidateQueries({ queryKey }, { cancelRefetch: false });
}

function refreshAll(qc: QueryClient) {
  invalidate(qc, governKeys.allContracts);
  invalidate(qc, ["govern", "contract"]);
  invalidate(qc, ["govern", "contract-activity"]);
  invalidate(qc, documentKeys.all);
}

// ── the connection ───────────────────────────────────────────────────────────

type Context = () => { me: string | null; viewing: string | null };

/** Runs until the returned function is called. */
function startRealtime(qc: QueryClient, context: Context): () => void {
  const localWrites = new Map<string, number>();
  const toastsShown = new Map<string, number>();
  let stopped = false;
  let ws: WebSocket | null = null;
  let attempt = 0;
  let generation = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let aliveTimer: ReturnType<typeof setTimeout> | null = null;
  let catchUp = subscribedBefore;

  const coalescer = createCoalescer<ContractChange>((changes) => {
    const { me, viewing } = context();
    const now = Date.now();
    const plan = planRefresh(changes, { me, viewing, localWrites, now });
    if (plan.refreshList) {
      invalidate(qc, governKeys.allContracts);
      invalidate(qc, documentKeys.all);
    }
    for (const id of plan.contractIds) {
      invalidate(qc, governKeys.contract(id));
      invalidate(qc, ["govern", "contract-activity", id]);
    }
    if (plan.toast && allowToast(toastsShown, plan.toast.contractId, now)) {
      toast(toastText(plan.toast.actor), { id: `govern-live-${plan.toast.contractId}` });
    }
  });

  // Writes this browser saved: their stream echo is already in the cache.
  const stopWatchingWrites = qc.getMutationCache().subscribe((event) => {
    if (event.type !== "updated" || event.action.type !== "success") return;
    const id = contractIdOf(event.mutation.state.data);
    if (id) localWrites.set(id, Date.now());
  });

  const clearTimer = (t: ReturnType<typeof setTimeout> | null) => {
    if (t !== null) clearTimeout(t);
  };

  const disconnect = () => {
    generation += 1;
    clearTimer(aliveTimer);
    aliveTimer = null;
    const socket = ws;
    ws = null;
    setGovernLive(false);
    if (socket && socket.readyState <= WebSocket.OPEN) socket.close(1000);
  };

  const scheduleRetry = () => {
    clearTimer(retryTimer);
    retryTimer = null;
    if (stopped || document.hidden) return;
    retryTimer = setTimeout(() => void connect(), reconnectDelay(attempt));
    attempt += 1;
  };

  const dropped = () => {
    disconnect();
    catchUp = true;
    scheduleRetry();
  };

  const connect = async () => {
    clearTimer(retryTimer);
    retryTimer = null;
    if (stopped || document.hidden || ws) return;
    const mine = ++generation;
    let token: string | null = null;
    try {
      token = await getIdToken();
    } catch {
      token = null;
    }
    if (mine !== generation || stopped || document.hidden) return;
    if (!token) return scheduleRetry();
    const channel = channelForClaims(decodeJwt(token));
    if (!channel) return; // no usable workspace in the token: polling only
    const auth = { host: HTTP_HOST, Authorization: token };
    const subscriptionId = crypto.randomUUID();

    let socket: WebSocket;
    try {
      socket = new WebSocket(`wss://${WS_HOST}/event/realtime`, ["aws-appsync-event-ws", `header-${encodeAuthHeader(auth)}`]);
    } catch {
      return scheduleRetry();
    }
    ws = socket;
    const current = () => mine === generation && ws === socket;
    const send = (msg: unknown) => socket.readyState === WebSocket.OPEN && socket.send(JSON.stringify(msg));
    let timeoutMs = DEFAULT_TIMEOUT_MS;
    const keepAlive = () => {
      clearTimer(aliveTimer);
      aliveTimer = setTimeout(() => current() && dropped(), timeoutMs);
    };

    socket.onopen = () => send({ type: "connection_init" });
    socket.onclose = () => {
      if (current()) dropped();
    };
    socket.onerror = () => {
      if (current()) dropped();
    };
    socket.onmessage = (e: MessageEvent) => {
      if (!current()) return;
      let msg: { type?: string; id?: string; event?: unknown; connectionTimeoutMs?: number };
      try {
        msg = JSON.parse(String(e.data));
      } catch {
        return;
      }
      switch (msg.type) {
        case "connection_ack":
          if (typeof msg.connectionTimeoutMs === "number" && msg.connectionTimeoutMs > 0) timeoutMs = msg.connectionTimeoutMs;
          keepAlive();
          send({ type: "subscribe", id: subscriptionId, channel, authorization: auth });
          break;
        case "ka":
          keepAlive();
          break;
        case "subscribe_success":
          if (msg.id !== subscriptionId) break;
          attempt = 0;
          setGovernLive(true);
          if (catchUp) refreshAll(qc);
          catchUp = false;
          subscribedBefore = true;
          break;
        case "data": {
          if (msg.id !== subscriptionId) break;
          const change = parseChange(msg.event);
          if (change) coalescer.push(change);
          break;
        }
        case "subscribe_error":
        case "connection_error":
        case "error":
          dropped();
          break;
      }
    };
  };

  // Paused while the tab is hidden; on return, one catch-up read and reconnect.
  const onVisibility = () => {
    if (document.hidden) {
      clearTimer(retryTimer);
      retryTimer = null;
      coalescer.cancel();
      disconnect();
      return;
    }
    refreshAll(qc);
    catchUp = false;
    attempt = 0;
    void connect();
  };
  const onOnline = () => {
    if (ws) return;
    attempt = 0;
    void connect();
  };

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("online", onOnline);
  void connect();

  return () => {
    stopped = true;
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("online", onOnline);
    clearTimer(retryTimer);
    coalescer.cancel();
    stopWatchingWrites();
    disconnect();
  };
}
