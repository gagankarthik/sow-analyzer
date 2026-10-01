// Shared gate for the SOW route handlers. Each request must be same-origin
// JSON from a signed-in user, inside the per-user rate limit and the body size
// cap, before any of it reaches the model. Field-level checks live in
// ./validate.

import { tokenVerificationConfigured, userFromRequest, type VerifiedUser } from "../auth/verify";

const MAX_BODY_BYTES = 256 * 1024;
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 8;
const HOUR_MS = 60 * 60 * 1000;
const MAX_PER_HOUR = 60;
const MAX_TRACKED_USERS = 5000;

// Per-process memory: enough to stop one account looping on the endpoint, but
// on serverless each instance counts separately. A shared store is needed for
// a hard quota.
const hits = new Map<string, number[]>();

function retryAfterSeconds(sub: string, now: number): number | null {
  const recent = (hits.get(sub) ?? []).filter((t) => now - t < HOUR_MS);
  const inWindow = recent.filter((t) => now - t < WINDOW_MS);

  let wait: number | null = null;
  if (inWindow.length >= MAX_PER_WINDOW) wait = WINDOW_MS - (now - inWindow[0]);
  else if (recent.length >= MAX_PER_HOUR) wait = HOUR_MS - (now - recent[0]);

  if (wait === null) recent.push(now);
  if (hits.size >= MAX_TRACKED_USERS && !hits.has(sub)) hits.clear();
  hits.set(sub, recent);
  return wait === null ? null : Math.ceil(wait / 1000);
}

function fail(status: number, error: string, code?: string, headers?: HeadersInit): Response {
  return Response.json(code ? { error, code } : { error }, { status, headers });
}

// Browsers send Origin on every POST. A different host means another site is
// driving the request with the user's cookie, so it is refused.
function isCrossSite(req: Request): boolean {
  if (req.headers.get("sec-fetch-site") === "cross-site") return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export type Gate =
  | { ok: true; user: VerifiedUser; body: Record<string, unknown> }
  | { ok: false; response: Response };

export async function gate(req: Request): Promise<Gate> {
  if (isCrossSite(req)) return { ok: false, response: fail(403, "Cross-site requests are not allowed.") };

  if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    return { ok: false, response: fail(415, "Send the request as JSON.") };
  }

  if (!tokenVerificationConfigured) {
    return { ok: false, response: fail(503, "Sign-in is not configured on this server.") };
  }

  let user: VerifiedUser | null;
  try {
    user = await userFromRequest(req);
  } catch (e) {
    console.error(JSON.stringify({ event: "sow.auth.error", message: e instanceof Error ? e.message : String(e) }));
    return { ok: false, response: fail(503, "Could not verify your session. Try again in a moment.") };
  }
  if (!user) {
    return { ok: false, response: fail(401, "Your session has expired. Please sign in again.", "unauthenticated") };
  }

  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return { ok: false, response: fail(413, "That request is too large.") };

  const wait = retryAfterSeconds(user.sub, Date.now());
  if (wait !== null) {
    return {
      ok: false,
      response: fail(429, "You have reached the drafting limit. Try again shortly.", "rate_limited", {
        "Retry-After": String(wait),
      }),
    };
  }

  const text = await req.text();
  if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
    return { ok: false, response: fail(413, "That request is too large.") };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, response: fail(400, "Invalid request body.") };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, response: fail(400, "Invalid request body.") };
  }

  return { ok: true, user, body: parsed as Record<string, unknown> };
}
