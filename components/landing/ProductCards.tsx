import type { ReactNode } from "react";

/* Product cards for the public site: small, readable pieces of Govern
   built in HTML with the product's own words (clause names, matrix
   outcomes, who holds a contract, the next step). They show what the
   product does without a screenshot of the whole app. The agreement and
   the figures are a sample, and the page says so where they appear. */

/* ─── Outcome chip: shape + word, never colour alone ──────────── */

export type Outcome = "within" | "fallback" | "deviates" | "unacceptable";

const OUTCOME_WORDS: Record<Outcome, string> = {
  within: "Within matrix",
  fallback: "Acceptable fallback",
  deviates: "Needs changes",
  unacceptable: "Not acceptable",
};

function OutcomeShape({ outcome }: { outcome: Outcome }) {
  const common = { width: 12, height: 12, viewBox: "0 0 12 12", "aria-hidden": true, focusable: false } as const;
  if (outcome === "within") {
    return (
      <svg {...common}>
        <circle cx="6" cy="6" r="5.25" fill="currentColor" />
        <path d="m3.5 6.2 1.6 1.6 3.4-3.4" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (outcome === "fallback") {
    return (
      <svg {...common}>
        <circle cx="6" cy="6" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 1.25a4.75 4.75 0 0 1 0 9.5z" fill="currentColor" />
      </svg>
    );
  }
  if (outcome === "deviates") {
    return (
      <svg {...common}>
        <path d="M6 .75 11.5 10.75H.5z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M3.6.75h4.8l3.35 3.35v4.8L8.4 12.25H3.6L.25 8.9V4.1z" fill="currentColor" />
      <path d="m4.2 4.2 3.6 3.6M7.8 4.2 4.2 7.8" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function OutcomeChip({ outcome }: { outcome: Outcome }) {
  return (
    <span className={`lp-chip lp-chip-${outcome}`}>
      <OutcomeShape outcome={outcome} />
      {OUTCOME_WORDS[outcome]}
    </span>
  );
}

function PanelCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`lp-pcard ${className ?? ""}`}>
      <p className="lp-pcard-label">{title}</p>
      {children}
    </div>
  );
}

/* ─── Matrix review ───────────────────────────────────────────── */

const MATRIX_ROWS: { clause: string; finding: string; outcome: Outcome }[] = [
  { clause: "License grant scope", finding: "Field of use is wider than the matrix allows", outcome: "deviates" },
  { clause: "Governing law", finding: "Delaware law; the matrix requires your home state", outcome: "unacceptable" },
  { clause: "Royalties", finding: "3.5% of net sales; standard is 4%", outcome: "fallback" },
  { clause: "Publication rights", finding: "60-day review, matches the standard", outcome: "within" },
  { clause: "Indemnification", finding: "Capped at fees paid", outcome: "within" },
];

export function MatrixCard({ rows = MATRIX_ROWS.length, className }: { rows?: number; className?: string }) {
  return (
    <div className={`lp-pcard lp-pcard-main ${className ?? ""}`}>
      <div className="lp-pcard-head">
        <div className="min-w-0">
          <p className="lp-pcard-label">Matrix review · Licenses, version 4</p>
          <p className="lp-pcard-title">Exclusive license: Wearable lactate biosensor</p>
        </div>
        <span className="lp-pcard-tag">In review</span>
      </div>
      <ul className="lp-matrix">
        {MATRIX_ROWS.slice(0, rows).map((row) => (
          <li key={row.clause} className="lp-matrix-row">
            <span className="min-w-0">
              <span className="lp-matrix-clause">{row.clause}</span>
              <span className="lp-matrix-finding">{row.finding}</span>
            </span>
            <OutcomeChip outcome={row.outcome} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Who has it, and for how long ────────────────────────────── */

export function HolderCard({ className }: { className?: string }) {
  return (
    <PanelCard title="Who has it" className={className}>
      <p className="lp-pcard-strong">Waiting on Legal Affairs</p>
      <p className="lp-pcard-meta">12 days in review · target 10</p>
      <div className="lp-meter" aria-hidden="true">
        <span className="lp-meter-fill lp-meter-late" />
        <span className="lp-meter-target" />
      </div>
      <p className="lp-pcard-flag">Running late</p>
    </PanelCard>
  );
}

/* ─── The one next step ───────────────────────────────────────── */

export function NextStepCard({ className }: { className?: string }) {
  return (
    <PanelCard title="Recommended next step" className={className}>
      <p className="lp-pcard-strong">Send back to the licensee: 3 clauses need changes.</p>
      <p className="lp-pcard-meta">Suggested language is attached to each clause.</p>
      <div className="mt-3 flex items-center gap-2">
        <span className="lp-pcard-button">Send back for changes</span>
        <span className="lp-pcard-more" aria-hidden="true">···</span>
      </div>
    </PanelCard>
  );
}

/* ─── The board: every contract, by stage ─────────────────────── */

const LANES: { stage: string; count: number; items: { title: string; who: string; days: string; tone: "ok" | "late" | "over" }[] }[] = [
  { stage: "In review", count: 6, items: [
    { title: "Federal subaward: autonomous sensing", who: "Export Control", days: "23 days", tone: "over" },
    { title: "Sponsored research: ceramic composites", who: "a reviewer", days: "4 days", tone: "ok" },
  ] },
  { stage: "With the other side", count: 3, items: [
    { title: "Data use agreement: health outcomes", who: "Riverbend Health", days: "45 days", tone: "over" },
    { title: "Sponsored research: soil carbon", who: "Prairie AgriTech", days: "27 days", tone: "late" },
  ] },
  { stage: "Approval and signature", count: 3, items: [
    { title: "Sponsored research: turbine coatings", who: "PI or department", days: "7 days", tone: "late" },
    { title: "Sponsored research: sleep study", who: "Signatory", days: "3 days", tone: "ok" },
  ] },
];

export function BoardCard({ className }: { className?: string }) {
  return (
    <div className={`lp-pcard lp-pcard-main ${className ?? ""}`}>
      <div className="lp-pcard-head">
        <div>
          <p className="lp-pcard-label">Workflow</p>
          <p className="lp-pcard-title">12 open · 2 overdue · 5 running late</p>
        </div>
      </div>
      <div className="lp-board">
        {LANES.map((lane) => (
          <div key={lane.stage} className="lp-lane">
            <p className="lp-lane-head">
              <span>{lane.stage}</span>
              <span className="lp-lane-count">{lane.count}</span>
            </p>
            {lane.items.map((item) => (
              <div key={item.title} className="lp-lane-card">
                <p className="lp-lane-title">{item.title}</p>
                <p className="lp-lane-who">Waiting on {item.who}</p>
                <span className={`lp-days lp-days-${item.tone}`}>{item.days}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── The money ───────────────────────────────────────────────── */

export function ValueCard({ className }: { className?: string }) {
  return (
    <div className={`lp-pcard lp-pcard-main ${className ?? ""}`}>
      <div className="lp-pcard-head">
        <div>
          <p className="lp-pcard-label">Value</p>
          <p className="lp-pcard-title">$2.2M signed, $3.3M on the way, $2.0M held up by delays</p>
        </div>
      </div>
      <div className="lp-stack" aria-hidden="true">
        <span className="lp-stack-current" />
        <span className="lp-stack-potential" />
        <span className="lp-stack-held" />
      </div>
      <dl className="lp-figures">
        <div>
          <dt><span className="lp-key lp-key-current" />Current</dt>
          <dd>$2,225,000</dd>
          <dd className="lp-figure-note">Signed and active · 5 contracts</dd>
        </div>
        <div>
          <dt><span className="lp-key lp-key-potential" />Potential</dt>
          <dd>$3,305,000</dd>
          <dd className="lp-figure-note">Still in the pipeline · 10 contracts</dd>
        </div>
        <div>
          <dt><span className="lp-key lp-key-held" />Held up</dt>
          <dd>$2,005,000</dd>
          <dd className="lp-figure-note">Past its target · 6 contracts</dd>
        </div>
      </dl>
      <p className="lp-pcard-note">3 contracts have no value yet, so totals say so. Add it.</p>
    </div>
  );
}

/* ─── A team's queue ──────────────────────────────────────────── */

export type QueueItem = { title: string; waiting: string; days: string; tone: "ok" | "late" | "over" };

export function QueueCard({ heading, items, className }: { heading: string; items: QueueItem[]; className?: string }) {
  return (
    <div className={`lp-pcard lp-pcard-main ${className ?? ""}`}>
      <div className="lp-pcard-head">
        <p className="lp-pcard-title">{heading}</p>
      </div>
      <ul className="lp-queue">
        {items.map((item) => (
          <li key={item.title} className="lp-queue-row">
            <span className="min-w-0">
              <span className="lp-matrix-clause">{item.title}</span>
              <span className="lp-matrix-finding">{item.waiting}</span>
            </span>
            <span className={`lp-days lp-days-${item.tone}`}>{item.days}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Where the queue backs up ────────────────────────────────── */

// Bar geometry on a 30-day scale, written as literal classes so Tailwind
// generates them: `fill` is the average wait, `mark` the stage's target.
const STAGE_WAITS: { stage: string; avg: number; target: number; open: number; fill: string; mark: string }[] = [
  { stage: "New", avg: 1, target: 3, open: 1, fill: "w-[4%]", mark: "left-[10%]" },
  { stage: "In review", avg: 12, target: 10, open: 6, fill: "w-[40%]", mark: "left-[33%]" },
  { stage: "With the other side", avg: 26, target: 21, open: 3, fill: "w-[87%]", mark: "left-[70%]" },
  { stage: "Approval and signature", avg: 4, target: 5, open: 3, fill: "w-[13%]", mark: "left-[17%]" },
];

export function BottleneckCard({ className }: { className?: string }) {
  return (
    <div className={`lp-pcard lp-pcard-main ${className ?? ""}`}>
      <div className="lp-pcard-head">
        <div>
          <p className="lp-pcard-label">Where contracts are stuck</p>
          <p className="lp-pcard-title">&quot;With the other side&quot; is furthest behind: 26 days against a 21-day target</p>
        </div>
      </div>
      <ul className="lp-waits">
        {STAGE_WAITS.map((s) => {
          const over = s.avg > s.target;
          return (
            <li key={s.stage} className="lp-wait">
              <span className="lp-matrix-clause">{s.stage}</span>
              <span className="lp-matrix-finding">
                {s.open} open · avg {s.avg} days · target {s.target}
              </span>
              <span className="lp-wait-bar" aria-hidden="true">
                <span className={`lp-wait-fill ${over ? "lp-wait-over" : "lp-wait-ok"} ${s.fill}`} />
                <span className={`lp-wait-target ${s.mark}`} />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─── What Sonar captured ─────────────────────────────────────── */

const CAPTURED: { field: string; value: string; where: string }[] = [
  { field: "Parties", value: "Your organisation · the licensee", where: "Preamble" },
  { field: "Effective date", value: "1 November 2026", where: "§1.4" },
  { field: "Term", value: "Life of the last licensed patent", where: "§11.1" },
  { field: "Upfront fee", value: "$75,000 within 30 days", where: "§4.1" },
  { field: "Royalty", value: "3.5% of net sales", where: "§4.3" },
  { field: "Governing law", value: "Delaware", where: "§14.2" },
];

export function CaptureCard({ className }: { className?: string }) {
  return (
    <div className={`lp-pcard lp-pcard-main ${className ?? ""}`}>
      <div className="lp-pcard-head">
        <div>
          <p className="lp-pcard-label">Captured by Sonar · 38 pages, scanned PDF</p>
          <p className="lp-pcard-title">Exclusive license: Wearable lactate biosensor</p>
        </div>
        <span className="lp-pcard-tag">31 clauses filed</span>
      </div>
      <dl className="lp-captured">
        {CAPTURED.map((row) => (
          <div key={row.field} className="lp-captured-row">
            <dt>{row.field}</dt>
            <dd>{row.value}</dd>
            <dd className="lp-captured-where">{row.where}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ─── Connections ─────────────────────────────────────────────── */

const CONNECTIONS: { name: string; what: string }[] = [
  { name: "Huron Research Suite", what: "Agreements in; findings and status back" },
  { name: "Workday", what: "Award and spend data for reporting" },
  { name: "DocuSign", what: "Out for signature moves to Signed on its own" },
  { name: "Microsoft Teams", what: "Alerts when work lands on a reviewer" },
];

export function IntegrationsCard({ className, status }: { className?: string; status: string }) {
  return (
    <div className={`lp-pcard lp-pcard-main ${className ?? ""}`}>
      <div className="lp-pcard-head">
        <div>
          <p className="lp-pcard-label">Connections</p>
          <p className="lp-pcard-title">Nobody enters a contract twice</p>
        </div>
      </div>
      <ul className="lp-queue">
        {CONNECTIONS.map((c) => (
          <li key={c.name} className="lp-queue-row">
            <span className="min-w-0">
              <span className="lp-matrix-clause">{c.name}</span>
              <span className="lp-matrix-finding">{c.what}</span>
            </span>
            <span className="lp-pcard-tag">{status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Redline: one clause as review shows it ──────────────────── */

/** One clause with the struck text and Sonar's suggested language, the
 *  rule it cites, and the reviewer's two choices. An example agreement. */
export function RedlineCard({ className }: { className?: string }) {
  return (
    <div className={`lp-pcard lp-pcard-main ${className ?? ""}`}>
      <div className="lp-pcard-head">
        <div>
          <p className="lp-pcard-label">Example redline · §9 Indemnification</p>
          <p className="lp-pcard-title">Exclusive license: Wearable lactate biosensor</p>
        </div>
        <OutcomeChip outcome="deviates" />
      </div>
      <p className="lp-redline">
        Licensee shall indemnify Licensor against third-party claims arising from the Licensed Products
        <del className="lp-redline-del">, and Licensor shall indemnify Licensee for any breach of this Agreement without limitation</del>
        <ins className="lp-redline-ins">, and each party&rsquo;s liability shall not exceed the fees paid in the twelve months before the claim</ins>.
      </p>
      <p className="lp-redline-rule">
        Rule: your matrix caps liability at fees paid; uncapped indemnity goes to Legal Affairs.
      </p>
      <div className="lp-redline-actions">
        <span className="lp-pcard-button">Accept suggestion</span>
        <span className="lp-redline-secondary">Edit language</span>
      </div>
    </div>
  );
}

/* ─── Clause split: what a reviewer actually opens ────────────── */

/** Forty clauses checked, three to read: the review summary. Example. */
export function ClauseSplitCard({ className }: { className?: string }) {
  const parts = [
    { key: "within", label: "Within the matrix", n: 34, width: "w-[85%]" },
    { key: "fallback", label: "Acceptable fallback", n: 3, width: "w-[7.5%]" },
    { key: "deviates", label: "For you to read", n: 3, width: "w-[7.5%]" },
  ];
  return (
    <div className={`lp-pcard ${className ?? ""}`}>
      <p className="lp-pcard-label">Example agreement · 40 clauses checked</p>
      <p className="lp-pcard-strong">3 clauses need you. The rest match your matrix.</p>
      <div className="lp-split-track" aria-hidden="true">
        {parts.map((p) => <span key={p.key} className={`lp-split-seg lp-split-${p.key} ${p.width}`} />)}
      </div>
      <ul className="lp-split-key">
        {parts.map((p) => (
          <li key={p.key}>
            <span className={`lp-split-swatch lp-split-${p.key}`} aria-hidden="true" />
            <span className="lp-split-n">{p.n}</span> {p.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
