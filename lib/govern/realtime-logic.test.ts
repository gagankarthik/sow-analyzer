import { describe, expect, it, vi } from "vitest";
import {
  allowToast, channelForClaims, channelForTenant, contractIdFromPath, contractIdOf, createCoalescer,
  encodeAuthHeader, parseChange, planRefresh, realtimeHostFor, reconnectDelay, toastText, type ContractChange,
} from "./realtime-logic";

const change = (contractId: string, actor: string | null, action = "approve"): ContractChange =>
  ({ type: "contract.changed", contractId, action, actor, at: "2026-10-20T10:00:00Z" });

const NOW = 1_000_000;

describe("parseChange", () => {
  it("accepts the stream's message as a JSON string or an object", () => {
    const msg = { type: "contract.changed", contractId: "c-1", action: "approve", actor: "Dana Reyes", at: "t" };
    expect(parseChange(JSON.stringify(msg))).toEqual(msg);
    expect(parseChange(msg)).toEqual(msg);
    expect(parseChange({ ...msg, actor: null })?.actor).toBeNull();
  });

  it("ignores anything else", () => {
    expect(parseChange("not json")).toBeNull();
    expect(parseChange({ type: "other", contractId: "c-1" })).toBeNull();
    expect(parseChange({ type: "contract.changed" })).toBeNull();
    expect(parseChange(null)).toBeNull();
  });
});

describe("channels", () => {
  it("matches the backend's encoding", () => {
    expect(channelForTenant("northfield")).toBe("/govern/northfield");
    expect(channelForTenant("u-1234-abcd")).toBe("/govern/u-01234-0abcd");
    expect(channelForTenant("north_field.edu")).toBe("/govern/north-1field-2edu");
    const long = channelForTenant("x".repeat(64)).split("/");
    expect(long.slice(2).map((s) => s.length)).toEqual([50, 14]);
  });

  it("derives the workspace as the API does", () => {
    expect(channelForClaims({ "custom:tenantId": " northfield ", sub: "abc" })).toBe("/govern/northfield");
    expect(channelForClaims({ sub: "abc-1" })).toBe("/govern/u-0abc-01");
    expect(channelForClaims({ "custom:tenantId": "  ", sub: "abc" })).toBe("/govern/u-0abc");
    expect(channelForClaims({ "custom:tenantId": "a/b", sub: "abc" })).toBeNull();
    expect(channelForClaims({})).toBeNull();
    expect(channelForClaims(null)).toBeNull();
  });

  it("derives the realtime host from the default HTTP host", () => {
    expect(realtimeHostFor("abc.appsync-api.us-east-2.amazonaws.com")).toBe("abc.appsync-realtime-api.us-east-2.amazonaws.com");
    expect(realtimeHostFor("events.example.com")).toBeNull();
    expect(realtimeHostFor(undefined)).toBeNull();
  });

  it("encodes the auth header as base64url JSON", () => {
    const encoded = encodeAuthHeader({ host: "h", Authorization: "tok?>" });
    expect(encoded).not.toMatch(/[+/=]/);
    const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    expect(JSON.parse(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)))).toEqual({ host: "h", Authorization: "tok?>" });
  });
});

describe("planRefresh", () => {
  const ctx = (over: Partial<Parameters<typeof planRefresh>[1]> = {}) =>
    ({ me: "Dana Reyes", localWrites: new Map<string, number>(), viewing: null, now: NOW, ...over });

  it("refetches the list once and each changed contract once", () => {
    const plan = planRefresh([change("c-1", "Sam"), change("c-1", "Sam"), change("c-2", "Lee")], ctx());
    expect(plan.refreshList).toBe(true);
    expect(plan.contractIds).toEqual(["c-1", "c-2"]);
  });

  it("skips only the person's own write that this browser already applied", () => {
    const localWrites = new Map([["c-1", NOW - 2_000]]);
    expect(planRefresh([change("c-1", "Dana Reyes")], ctx({ localWrites }))).toEqual({ refreshList: false, contractIds: [], toast: null });
    // Same name but no local write (another tab or device): refetch.
    expect(planRefresh([change("c-2", "Dana Reyes")], ctx({ localWrites })).contractIds).toEqual(["c-2"]);
    // A local write long ago does not cover a new change.
    expect(planRefresh([change("c-1", "Dana Reyes")], ctx({ localWrites, now: NOW + 60_000 })).contractIds).toEqual(["c-1"]);
    // An automation the save triggered is refetched.
    expect(planRefresh([change("c-1", "Sonar")], ctx({ localWrites })).contractIds).toEqual(["c-1"]);
  });

  it("refetches when the person's name is unknown", () => {
    const localWrites = new Map([["c-1", NOW]]);
    expect(planRefresh([change("c-1", null)], ctx({ me: null, localWrites })).contractIds).toEqual(["c-1"]);
  });

  it("toasts only someone else's change to the open contract", () => {
    expect(planRefresh([change("c-1", "Sam")], ctx({ viewing: "c-1" })).toast).toEqual({ contractId: "c-1", actor: "Sam" });
    expect(planRefresh([change("c-2", "Sam")], ctx({ viewing: "c-1" })).toast).toBeNull();
    expect(planRefresh([change("c-1", "Dana Reyes")], ctx({ viewing: "c-1" })).toast).toBeNull();
    // Right after the person's own save (e.g. the automation it triggered): quiet.
    const localWrites = new Map([["c-1", NOW - 1_000]]);
    expect(planRefresh([change("c-1", "Sonar")], ctx({ viewing: "c-1", localWrites })).toast).toBeNull();
  });
});

