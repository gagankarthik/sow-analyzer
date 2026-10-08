"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/* Cookie notice. Blue-IQ sets one strictly necessary cookie (the sign-in
   session) and nothing optional, so this is a plain notice, not a consent
   wall: there is nothing to accept or reject. Closing it is remembered in
   this browser only. */

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
    <aside className="lp-cookie" aria-label="Cookie notice">
      <div className="lp-wrap lp-cookie-row">
        <p>
          We use one cookie, only to keep you signed in. No advertising or tracking cookies.{" "}
          <Link href="/legal/cookies" className="lp-cookie-link">Cookie policy</Link>
        </p>
        <button type="button" className="lp-btn lp-btn-primary lp-btn-sm" onClick={close}>
          OK
        </button>
      </div>
    </aside>
  );
}
