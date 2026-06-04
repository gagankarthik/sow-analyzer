"use client";

import { useState } from "react";
import { Plus } from "@/components/ui/icons";
import { Reveal } from "@/components/landing/primitives";

/* ──────────────────────────────────────────────────────────────
   FAQs — ledger accordion + FAQPage structured data for SEO.
   ────────────────────────────────────────────────────────────── */
const FAQS = [
  {
    q: "How long until I get something useful?",
    a: "Upload a contract and the first clause extraction lands in seconds. Setting up your playbook with your legal lead is usually an afternoon — after that, every new document is scored against it automatically.",
  },
  {
    q: "How is this different from a CLM?",
    a: "A contract lifecycle manager stores contracts. Blue-IQ reads them. It extracts each clause, scores it against your playbook, and flags what deviates — with no weeks of configuration before you see a result.",
  },
  {
    q: "Is our contract data secure?",
    a: "Blue-IQ is aligned to SOC 2, GDPR, and HIPAA. Data is encrypted in transit and at rest, access is scoped per tenant, and your contracts are never used to train shared models.",
  },
  {
    q: "What document types can it read?",
    a: "SOWs, MSAs, NDAs, and amendments. PDF, DOCX, and scanned image-only files all work — OCR handles the scanned ones down to the individual clause.",
  },
  {
    q: "Do you connect to the tools we already use?",
    a: "Blue-IQ connects to common document management systems, DocuSign, Salesforce, and Microsoft 365. API access is included on every plan.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes, and no credit card is needed. Sign up and analyze your first contract for free. Pricing scales with the number of documents and people on the account.",
  },
];

export function FAQsSection() {
  const [open, setOpen] = useState<number | null>(0);

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section id="faq" className="scroll-mt-24 bg-[var(--surface-2)] px-5 py-24 md:px-10 md:py-32">
      {/* Structured data — rich results for the FAQ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div className="lg:sticky lg:top-[120px] lg:self-start">
          <Reveal as="span" className="led-marker inline-flex items-center gap-2 text-[var(--led-blue)]">
            <span className="inline-block h-2 w-2 rounded-[2px] bg-[var(--led-blue)]" />
            Common questions
          </Reveal>
          <Reveal as="h2" delay={1} className="led-display mt-5 text-[clamp(30px,3.4vw,48px)] text-[var(--led-ink)]">
            The things teams ask first.
          </Reveal>
          <Reveal as="p" delay={2} className="mt-5 max-w-[36ch] text-[15px] leading-[1.65] text-[var(--led-ink-soft)]">
            Still deciding? These are the questions that come up in the first call.
          </Reveal>
        </div>

        <ul className="divide-y divide-[var(--led-line)] border-y border-[var(--led-line)]">
          {FAQS.map((faq, i) => {
            const isOpen = open === i;
            return (
              <li key={faq.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-start justify-between gap-6 py-6 text-left"
                >
                  <span className="led-serif text-[18px] leading-snug text-[var(--led-ink)] md:text-[19px]">
                    {faq.q}
                  </span>
                  <span
                    className={[
                      "mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-all duration-200",
                      isOpen
                        ? "rotate-45 border-[var(--led-blue)] bg-[var(--led-blue)] text-white"
                        : "border-[var(--led-line-2)] text-[var(--led-ink)]",
                    ].join(" ")}
                  >
                    <Plus size={15} strokeWidth={2.25} />
                  </span>
                </button>
                <div
                  className={`grid transition-all duration-300 ease-out ${isOpen ? "grid-rows-[1fr] pb-6 opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                >
                  <div className="overflow-hidden">
                    <p className="max-w-[58ch] text-[14.5px] leading-[1.7] text-[var(--led-ink-soft)]">{faq.a}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