describe("allowToast", () => {
  it("shows at most one toast per contract per 10 s", () => {
    const shown = new Map<string, number>();
    expect(allowToast(shown, "c-1", NOW)).toBe(true);
    expect(allowToast(shown, "c-1", NOW + 9_999)).toBe(false);
    expect(allowToast(shown, "c-2", NOW + 1)).toBe(true);
    expect(allowToast(shown, "c-1", NOW + 10_000)).toBe(true);
  });

  it("names the actor, or a teammate", () => {
    expect(toastText("Sam Ortiz")).toBe("Updated by Sam Ortiz");
    expect(toastText(null)).toBe("Updated by a teammate");
  });
});

describe("createCoalescer", () => {
  it("flushes a burst once, after it goes quiet", () => {
    vi.useFakeTimers();
    try {
      const flush = vi.fn();
      const c = createCoalescer<number>(flush, { timers: { set: setTimeout, clear: clearTimeout, now: () => Date.now() } });
      c.push(1);
      vi.advanceTimersByTime(200);
      c.push(2);
      vi.advanceTimersByTime(200);
      expect(flush).not.toHaveBeenCalled();
      vi.advanceTimersByTime(100);
      expect(flush).toHaveBeenCalledTimes(1);
      expect(flush).toHaveBeenCalledWith([1, 2]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("still flushes a burst that never pauses", () => {
    vi.useFakeTimers();
    try {
      const flush = vi.fn();
      const c = createCoalescer<number>(flush, { timers: { set: setTimeout, clear: clearTimeout, now: () => Date.now() } });
      for (let i = 0; i < 6; i++) {
        c.push(i);
        vi.advanceTimersByTime(200);
      }
      expect(flush).toHaveBeenCalledTimes(1);
      expect(flush.mock.calls[0][0]).toEqual([0, 1, 2, 3, 4]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("drops what is pending on cancel", () => {
    vi.useFakeTimers();
    try {
      const flush = vi.fn();
      const c = createCoalescer<number>(flush, { timers: { set: setTimeout, clear: clearTimeout, now: () => Date.now() } });
      c.push(1);
      c.cancel();
      vi.advanceTimersByTime(5_000);
      expect(flush).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("helpers", () => {
  it("backs off from 1 s to at most 60 s", () => {
    expect(reconnectDelay(0, () => 0.5)).toBe(1_000);
    expect(reconnectDelay(3, () => 0.5)).toBe(8_000);
    expect(reconnectDelay(20, () => 0.5)).toBe(60_000);
    expect(reconnectDelay(0, () => 0)).toBe(800);
    expect(reconnectDelay(0, () => 1)).toBe(1_200);
  });

  it("finds the contract a write or page is about", () => {
    expect(contractIdOf({ contractId: "c-1", state: "approved" })).toBe("c-1");
    expect(contractIdOf({ contract: { contractId: "c-2" } })).toBe("c-2");
    expect(contractIdOf({ ok: true })).toBeNull();
    expect(contractIdOf(undefined)).toBeNull();
    expect(contractIdFromPath("/contracts/c-1")).toBe("c-1");
    expect(contractIdFromPath("/contracts")).toBeNull();
    expect(contractIdFromPath("/contracts/c-1/edit")).toBeNull();
    expect(contractIdFromPath(null)).toBeNull();
  });
});
