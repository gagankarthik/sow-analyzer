"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  Gavel,
  ShoppingCart,
  Laptop,
  TrendingUp,
  Repeat,
} from "@/components/ui/icons";
import {
  Reveal,
  fadeUpVariants,
  staggerContainer,
} from "@/components/landing/primitives";

/* ──────────────────────────────────────────────── */
/*  Personas grid — one card per role               */
/* ──────────────────────────────────────────────── */
export function PersonasSection() {
  const personas: { title: string; body: string; icon: typeof Gavel }[] = [
    { title: "General Counsel", body: "See the risky clauses without reading all of them.", icon: Gavel },
    { title: "Procurement", body: "Catch slow payment terms and renewal traps early.", icon: ShoppingCart },
    { title: "IT", body: "Deploy quickly. SOC 2, GDPR, and HIPAA aligned.", icon: Laptop },
    { title: "Business Development", body: "Send redlines back to the customer the same day.", icon: TrendingUp },
    { title: "Legal Ops", body: "One version of every contract, fully searchable.", icon: Repeat },
    { title: "HR & Compliance", body: "A clause-level audit trail that holds up.", icon: ShieldCheck },
  ];

  return (
    <section className="bg-[var(--surface-2)] px-5 md:px-10 py-24 md:py-32">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-12 flex flex-col items-center gap-4 text-center md:mb-14">
          <Reveal as="span" className="led-marker inline-flex items-center gap-2 text-[var(--led-blue)]">
            <span className="inline-block h-2 w-2 rounded-[2px] bg-[var(--led-blue)]" />
            For every role
          </Reveal>
          <Reveal as="h2" className="led-display max-w-[820px] text-[clamp(30px,3.4vw,46px)] leading-[1.05] text-[var(--led-ink)]">
            One contract, a view for every role.
          </Reveal>
          <Reveal as="p" className="max-w-[60ch] text-[15px] leading-[1.65] text-[var(--led-ink-soft)]" delay={2}>
            The team that signs the contract and the team that delivers on it read from the same
            clauses and the same risk scores. Each role sees what its job needs.
          </Reveal>
        </div>

        <motion.div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-5%" }}
        >
          {personas.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.article
                key={p.title}
                variants={fadeUpVariants}
                custom={i}
                className="group flex h-full flex-col rounded-xl border border-[var(--led-line)] bg-white p-6 transition-colors hover:border-[var(--led-line)] md:p-7"
              >
                <div className="mb-5 flex items-start justify-between gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--led-cream)] text-[var(--led-blue)] transition-colors group-hover:bg-[var(--led-ink)] group-hover:text-[var(--led-cream)]">
                    <Icon size={19} strokeWidth={1.75} />
                  </span>
                  <span className="led-display text-[20px] leading-none text-[var(--led-line-2)]" aria-hidden>0{i + 1}</span>
                </div>
                <h3 className="led-serif text-[18px] text-[var(--led-ink)]">{p.title}</h3>
                <p className="mt-2 text-[14px] leading-[1.55] text-[var(--led-ink-soft)]">{p.body}</p>
                <span className="mt-auto inline-flex items-center gap-1 pt-5 text-[12.5px] font-semibold text-[var(--led-ink-soft)] transition-colors group-hover:text-[var(--led-blue)]">
                  See the workflow
                  <ArrowRight size={12} strokeWidth={2.25} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
