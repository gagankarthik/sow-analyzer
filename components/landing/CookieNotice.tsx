"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

/* Cookie notice. Blue-IQ sets one strictly necessary cookie (the sign-in
   session) and nothing optional, so this is an honest notice, not a consent
   wall: there is nothing to accept or reject. It reads like a matrix finding,
   a clause, the rating, and the rule, and remembers being closed in this
   browser only. */

const STORAGE_KEY = "blueiq:cookie-notice";

export function CookieNotice() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== "closed") setIsOpen(true);
    } catch {
      setIsOpen(true);
    }
  }, []);

  if (!isOpen) return null;

  const close = () => {
    setIsOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "closed");
    } catch {
      /* storage blocked: the notice simply shows again next visit */
    }
  };

  return (
    <aside className="lp-cookie" role="region" aria-labelledby="lp-cookie-title">
      <div className="lp-cookie-head">
        <p id="lp-cookie-title" className="lp-cookie-title">Cookies on this site</p>
        <span className="lp-cookie-chip">Strictly necessary only</span>
        <button type="button" className="lp-cookie-x" aria-label="Close cookie notice" onClick={close}>
          <X size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      <p className="lp-cookie-body">
        One cookie keeps you signed in to Govern. No advertising, analytics or tracking cookies, so there is nothing
        to opt in to.
      </p>
      <div className="lp-cookie-actions">
        <button type="button" className="lp-btn lp-btn-primary lp-btn-sm" onClick={close}>
          Got it
        </button>
        <Link href="/legal/cookies" className="lp-cookie-link">
          Cookie policy
        </Link>
      </div>
    </aside>
  );
}
