"use client";

import { motion } from "framer-motion";
import { Check } from "@/components/ui/icons";
import { SonarMark } from "@/components/ui/SonarMark";
import { ComingSoonBadge } from "@/components/landing/ComingSoon";
import { EASE_OUT } from "@/components/home/Reveal";

/* The platform tour's product views, one per area, drawn as the product
   would show them rather than as generic tables: positions as gauges,
   workflow as a stage bar and activity, value as a composition, and
   obligations as a dated timeline. Widths and positions come from the
   data, so they animate in through motion props. */

const SPRING = { type: "spring", stiffness: 120, damping: 20 } as const;

/* ─── Matrix review: where each clause lands against your position ─── */

type Zone = { tone: "within" | "fallback" | "out"; width: number };
type Gauge = {
  clause: string;
  zones: Zone[];
  /** Where the contract lands, as a percentage of the track. */
  marker: number;
  rule: string;
  contract: string;
  verdict: { tier: "within" | "fallback" | "unacceptable"; label: string };
};

const GAUGES: Gauge[] = [
  {
    clause: "Publication review",
    zones: [{ tone: "within", width: 20 }, { tone: "fallback", width: 20 }, { tone: "out", width: 60 }],
    marker: 90,
    rule: "Standard 30 days · fallback 60",
    contract: "135 days",
    verdict: { tier: "unacceptable", label: "Not acceptable" },
  },
  {
    clause: "Royalty rate",
    zones: [{ tone: "out", width: 58 }, { tone: "fallback", width: 9 }, { tone: "within", width: 33 }],
    marker: 61,
    rule: "Standard 4% · fallback 3.5%",
    contract: "3.6%",
    verdict: { tier: "fallback", label: "Fallback" },
  },
  {
    clause: "Payment terms",
    zones: [{ tone: "within", width: 33 }, { tone: "fallback", width: 17 }, { tone: "out", width: 50 }],
    marker: 24,
    rule: "Standard 30 days · fallback 45",
    contract: "Net 21",
    verdict: { tier: "within", label: "Within" },
  },
];

