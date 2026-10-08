"use client";

import { openCookieSettings } from "@/lib/cookie-consent";

/* Reopens the cookie settings panel, so a choice can be changed at any time. */
export function CookieSettingsLink() {
  return (
    <button type="button" className="lp-navlink" onClick={openCookieSettings}>
      Cookie settings
    </button>
  );
}
