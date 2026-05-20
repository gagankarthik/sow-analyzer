// Session-cookie helpers shared between the client (set/clear) and the Next.js
// `proxy.ts` gate (read-only, server-side). The cookie is an OPTIMISTIC signal
// only — it lets us redirect unauthenticated users before paint. Real
// enforcement lives at the API Gateway JWT authorizer, so a tampered cookie
// gains nothing: the backend rejects any request without a valid Cognito JWT.

/** Name of the cookie that mirrors the Cognito ID token for proxy gating. */
export const SESSION_COOKIE = "bq.idtoken";

/** Decode a JWT payload without verifying its signature (optimistic only). */
export function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    return JSON.parse(base64UrlDecode(part)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** True when the token exists and its `exp` claim is still in the future. */
export function isTokenValid(token: string | undefined | null): boolean {
  if (!token) return false;
  const payload = decodeJwt(token);
  if (!payload || typeof payload.exp !== "number") return false;
  // 10s skew tolerance.
  return payload.exp * 1000 > Date.now() - 10_000;
}

/** Write the session cookie (client only). Max-Age tracks the token expiry. */
export function setSessionCookie(idToken: string, expSeconds: number): void {
  if (typeof document === "undefined") return;
  const maxAge = Math.max(0, expSeconds - Math.floor(Date.now() / 1000));
  const secure =
    typeof location !== "undefined" && location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${SESSION_COOKIE}=${idToken}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

/** Remove the session cookie (client only). */
export function clearSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

// Runtime-agnostic base64url decode (works in the browser via atob and in the
// Node.js proxy runtime via Buffer).
function base64UrlDecode(input: string): string {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  if (typeof atob === "function") {
    const binary = atob(b64);
    // Re-interpret bytes as UTF-8 so non-ASCII claims decode correctly.
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  // Node fallback.
  return Buffer.from(b64, "base64").toString("utf-8");
}
