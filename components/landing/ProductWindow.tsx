"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/* ──────────────────────────────────────────────────────────────
   Product window — a working sample of the clause review screen:
   the scored clause list and the finding for the selected clause,
   Until someone clicks, it steps through the clauses that
   need review by itself. Figures belong to this sample document.
   ────────────────────────────────────────────────────────────── */

type Risk = "ok" | "watch" | "deviates" | "flagged";

const RISK_LABEL: Record<Risk, string> = {
  ok: "Within playbook",
  watch: "Watch",
  deviates: "Deviates",
  flagged: "Flagged",
};

type Clause = {
  ref: string;
  title: string;
  risk: Risk;
  before: string;
  phrase: string;
  after: string;
  found: string;
  standard: string;
  note: string;
  counter?: string;
};

const CLAUSES: Clause[] = [
  {
    ref: "2.1",
    title: "Scope of services",
    risk: "ok",
    before: "Changes to the Services take effect only on ",
    phrase: "written approval",
    after: " by both parties.",
    found: "Written approval",
    standard: "Written approval",
    note: "Change control matches your standard. Nothing to do here.",
  },
  {
    ref: "3.4",
    title: "Payment terms",
    risk: "ok",
    before: "Client shall pay each undisputed invoice within ",
    phrase: "thirty (30) days",
    after: " of receipt.",
    found: "Net 30",
    standard: "Net 30",
    note: "Payment cadence matches your standard. Nothing to do here.",
  },
  {
    ref: "4.2",
    title: "Service levels",
    risk: "deviates",
    before: "Provider shall maintain monthly availability of no less than ",
    phrase: "99.5%",
    after: " for the Services.",
    found: "99.5% uptime",
    standard: "99.9% uptime",
    note: "Softer than your tier-1 standard. Worth pushing back on.",
    counter: "99.9%",
  },
  {
    ref: "7.2",
    title: "Limitation of liability",
    risk: "flagged",
    before: "Each party's aggregate liability shall not exceed ",
    phrase: "two times (2×) the fees",
    after: " paid in the preceding twelve months.",
    found: "2× fees",
    standard: "1× fees",
    note: "Twice your standard ceiling. Counter this before signing.",
    counter: "one times (1×) the fees",
  },
  {
    ref: "9.3",
    title: "Ownership of deliverables",
    risk: "ok",
    before: "Deliverables transfer to Client ",
    phrase: "on payment in full",
    after: "; background IP stays with Provider.",
    found: "On payment",
    standard: "On payment",
    note: "Ownership follows your standard position. Nothing to do here.",
  },
  {
    ref: "12.1",
    title: "Auto-renewal",
    risk: "watch",
    before: "This Agreement renews for twelve-month terms unless either party gives notice at least ",
    phrase: "ninety (90) days",
    after: " before expiry.",
    found: "90 days' notice",
    standard: "30 days' notice",
    note: "Renews for 12 months unless cancelled 90 days out.",
    counter: "thirty (30) days",
  },
];

// The document as a whole.
const TOTAL = 38;
const TOUR = CLAUSES.flatMap((c, i) => (c.risk === "ok" ? [] : [i])); // clauses the auto-play visits
const TOUR_MS = 3200;

export function ProductWindow() {
  const [active, setActive] = useState(CLAUSES.findIndex((c) => c.risk === "flagged"));
  const [touring, setTouring] = useState(true);
  const c = CLAUSES[active];

  useEffect(() => {
    if (!touring) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setActive((cur) => TOUR[(TOUR.indexOf(cur) + 1) % TOUR.length]);
    }, TOUR_MS);
    return () => clearInterval(id);
  }, [touring]);

  const select = (i: number) => {
    setTouring(false);
    setActive(i);
  };

  return (
    <div className="lp-window">
        {/* app bar */}
        <div className="flex items-center justify-between gap-4 border-b border-lp-line px-4 py-2.5">
          <p className="flex min-w-0 items-center gap-2.5 text-sm text-lp-ink-3">
            <Image src="/logo-icon.svg" alt="" width={18} height={18} />
            <span className="truncate">
              Library <span aria-hidden="true">/</span>{" "}
              <span className="font-semibold text-lp-ink">master-services-agreement.pdf</span>
            </span>
          </p>
          <div className="flex shrink-0 items-center gap-3">
            <span className="lp-tag" data-risk="ok">
              Analyzed
            </span>
            <span className="lp-avatar" aria-hidden="true">
              GC
            </span>
          </div>
        </div>

        <div className="lp-shot-grid">
          {/* clause list */}
          <div className="min-w-0">
            <div className="lp-shot-row grid gap-x-3 border-b border-lp-line px-4 py-2">
              <span className="lp-colhead">§</span>
              <span className="lp-colhead">Clause</span>
              <span className="lp-colhead">Finding</span>
            </div>
            <ul>
              {CLAUSES.map((row, i) => (
                <li key={row.ref}>
                  <button
                    type="button"
                    className="lp-row lp-shot-row"
                    aria-pressed={active === i}
                    onClick={() => select(i)}
                  >
                    <span className="lp-ref">{row.ref}</span>
                    <span className="truncate text-sm font-medium text-lp-ink">{row.title}</span>
                    <span className="lp-tag" data-risk={row.risk}>
                      {RISK_LABEL[row.risk]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="lp-ref px-4 py-3">Showing 6 of {TOTAL} clauses</p>
          </div>

          {/* finding */}
          <div className="lp-shot-finding p-4" aria-live={touring ? "off" : "polite"}>
            <div key={c.ref} className="lp-swap">
              <p className="lp-ref">§ {c.ref}</p>
              <p className="mt-0.5 text-base font-semibold text-lp-ink">{c.title}</p>

              <p className="lp-excerpt mt-3 rounded-lp-sm bg-lp-paper p-3 text-sm text-lp-ink-2" data-risk={c.risk}>
                {c.before}
                <mark>{c.phrase}</mark>
                {c.after}
              </p>

              <dl className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <dt className="lp-colhead">This contract</dt>
                  <dd className="mt-0.5 text-base font-semibold text-lp-ink">{c.found}</dd>
                </div>
                <div>
                  <dt className="lp-colhead">Your playbook</dt>
                  <dd className="mt-0.5 text-base font-semibold text-lp-ink">{c.standard}</dd>
                </div>
              </dl>

              <p className="mt-4 text-sm text-lp-ink-2">{c.note}</p>

              <div className="mt-4 border-t border-lp-line pt-3">
                <p className="lp-colhead">Suggested redline</p>
                <p className="mt-1 text-sm">
                  {c.counter ? (
                    <>
                      <del className="lp-del">{c.phrase}</del> <ins className="lp-ins">{c.counter}</ins>
                    </>
                  ) : (
                    <span className="text-lp-ink-3">None needed</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
