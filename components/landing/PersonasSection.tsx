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
    { title: "HR &Compliance", body: "A clause-level audit trail that holds up.", icon: ShieldCheck },
  ];

  return (
    <section className="px-5 md:px-10 py-24 md:py-32">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-12 flex flex-col items-center gap-4 text-center md:mb-14">
          <Reveal as="h2" className="landing-h2 max-w-[820px] text-[clamp(28px,3.2vw,44px)] leading-[1.1] text-foreground">
            One contract.<br className="hidden sm:block" />{" "}
            <span className="text-muted-foreground">A view for every role.</span>
          </Reveal>
          <Reveal as="p" className="max-w-[640px] text-[15px] leading-[1.6] text-muted-foreground" delay={2}>
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
                className="group h-full rounded-xl border border-border bg-card p-6 transition-colors hover:border-[var(--border-strong)] md:p-7"
              >
                <div className="mb-5 flex items-start justify-between gap-3">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)] ring-1 ring-[var(--brand-primary-100)] transition-transform group-hover:scale-105">
                    <Icon size={20} strokeWidth={1.75} />
                  </span>
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground" aria-hidden>0{i + 1}</span>
                </div>
                <h3 className="text-[18px] font-semibold tracking-tight text-foreground">{p.title}</h3>
                <p className="mt-2 text-[14px] leading-[1.55] text-muted-foreground">{p.body}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-muted-foreground transition-colors group-hover:text-foreground">
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
