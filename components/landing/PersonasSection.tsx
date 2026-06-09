"use client";

import { motion } from "framer-motion";
import { Search, Check, ArrowRight } from "@/components/ui/icons";
import {
  Reveal,
  fadeUpVariants,
  staggerContainer,
} from "@/components/landing/primitives";

/* ──────────────────────────────────────────────────────────────
   Personas — a feature-card grid (preview mockup on top, label
   below), one card per role. Each preview is a small, role-specific
   product mock so the card shows what that team actually sees, in
   the style of the reference's "features for every team" layout.
   ────────────────────────────────────────────────────────────── */

/* Preview · General Counsel — a scored clause list */
function ClauseRiskPreview() {
  const rows = [
    { ref: "7.2", title: "Limitation of Liability", c: "var(--led-crit)" },
    { ref: "4.2", title: "Service Level Agreement", c: "var(--led-high)" },
    { ref: "3.4", title: "Payment Terms", c: "var(--led-low)" },
  ];
  return (
    <div className="w-full max-w-[250px] rounded-xl border border-[var(--led-line)] bg-[var(--paper-elev)] p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--led-ink-soft)]">Clauses · scored</span>
        <span className="rounded bg-[var(--led-crit)]/10 px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-[0.08em] text-[var(--led-crit)]">2 flagged</span>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.ref} className="flex items-center gap-2 rounded-md bg-[var(--surface-2)] px-2 py-1.5">
            <span className="font-mono text-[9.5px] text-[var(--led-ink-soft)]">{r.ref}</span>
            <span className="flex-1 truncate text-[11px] text-[var(--led-ink)]">{r.title}</span>
            <span className="h-2 w-2 rounded-full" style={{ background: r.c }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* Preview · Procurement — payment + renewal watch */
function RenewalPreview() {
  return (
    <div className="w-full max-w-[250px] space-y-2">
      <div className="flex gap-2">
        <span className="flex-1 rounded-lg border border-[var(--led-line)] bg-[var(--paper-elev)] px-2.5 py-2 text-[11px] font-medium text-[var(--led-ink)] shadow-sm">
          Net-60 terms
        </span>
        <span className="inline-flex items-center rounded-lg bg-[var(--pix-pink)] px-2.5 py-2 text-[11px] font-semibold text-[#1A1A18]">
          Slow pay
        </span>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-[var(--led-line)] bg-[var(--paper-elev)] px-2.5 py-2 shadow-sm">
        <span className="text-[11px] text-[var(--led-ink)]">Auto-renews in</span>
        <span className="font-mono text-[12px] font-bold tabular-nums text-[var(--led-crit)]">11 days</span>
      </div>
      <div className="flex items-center gap-1.5 px-1">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--pix-coral)]" />
        <span className="text-[10px] text-[var(--led-ink-soft)]">90-day cancellation notice required</span>
      </div>
    </div>
  );
}

/* Preview · IT — compliance posture badges */
function CompliancePreview() {
  return (
    <div className="flex w-full max-w-[250px] flex-col gap-1.5">
      {["SOC 2 Type II", "GDPR", "HIPAA"].map((b) => (
        <div key={b} className="flex items-center gap-2.5 rounded-lg border border-[var(--led-line)] bg-[var(--paper-elev)] px-3 py-2 shadow-sm">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[var(--led-low)]/12 text-[var(--led-low)]">
            <Check size={12} strokeWidth={3} />
          </span>
          <span className="flex-1 text-[11.5px] font-medium text-[var(--led-ink)]">{b}</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--led-ink-soft)]">aligned</span>
        </div>
      ))}
    </div>
  );
}

/* Preview · Business Development — a redline diff */
function RedlinePreview() {
  return (
    <div className="w-full max-w-[250px] rounded-xl border border-[var(--led-line)] bg-[var(--paper-elev)] p-3 font-mono text-[10.5px] shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-[0.12em] text-[var(--led-ink-soft)]">Clause 7.2 · redline</span>
      </div>
      <p className="mb-1 rounded bg-[var(--led-crit)]/8 px-2 py-1 leading-snug text-[var(--led-crit)] line-through decoration-[var(--led-crit)]/50">
        liability capped at 2× fees paid
      </p>
      <p className="rounded bg-[var(--led-low)]/10 px-2 py-1 leading-snug text-[var(--led-low)]">
        liability capped at 1× fees paid
      </p>
    </div>
  );
}

