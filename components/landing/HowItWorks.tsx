"use client";

import { useEffect, useState } from "react";
import { FileText, ShieldCheck, Sonar, Upload } from "@/components/ui/icons";

/* ──────────────────────────────────────────────────────────────
   How Govern reviews a contract — four steps, each with the piece
   of product it produces. The steps advance by themselves with a
   progress line until someone picks one.
   ────────────────────────────────────────────────────────────── */
const STEP_MS = 5000;

const STEPS = [
  {
    icon: Upload,
    title: "Upload the contract",
    body: "PDF, Word or text. Scanned PDFs are read with OCR.",
    Panel: UploadPanel,
  },
  {
    icon: Sonar,
    title: "Sonar reads every clause",
    body: "The whole document is split into clauses and each one is filed by type.",
    Panel: ClausesPanel,
  },
  {
    icon: ShieldCheck,
    title: "Each clause is rated",
    body: "Measured against your playbook and marked within playbook, watch, deviates or flagged.",
    Panel: RatingPanel,
  },
  {
    icon: FileText,
    title: "You decide what to send back",
    body: "A suggested redline for each deviation, ready for your reviewer to accept or change.",
    Panel: RedlinePanel,
  },
];

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => setActive((n) => (n + 1) % STEPS.length), STEP_MS);
    return () => clearTimeout(id);
  }, [active, auto]);

  const pick = (i: number) => {
    setAuto(false);
    setActive(i);
  };
  const Panel = STEPS[active].Panel;

  return (
    <section id="how" className="lp-section lp-band-night scroll-mt-16">
      <div className="lp-wrap">
        <div className="lp-head">
          <h2 className="lp-h2">How Govern reviews a contract.</h2>
          <p className="text-lg">From an uploaded file to a list of what to push back on.</p>
        </div>

        <div className="mt-12 grid gap-8 lg:mt-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
          <div role="tablist" aria-label="Review steps" aria-orientation="vertical" className="flex flex-col gap-2">
            {STEPS.map(({ icon: Icon, title, body }, i) => {
              const selected = active === i;
              return (
                <button
                  key={title}
                  type="button"
                  role="tab"
                  id={`how-tab-${i}`}
                  aria-selected={selected}
                  aria-controls="how-panel"
                  className="lp-choice"
                  onClick={() => pick(i)}
                >
                  <span className="lp-icon-tile">
                    <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span className="lp-choice-title">{title}</span>
                  {selected && <span className="lp-choice-body">{body}</span>}
                  {selected && auto && <span key={active} aria-hidden="true" className="lp-choice-progress" />}
                </button>
              );
            })}
          </div>

          <div
            id="how-panel"
            role="tabpanel"
            aria-labelledby={`how-tab-${active}`}
            className="lp-stagepanel flex min-h-80 min-w-0 items-center justify-center p-5 md:p-10"
          >
            <div key={active} className="lp-swap w-full max-w-md">
              <Panel />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function UploadPanel() {
  return (
    <div className="lp-panel p-8 text-center">
      <span className="lp-icon-tile mx-auto">
        <Upload size={20} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <p className="mt-4 text-base font-semibold text-lp-ink">master-services-agreement.pdf</p>
      <p className="lp-ref mt-1">14 pages, uploaded</p>
      <ul className="mt-5 flex justify-center gap-2" aria-label="Accepted formats">
        {["PDF", "DOCX", "TXT"].map((f) => (
          <li key={f} className="lp-ref rounded-lp-sm border border-lp-line px-2 py-0.5">
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

const TYPES = [
  { type: "Payment milestones", n: 4 },
  { type: "Liability cap", n: 2 },
  { type: "Auto-renewal", n: 1 },
  { type: "IP ownership", n: 3 },
  { type: "Termination notice", n: 2 },
];

function ClausesPanel() {
  return (
    <div className="lp-panel">
      <div className="lp-panel-head">
        Clauses found
        <span className="lp-ref">38 in this document</span>
      </div>
      <ul>
        {TYPES.map((t) => (
          <li key={t.type} className="flex items-center justify-between border-b border-lp-line px-4 py-2.5 last:border-b-0">
            <span className="text-sm font-medium text-lp-ink">{t.type}</span>
            <span className="lp-ref">{t.n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RatingPanel() {
  return (
    <div className="lp-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-base font-semibold text-lp-ink">
          <span className="lp-ref mr-2">§ 7.2</span>Limitation of liability
        </p>
        <span className="lp-tag shrink-0" data-risk="flagged">
          Flagged
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <dt className="lp-colhead">This contract</dt>
          <dd className="mt-0.5 text-lg font-semibold text-lp-ink">2× fees</dd>
        </div>
        <div>
          <dt className="lp-colhead">Your playbook</dt>
          <dd className="mt-0.5 text-lg font-semibold text-lp-ink">1× fees</dd>
        </div>
      </dl>
      <p className="mt-4 border-t border-lp-line pt-3 text-sm text-lp-ink-2">
        Twice your standard ceiling. Counter this before signing.
      </p>
    </div>
  );
}

function RedlinePanel() {
  return (
    <div className="lp-panel p-5">
      <p className="lp-colhead">Suggested redline, § 7.2</p>
      <p className="mt-2 text-base text-lp-ink-2">
        Each party&apos;s aggregate liability shall not exceed{" "}
        <del className="lp-del">two times (2×) the fees</del>{" "}
        <ins className="lp-ins">one times (1×) the fees</ins> paid in the preceding twelve months.
      </p>
      <p className="mt-4 border-t border-lp-line pt-3 text-sm text-lp-ink-3">
        From your clause library. Your reviewer has the final say.
      </p>
    </div>
  );
}
