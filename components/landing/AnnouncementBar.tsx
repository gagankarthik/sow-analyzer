"use client";

import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { useStoredValue, writeStoredValue } from "@/lib/use-stored-value";

/* One line of real product news above the header. Closing it hides this
   announcement in this browser; a new announcement gets a new id and shows
   again. The server renders it, so it is in the first paint. */

const ANNOUNCEMENT_ID = "2026-10-obligations-verified";
const STORAGE_KEY = "blueiq:announcement-closed";

export function AnnouncementBar() {
  const closedId = useStoredValue(STORAGE_KEY);
  if (closedId === ANNOUNCEMENT_ID) return null;

  return (
    <div className="lp-announce">
      <p>
        New in Govern: obligations Sonar finds now wait for a person to verify them, so every due date can be trusted.
      </p>
      <Link href="/product#capture" className="lp-announce-link">
        See how <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
      </Link>
      <button
        type="button"
        className="lp-announce-close"
        aria-label="Close announcement"
        onClick={() => writeStoredValue(STORAGE_KEY, ANNOUNCEMENT_ID)}
      >
        <X size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