/* Preview · Legal Ops — search across contracts */
function SearchPreview() {
  return (
    <div className="w-full max-w-[250px] space-y-2">
      <div className="flex items-center gap-2 rounded-lg border border-[var(--led-line)] bg-[var(--paper-elev)] px-2.5 py-2 shadow-sm">
        <Search size={13} className="text-[var(--led-ink-soft)]" />
        <span className="text-[11px] text-[var(--led-ink)]">liability cap</span>
        <span className="ml-auto font-mono text-[9px] text-[var(--led-ink-soft)]">14 hits</span>
      </div>
      {["Northwind MSA · 7.2", "Vertex SOW-12 · 9.1"].map((r) => (
        <div key={r} className="flex items-center gap-2 rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5">
          <span className="h-1.5 w-1.5 rounded-[1px] bg-[var(--pix-peri)]" />
          <span className="text-[10.5px] text-[var(--led-ink-soft)]">{r}</span>
        </div>
      ))}
    </div>
  );
}

/* Preview · HR & Compliance — clause-level audit trail */
function AuditPreview() {
  const log = [
    { who: "PM", what: "edited 7.2", c: "var(--pix-peri)" },
    { who: "GC", what: "approved · signed off", c: "var(--led-low)" },
    { who: "DR", what: "uploaded v1", c: "var(--pix-pink2)" },
  ];
  return (
    <div className="w-full max-w-[250px] rounded-xl border border-[var(--led-line)] bg-[var(--paper-elev)] p-3 shadow-sm">
      <ol className="relative space-y-2.5 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-px before:bg-[var(--led-line)]">
        {log.map((e) => (
          <li key={e.who} className="relative flex items-center gap-2.5">
            <span
              className="z-[1] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[8.5px] font-bold text-white ring-4 ring-[var(--paper-elev)]"
              style={{ background: e.c }}
            >
              {e.who}
            </span>
            <span className="text-[11px] text-[var(--led-ink)]">{e.what}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function PersonasSection() {
  const personas: { title: string; body: string; preview: React.ReactNode }[] = [
    { title: "General Counsel", body: "See the risky clauses without reading all of them — scored and ranked the moment a file lands.", preview: <ClauseRiskPreview /> },
    { title: "Procurement", body: "Catch slow payment terms and renewal traps early, while there's still time to renegotiate.", preview: <RenewalPreview /> },
    { title: "IT & Security", body: "Deploy in minutes on a platform that's SOC 2, GDPR, and HIPAA aligned end to end.", preview: <CompliancePreview /> },
    { title: "Business Development", body: "Send redlines back to the customer the same day, drawn straight from your playbook.", preview: <RedlinePreview /> },
    { title: "Legal Ops", body: "One searchable version of every contract — find any clause across the whole portfolio.", preview: <SearchPreview /> },
    { title: "HR & Compliance", body: "A clause-level audit trail that holds up — every edit, approval, and upload is logged.", preview: <AuditPreview /> },
  ];

  return (
    <section className="bg-[var(--surface-2)] px-5 md:px-10 py-24 md:py-32">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-12 max-w-[640px] md:mb-14">
          <Reveal as="h2" className="led-display text-[clamp(30px,3.6vw,50px)] leading-[1.04] text-[var(--led-ink)]">
            One contract, a view for every role.
          </Reveal>
          <Reveal as="p" delay={1} className="mt-5 max-w-[58ch] text-[16px] leading-[1.65] text-[var(--led-ink-soft)]">
            The team that signs the contract and the team that delivers on it read from the same
            clauses and the same risk scores. Each role sees exactly what its job needs.
          </Reveal>
        </div>

        <motion.div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-5%" }}
        >
          {personas.map((p, i) => (
            <motion.article
              key={p.title}
              variants={fadeUpVariants}
              custom={i}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--led-line)] bg-[var(--paper-elev)] transition-colors hover:border-[var(--led-line-2)]"
            >
              {/* preview mockup */}
              <div className="flex h-[176px] items-center justify-center border-b border-[var(--led-line)] bg-[var(--page-bg)] p-5">
                {p.preview}
              </div>
              {/* label */}
              <div className="flex flex-1 flex-col p-5 md:p-6">
                <h3 className="led-serif text-[17px] text-[var(--led-ink)]">{p.title}</h3>
                <p className="mt-1.5 text-[13px] leading-[1.55] text-[var(--led-ink-soft)]">{p.body}</p>
                <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[12px] font-semibold text-[var(--led-ink-soft)] transition-colors group-hover:text-[var(--led-ink)]">
                  See the workflow
                  <ArrowRight size={12} strokeWidth={2.25} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