export function MatrixPreview() {
  return (
    <div className="home-panel">
      <div className="home-preview-head">
        <p className="home-panel-title">Exclusive license · matrix v3</p>
        <span className="home-preview-chip">
          <SonarMark size="xs" />3 positions
        </span>
      </div>
      <ul className="home-gauges">
        {GAUGES.map((gauge, index) => (
          <li key={gauge.clause}>
            <div className="home-gauge-head">
              <span className="home-gauge-clause">{gauge.clause}</span>
              <span className={`home-badge home-badge-${gauge.verdict.tier}`}>{gauge.verdict.label}</span>
            </div>
            <div className="home-gauge-track">
              {gauge.zones.map((zone, zoneIndex) => (
                <motion.span
                  key={zoneIndex}
                  className={`home-zone home-zone-${zone.tone}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${zone.width}%` }}
                  transition={{ duration: 0.5, ease: EASE_OUT, delay: index * 0.08 }}
                />
              ))}
              <motion.span
                className="home-gauge-marker"
                initial={{ left: "0%" }}
                animate={{ left: `${gauge.marker}%` }}
                transition={{ ...SPRING, delay: 0.25 + index * 0.08 }}
              />
            </div>
            <div className="home-gauge-meta">
              <span>{gauge.rule}</span>
              <span>
                Contract <strong>{gauge.contract}</strong>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Workflow: where the contract is, who has it, what happened ─── */

const WORKFLOW_STAGES = ["Draft", "Review", "Redlines", "Edits", "Approval", "Signature", "Signed"];
const CURRENT_STAGE = 3;

const ACTIVITY = [
  { who: "AA", tone: "workflow", text: "Allegheny Aero returned version 2", when: "Today" },
  { who: "S", tone: "matrix", text: "Sonar checked version 2: 13 of 14 clauses within", when: "Today" },
  { who: "RA", tone: "value", text: "Research administration sent redlines for 3 clauses", when: "4 days ago" },
];

export function WorkflowPreview() {
  return (
    <div className="home-panel">
      <div className="home-preview-head">
        <p className="home-panel-title">Collaboration: quantum sensors</p>
        <span className="home-preview-chip">Round 2</span>
      </div>

      <div className="home-stagebar" aria-hidden="true">
        {WORKFLOW_STAGES.map((stage, index) => (
          <motion.span
            key={stage}
            className="home-stagebar-segment"
            data-state={index < CURRENT_STAGE ? "done" : index === CURRENT_STAGE ? "current" : "next"}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.35, ease: EASE_OUT, delay: index * 0.05 }}
          />
        ))}
      </div>
      <p className="home-stagebar-label">
        <span>
          <strong>{WORKFLOW_STAGES[CURRENT_STAGE]}</strong> · stage {CURRENT_STAGE + 1} of {WORKFLOW_STAGES.length}
        </span>
        <span className="home-stagebar-next">
          Next: Approval, then Signature
          <ComingSoonBadge feature="docusign" className="ml-1" />
        </span>
      </p>

      <div className="home-waiting">
        <span className="home-avatar lp-area-workflow">AA</span>
        <span className="min-w-0">
          <span className="home-waiting-title">Waiting on Allegheny Aero</span>
          <span className="home-waiting-meta">4 days · owner: Research administration</span>
        </span>
        <span className="home-badge home-badge-neutral">On time</span>
      </div>

      <ol className="home-activity">
        {ACTIVITY.map((item, index) => (
          <motion.li
            key={item.text}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT, delay: 0.2 + index * 0.08 }}
          >
            <span className={`home-avatar home-avatar-sm lp-area-${item.tone}`}>{item.who}</span>
            <span className="home-activity-text">{item.text}</span>
            <span className="home-activity-when">{item.when}</span>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

/* ─── Value: what is signed, coming and held up ─── */

const VALUE_PARTS = [
  { key: "current", label: "Current", value: 4.2, note: "Signed and active" },
  { key: "potential", label: "Potential", value: 1.9, note: "In review" },
  { key: "held", label: "Held up", value: 0.7, note: "Past target" },
] as const;
const VALUE_TOTAL = VALUE_PARTS.reduce((sum, part) => sum + part.value, 0);

const HELD_UP = [
  { holder: "With the other side", value: 0.31 },
  { holder: "Legal affairs", value: 0.21 },
  { holder: "Export control", value: 0.18 },
];

export function ValuePreview() {
  return (
    <div className="home-panel">
      <div className="home-preview-head">
        <p className="home-panel-title">Contract value · fiscal year 2026</p>
        <span className="home-preview-chip">${VALUE_TOTAL.toFixed(1)}M total</span>
      </div>

      <div className="home-kpis">
        {VALUE_PARTS.map((part) => (
          <div key={part.key} className={`home-kpi home-kpi-${part.key}`}>
            <p className="home-kpi-label">
              <i aria-hidden="true" />
              {part.label}
            </p>
            <p className="home-kpi-value">${part.value.toFixed(1)}M</p>
            <p className="home-kpi-note">{part.note}</p>
          </div>
        ))}
      </div>

      <div className="home-composition" aria-hidden="true">
        {VALUE_PARTS.map((part, index) => (
          <motion.span
            key={part.key}
            className={`home-composition-${part.key}`}
            initial={{ width: 0 }}
            animate={{ width: `${(part.value / VALUE_TOTAL) * 100}%` }}
            transition={{ duration: 0.6, ease: EASE_OUT, delay: index * 0.1 }}
          />
        ))}
      </div>

      <p className="home-panel-subtitle">Held up, by who has it</p>
      <ul className="home-heldup">
        {HELD_UP.map((row, index) => (
          <li key={row.holder}>
            <span>{row.holder}</span>
            <span className="home-heldup-track">
              <motion.span
                className="home-heldup-fill"
                initial={{ width: 0 }}
                animate={{ width: `${(row.value / HELD_UP[0].value) * 100}%` }}
                transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.3 + index * 0.08 }}
              />
            </span>
            <span className="home-heldup-value">${row.value.toFixed(2)}M</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Obligations: dated duties, each verified by a person ─── */

const OBLIGATIONS = [
  { month: "Nov", day: "14", title: "Annual progress report to sponsor", source: "§6.1 Reporting", verified: true },
  { month: "Dec", day: "31", title: "Royalty payment, Q4", source: "§4.3 Royalties", verified: true },
  { month: "Jan", day: "30", title: "Milestone fee on first sale", source: "§4.5 Milestones", verified: false },
  { month: "Aug", day: "31", title: "Term ends; renewal notice due by Jul 2", source: "§12.1 Term", verified: false },
];

export function ObligationsPreview() {
  const verified = OBLIGATIONS.filter((item) => item.verified).length;
  return (
    <div className="home-panel">
      <div className="home-preview-head">
        <p className="home-panel-title">License: lactate biosensor</p>
        <span className="home-preview-chip">
          <SonarMark size="xs" />
          {verified} of {OBLIGATIONS.length} verified
        </span>
      </div>
      <ol className="home-timeline">
        {OBLIGATIONS.map((item, index) => (
          <motion.li
            key={item.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT, delay: index * 0.07 }}
          >
            <span className="home-date">
              <span className="home-date-month">{item.month}</span>
              <span className="home-date-day">{item.day}</span>
            </span>
            <span className="min-w-0">
              <span className="home-timeline-title">{item.title}</span>
              <span className="home-timeline-source">{item.source}</span>
            </span>
            {item.verified ? (
              <span className="home-badge home-badge-within">
                <Check size={12} aria-hidden="true" />
                Verified
              </span>
            ) : (
              <span className="home-verify">Verify</span>
            )}
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
