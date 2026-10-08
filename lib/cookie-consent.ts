import { writeStoredValue } from "@/lib/use-stored-value";

// The visitor's cookie choice, kept in this browser. Strictly necessary
// cookies (the sign-in session) are always on; analytics and marketing are
// opt-in. Nothing optional is set today: any analytics or marketing script
// added later must check `hasConsent()` before it loads.

export type ConsentCategory = "analytics" | "marketing";
export type CookieConsent = { necessary: true; analytics: boolean; marketing: boolean; decidedAt: string };

export const CONSENT_STORAGE_KEY = "blueiq:cookie-consent";
const STORAGE_KEY = CONSENT_STORAGE_KEY;
export const CONSENT_EVENT = "blueiq:cookie-consent-change";
export const OPEN_SETTINGS_EVENT = "blueiq:cookie-settings-open";

/** Parses a stored choice; null when there is none or it is malformed. */
export function parseConsent(raw: string | null): CookieConsent | null {
  try {
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (typeof parsed.analytics !== "boolean" || typeof parsed.marketing !== "boolean") return null;
    return { necessary: true, analytics: parsed.analytics, marketing: parsed.marketing, decidedAt: String(parsed.decidedAt ?? "") };
  } catch {
    return null;
  }
}

export function saveConsent(choice: { analytics: boolean; marketing: boolean }): CookieConsent {
  const consent: CookieConsent = { necessary: true, ...choice, decidedAt: new Date().toISOString() };
  writeStoredValue(STORAGE_KEY, JSON.stringify(consent));
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: consent }));
  return consent;
}

export function readConsent(): CookieConsent | null {
  try {
    return parseConsent(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function hasConsent(category: ConsentCategory): boolean {
  return readConsent()?.[category] === true;
}

/** Reopens the settings panel, e.g. from the footer's "Cookie settings" link. */
export function openCookieSettings(): void {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}
