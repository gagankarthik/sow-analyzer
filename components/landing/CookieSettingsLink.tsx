"use client";

import { openCookieSettings } from "@/lib/cookie-consent";

/* "Your Privacy Choices" with the standard opt-out icon (a toggle with a
   tick and a cross). It opens the same settings panel, where optional
   cookies can be switched off at any time. */
export function PrivacyChoicesLink() {
  return (
    <button type="button" className="lp-navlink lp-privacy-choices" onClick={openCookieSettings}>
      Your Privacy Choices
      <PrivacyChoicesIcon />
    </button>
  );
}

function PrivacyChoicesIcon() {
  return (
    <svg viewBox="0 0 30 14" width="30" height="14" aria-hidden="true" focusable="false">
      <path d="M7 .5h16a6.5 6.5 0 0 1 0 13H7a6.5 6.5 0 0 1 0-13Z" fill="#FFFFFF" stroke="#0066FF" />
      <path d="M15.5 .5H23a6.5 6.5 0 0 1 0 13h-10.5Z" fill="#0066FF" />
      <path d="M5.2 7.1 7.4 9.3 11.3 4.8" fill="none" stroke="#0066FF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.4 4.6 24 9.4M24 4.6 19.4 9.4" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
