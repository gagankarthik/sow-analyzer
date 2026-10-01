// Server-only verification of a Cognito ID token. Used by the route handlers
// under app/api, which the proxy does not cover and which spend a paid API key,
// so they must check the signature themselves rather than trust the cookie.
//
// No dependency: RS256 is verified with node:crypto against the user pool's
// published JWKS, then issuer, audience, token use and expiry are checked.

import { createPublicKey, verify as verifySignature, type KeyObject } from "node:crypto";
import { SESSION_COOKIE } from "./session";

const USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? "";
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "";
// A pool id is "<region>_<suffix>", so the region can be derived if it is unset.
const REGION = process.env.NEXT_PUBLIC_COGNITO_REGION || USER_POOL_ID.split("_")[0] || "";

const ISSUER = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;
const JWKS_TTL_MS = 60 * 60 * 1000;
const JWKS_MIN_REFETCH_MS = 60 * 1000;
const MAX_TOKEN_LENGTH = 8192;

export const tokenVerificationConfigured = Boolean(REGION && USER_POOL_ID && CLIENT_ID);

export interface VerifiedUser {
  sub: string;
  email: string;
}

interface Jwk {
  kid?: string;
  kty?: string;
  [key: string]: unknown;
}

let keys = new Map<string, KeyObject>();
let fetchedAt = 0;

async function loadKeys(): Promise<void> {
  const res = await fetch(`${ISSUER}/.well-known/jwks.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`JWKS fetch failed (HTTP ${res.status})`);
  const body = (await res.json()) as { keys?: Jwk[] };
  const next = new Map<string, KeyObject>();
  for (const jwk of body.keys ?? []) {
    if (!jwk.kid || jwk.kty !== "RSA") continue;
    next.set(jwk.kid, createPublicKey({ key: jwk, format: "jwk" }));
  }
  keys = next;
  fetchedAt = Date.now();
}

async function keyFor(kid: string): Promise<KeyObject | null> {
  const age = Date.now() - fetchedAt;
  const stale = age > JWKS_TTL_MS;
  // An unknown kid may mean the pool rotated its keys; refetch, but not more
  // than once a minute so a forged kid cannot be used to hammer Cognito.
  const unknown = !keys.has(kid) && age > JWKS_MIN_REFETCH_MS;
  if (stale || unknown) await loadKeys();
  return keys.get(kid) ?? null;
}

function decodeSegment(segment: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Resolve the verified user for a Cognito ID token, or null if it is not valid. */
export async function verifyIdToken(token: string): Promise<VerifiedUser | null> {
  if (!tokenVerificationConfigured || !token || token.length > MAX_TOKEN_LENGTH) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerPart, payloadPart, signaturePart] = parts;

  const header = decodeSegment(headerPart);
  if (!header || header.alg !== "RS256" || typeof header.kid !== "string") return null;

  const key = await keyFor(header.kid);
  if (!key) return null;

  const signed = Buffer.from(`${headerPart}.${payloadPart}`);
  const signature = Buffer.from(signaturePart, "base64url");
  if (!verifySignature("RSA-SHA256", signed, key, signature)) return null;

  const claims = decodeSegment(payloadPart);
  if (!claims) return null;
  if (claims.iss !== ISSUER || claims.aud !== CLIENT_ID || claims.token_use !== "id") return null;
  if (typeof claims.exp !== "number" || claims.exp * 1000 <= Date.now()) return null;
  if (typeof claims.sub !== "string" || !claims.sub) return null;

  return { sub: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };
}

function cookieValue(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const pair of header.split(";")) {
    const eq = pair.indexOf("=");
    if (eq > 0 && pair.slice(0, eq).trim() === name) return pair.slice(eq + 1).trim();
  }
  return null;
}

/** The verified user behind a request: bearer token first, session cookie second. */
export async function userFromRequest(req: Request): Promise<VerifiedUser | null> {
  const auth = req.headers.get("authorization") ?? "";
  const bearer = /^Bearer\s+(\S+)$/i.exec(auth)?.[1];
  const token = bearer ?? cookieValue(req.headers.get("cookie"), SESSION_COOKIE);
  return token ? verifyIdToken(token) : null;
}
