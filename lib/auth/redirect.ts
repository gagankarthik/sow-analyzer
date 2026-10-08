// Validation for the `?redirect=` parameter that the proxy, the API client and
// the error boundaries attach when they send someone to /login.
//
// Only a same-origin, path-absolute target is accepted. A plain "starts with /"
// test is not enough: browsers treat "\" as "/", so "/\evil.com" navigates to
// another site, and tabs or newlines inside a URL are stripped before parsing.

const DEFAULT_TARGET = "/home";
const PARSE_BASE = "http://redirect.invalid";

// Control characters (tab, CR, LF and friends) are stripped by URL parsers, so
// "/\t/evil.com" would otherwise slip past the "//" check below.
function hasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/** Return `raw` if it is a safe in-app path, otherwise `fallback`. */
export function safeRedirectPath(
  raw: string | null | undefined,
  fallback: string = DEFAULT_TARGET,
): string {
  if (!raw || raw.length > 2048) return fallback;
  if (raw[0] !== "/" || raw[1] === "/") return fallback;
  if (raw.includes("\\") || hasControlChar(raw)) return fallback;

  try {
    const url = new URL(raw, PARSE_BASE);
    if (url.origin !== PARSE_BASE) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
