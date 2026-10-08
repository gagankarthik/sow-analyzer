"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { CONSENT_STORAGE_KEY, OPEN_SETTINGS_EVENT, parseConsent, readConsent, saveConsent } from "@/lib/cookie-consent";
import { useStoredValue } from "@/lib/use-stored-value";

/* Cookie consent: a bottom bar with Cookie settings, Reject all and Accept
   all cookies, and a settings panel with one switch per category. Strictly
   necessary cookies are always on; analytics and marketing are opt-in, and
   no optional cookie is set until the visitor accepts it. The copy says only
   what is true of this site. */

const CATEGORIES = [
  {
    id: "necessary",
    label: "Strictly necessary",
    body: "Keep you signed in and keep the site secure. Always on, because the site cannot work without them.",
  },
  {
    id: "analytics",
    label: "Analytics",
    body: "Help us understand which pages are used so we can improve them. Only set if you allow it.",
  },
  {
    id: "marketing",
    label: "Marketing",
    body: "Help us measure our campaigns. Only set if you allow it.",
  },
] as const;

export function CookieNotice() {
  // "pending" on the server and during hydration, so the banner never flashes
  // for a visitor who has already chosen.
  const raw = useStoredValue(CONSENT_STORAGE_KEY, "pending");
  const saved = raw === "pending" ? null : parseConsent(raw);
  const isBannerOpen = raw !== "pending" && saved === null;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const titleId = useId();

  useEffect(() => {
    // Opening from the footer starts from the saved choice.
    const openSettings = () => {
      const current = readConsent();
      setAnalytics(current?.analytics ?? false);
      setMarketing(current?.marketing ?? false);
      setIsSettingsOpen(true);
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, openSettings);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, openSettings);
  }, []);

  useEffect(() => {
    if (!isSettingsOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsSettingsOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isSettingsOpen]);

  const decide = (choice: { analytics: boolean; marketing: boolean }) => {
    saveConsent(choice);
    setIsSettingsOpen(false);
  };

  const values = { necessary: true, analytics, marketing };
  const setters = { analytics: setAnalytics, marketing: setMarketing };

  return (
    <>
      {isBannerOpen && !isSettingsOpen && (
        <aside className="lp-cookie" aria-label="Cookie consent">
          <div className="lp-wrap lp-cookie-row">
            <p className="lp-cookie-text">
              By clicking “Accept all cookies”, you agree to Blue-IQ storing optional analytics and marketing cookies
              on your device. Strictly necessary cookies, which keep you signed in, are always on.{" "}
              <Link href="/legal/cookies" className="lp-cookie-link">Cookie policy</Link>
            </p>
            <div className="lp-cookie-actions">
              <button type="button" className="lp-cookie-settings" onClick={() => setIsSettingsOpen(true)}>
                Cookie settings
              </button>
              <button type="button" className="lp-btn lp-btn-outline lp-btn-sm" onClick={() => decide({ analytics: false, marketing: false })}>
                Reject all
              </button>
              <button type="button" className="lp-btn lp-btn-primary lp-btn-sm" onClick={() => decide({ analytics: true, marketing: true })}>
                Accept all cookies
              </button>
            </div>
          </div>
        </aside>
      )}

      {isSettingsOpen && (
        <div className="lp-cookie-scrim" onClick={() => setIsSettingsOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="lp-cookie-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lp-cookie-dialog-head">
              <h2 id={titleId} className="lp-cookie-dialog-title">Cookie settings</h2>
              <button type="button" className="lp-cookie-close" aria-label="Close cookie settings" onClick={() => setIsSettingsOpen(false)} autoFocus>
                <X size={18} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
            <p className="lp-cookie-dialog-intro">
              Choose which cookies Blue-IQ may store on this device. You can change this at any time from the footer.
            </p>
            <ul className="lp-cookie-cats">
              {CATEGORIES.map((cat) => {
                const on = values[cat.id];
                const locked = cat.id === "necessary";
                return (
                  <li key={cat.id} className="lp-cookie-cat">
                    <div className="min-w-0">
                      <p className="lp-cookie-cat-label">{cat.label}</p>
                      <p className="lp-cookie-cat-body">{cat.body}</p>
                    </div>
                    {locked ? (
                      <span className="lp-cookie-always">Always on</span>
                    ) : (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        aria-label={cat.label}
                        className="lp-switch"
                        onClick={() => setters[cat.id](!on)}
                      >
                        <span className="lp-switch-knob" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="lp-cookie-dialog-actions">
              <button type="button" className="lp-btn lp-btn-outline lp-btn-sm" onClick={() => decide({ analytics: false, marketing: false })}>
                Reject all
              </button>
              <button type="button" className="lp-btn lp-btn-outline lp-btn-sm" onClick={() => decide({ analytics, marketing })}>
                Save my choices
              </button>
              <button type="button" className="lp-btn lp-btn-primary lp-btn-sm" onClick={() => decide({ analytics: true, marketing: true })}>
                Accept all cookies
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
