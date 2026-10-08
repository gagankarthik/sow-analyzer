import type { ProductSectionId } from "@/components/landing/site-nav";

/* What changes for the organisation, as four outcomes. Laid out as a ledger
   beside a sticky heading (not a row of identical cards): each row says the
   outcome, the mechanism that delivers it, and a small picture of that
   mechanism. Every figure in the pictures is an example and labelled so;
   none is presented as a measured result. */

type Outcome = {
  id: string;
  label: string;
  title: string;
  body: string;
  area: ProductSectionId;
  visual: React.ReactNode;
  caption: string;
};

const OUTCOMES: Outcome[] = [
  {
    id: "acceleration",
    label: "Acceleration",
    title: "You see signing get faster, stage by stage",
    body: "Every agreement carries an owner and one next step, and each stage runs against its own target, so nothing waits without someone knowing.",
    area: "workflow",
    visual: <StageMeter />,
    caption: "Example: days in each stage against its target",
  },
  {
    id: "adoption",
    label: "Adoption",
    title: "Your team is working in it in the first week",
    body: "Upload the agreements you already have. Sonar reads them, and reviewers work from a board and plain-word search, with no new templates to learn.",
    area: "capture",
    visual: <SetupSteps />,
    caption: "The three steps to a working workspace",
  },
  {
    id: "efficiency",
    label: "Efficiency",
    title: "Reviewer time goes to the clauses that deviate",
    body: "Every clause is checked against your matrix, so reviewers open the few that fall outside it, with suggested language already drafted.",
    area: "matrix",
    visual: <ClauseSplit />,
    caption: "Example agreement: 40 clauses checked",
  },
  {
    id: "optimisation",
    label: "Optimisation",
    title: "You see where time and money stall",
    body: "Trend and bottleneck reports show which stage, office or term slows signing, and value reporting shows the money held up behind it.",
    area: "trends",
    visual: <TrendLine />,
    caption: "Example: average days to signature by month",
  },
];

export function Outcomes() {
  return (
    <section id="outcomes" className="lp-section lp-outcomes scroll-mt-20" aria-labelledby="outcomes-title">
      <div className="lp-wrap lp-outcomes-grid">
        <div className="lp-outcomes-head">
          <h2 id="outcomes-title" className="lp-h2">
            What leaders <span className="lp-serif">finally see.</span>
          </h2>
          <p className="lp-body mt-5">
            Where contracts wait, how long signing takes and how much value is held up, without asking anyone
            for a status. Each outcome comes from something you can open in the product.
          </p>
        </div>

        <ol className="lp-ledger">
          {OUTCOMES.map((o) => (
            <li key={o.id} className={`lp-ledger-row lp-area-${o.area}`}>
              <div className="lp-ledger-text">
                <h3 className="lp-ledger-title">
                  <span className="lp-ledger-word">{o.label}.</span> {o.title}
                </h3>
                <p className="lp-ledger-body">{o.body}</p>
              </div>
              <figure className="lp-ledger-visual">
                {o.visual}
                <figcaption className="lp-ledger-caption">{o.caption}</figcaption>
              </figure>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ── Visuals: plain HTML/SVG, decorative beside their captions ──────────── */

/** Four stages, each a bar of days against a target tick. */
function StageMeter() {
  // Widths are literal classes (days and targets out of 12) so no inline styles.
  const stages = [
    { name: "New", days: 1, fill: "w-[8.33%]", tick: "left-[16.67%]" },
    { name: "Review", days: 4, fill: "w-[33.33%]", tick: "left-[41.67%]" },
    { name: "Other side", days: 8, fill: "w-[66.67%]", tick: "left-[83.33%]" },
    { name: "Signature", days: 2, fill: "w-[16.67%]", tick: "left-[25%]" },
  ];
  return (
    <ul className="lp-oc-meter" aria-label="Example stage times: every stage within its target">
      {stages.map((s) => (
        <li key={s.name} className="lp-oc-meter-row">
          <span className="lp-oc-meter-name">{s.name}</span>
          <span className="lp-oc-meter-track">
            <span className={`lp-oc-meter-fill ${s.fill}`} />
            <span className={`lp-oc-meter-tick ${s.tick}`} aria-hidden="true" />
          </span>
          <span className="lp-oc-meter-val">{s.days}d</span>
        </li>
      ))}
    </ul>
  );
}

/** Three setup steps, all done. */
function SetupSteps() {
  const steps = ["Upload agreements", "Set your matrix", "Invite reviewers"];
  return (
    <ol className="lp-oc-steps" aria-label="Setup steps: upload agreements, set your matrix, invite reviewers">
      {steps.map((s, i) => (
        <li key={s} className="lp-oc-steps-item">
          <span className="lp-oc-steps-dot" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3.5 8.5l3 3 6-7" />
            </svg>
          </span>
          <span className="lp-oc-steps-text">
            <span className="lp-oc-steps-n">Step {i + 1}</span>
            {s}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** One bar split by how each clause compares with the matrix. */
function ClauseSplit() {
  // Out of 40 clauses; widths are literal classes.
  const parts = [
    { key: "within", label: "Within the matrix", n: 34, width: "w-[85%]" },
    { key: "fallback", label: "Acceptable fallback", n: 3, width: "w-[7.5%]" },
    { key: "deviates", label: "To review", n: 3, width: "w-[7.5%]" },
  ];
  return (
    <div className="lp-oc-split-bar" role="img" aria-label="Example: 34 clauses within the matrix, 3 acceptable fallbacks, 3 to review">
      <div className="lp-oc-split-track">
        {parts.map((p) => (
          <span key={p.key} className={`lp-oc-split-seg lp-oc-split-${p.key} ${p.width}`} />
        ))}
      </div>
      <ul className="lp-oc-split-key" aria-hidden="true">
        {parts.map((p) => (
          <li key={p.key}>
            <span className={`lp-oc-split-swatch lp-oc-split-${p.key}`} />
            <span className="lp-oc-split-n">{p.n}</span> {p.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A falling line: days to signature month by month. */
function TrendLine() {
  const values = [38, 34, 35, 29, 26, 22];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const w = 240;
  const h = 72;
  const max = 40;
  const min = 15;
  const x = (i: number) => (i / (values.length - 1)) * (w - 8) + 4;
  const y = (v: number) => h - 6 - ((v - min) / (max - min)) * (h - 12);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <div className="lp-oc-trend" role="img" aria-label="Example: average days to signature falling from 38 in January to 22 in June">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="lp-oc-trend-svg" aria-hidden="true">
        <line x1="0" x2={w} y1={h - 1} y2={h - 1} className="lp-oc-trend-axis" />
        <path d={d} className="lp-oc-trend-line" vectorEffect="non-scaling-stroke" />
        <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="3.5" className="lp-oc-trend-dot" />
      </svg>
      <div className="lp-oc-trend-axis-labels" aria-hidden="true">
        <span>{months[0]} · {values[0]} days</span>
        <span>{months[months.length - 1]} · {values[values.length - 1]} days</span>
      </div>
    </div>
  );
}
