"use client";

import { useState } from "react";
import { ChevronDown } from "@/components/ui/icons";
import { MotionFade, Reveal } from "@/components/landing/primitives";

/* ──────────────────────────────────────────────── */
/*  FAQs                                             */
/* ──────────────────────────────────────────────── */
export function FAQsSection() {
  const [open, setOpen] = useState<number | null>(null);

  const faqs = [
    {
      q: "How long until I get something useful?",
      a: "Upload a contract and the first clause extraction takes about 15 seconds. Setting up your playbook with your legal lead is usually an afternoon.",
    },
    {
      q: "Do you connect to the tools we already use?",
      a: "Blue-IQ connects to common document management systems, DocuSign, Salesforce, and Microsoft 365. API access is included on every plan.",
    },
    {
      q: "How is this different from a CLM?",
      a: "A CLM stores contracts. Blue-IQ reads them. It extracts each clause, scores it against your playbook, and flags what deviates. There's nothing to configure for weeks before you see a result.",
    },
    {
      q: "Is our contract data secure?",
      a: "Yes. Blue-IQ is aligned to SOC 2, GDPR, and HIPAA. Data is encrypted in transit and at rest, and your contracts are never used to train shared models.",
    },
    {
      q: "What document types can it read?",
      a: "SOWs, MSAs, NDAs, and amendments. PDF, DOCX, and scanned image-only files all work; OCR handles the scanned ones.",
    },
    {
      q: "Is there a free trial?",
      a: "Yes, no credit card needed. Sign up and analyze your first contract for free. Pricing scales with how many documents and people you have.",
    },
  ];

  return (
    <section className="px-5 md:px-10 py-24 md:py-32">
      <div className="mx-auto max-w-[760px]">
        <div className="mb-12 flex flex-col items-center gap-4 text-center">
          <Reveal
            as="h2"
            className="landing-h2 text-[clamp(28px,3vw,40px)] text-foreground leading-[1.1]"
            delay={1}
          >
            The things teams ask first.
          </Reveal>
        </div>

      <div className="flex flex-col divide-y divide-border border border-border rounded-xl overflow-hidden bg-card">
        {faqs.map((faq, i) => (
          <MotionFade key={faq.q} delay={i}>
            <div>
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-muted/50 transition-colors"
                aria-expanded={open === i}
              >
                <span className="text-[14.5px] font-semibold text-foreground">{faq.q}</span>
                <ChevronDown
                  size={16}
                  strokeWidth={2}
                  aria-hidden
                  className={`shrink-0 text-muted-foreground transition-transform duration-200 ${open === i ? "rotate-180" : ""}`}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-5">
                  <p className="text-[14px] leading-[1.65] text-muted-foreground">{faq.a}</p>
                </div>
              )}
            </div>
          </MotionFade>
        ))}
      </div>
      </div>
    </section>
  );
}
