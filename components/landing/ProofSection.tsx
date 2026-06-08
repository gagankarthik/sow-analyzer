"use client";

import { TestimonialsColumn, type Testimonial } from "@/components/TestimonialsColumn";
import { Reveal } from "@/components/landing/primitives";

/* ──────────────────────────────────────────────── */
/*  Proof section — testimonials + media mentions    */
/* ──────────────────────────────────────────────── */
export function ProofSection() {
  const testimonials: Testimonial[] = [
    { text: "Our review cycle went from about three weeks to one. The liability-cap flags are what sold the team — we'd missed a 3x cap before.", name: "Mira Holm", role: "Head of Contracts · Obelisk Capital", initials: "MH" },
    { text: "Redlines that used to wait for legal now reach the customer the same day. Sonar drafts a first counter we mostly keep.", name: "James Okoye", role: "VP Sales Ops · Northwind Logistics", initials: "JO" },
    { text: "It flagged the same renewal clause across three vendor contracts in our first week. We'd have caught those late, if at all.", name: "Priya Mehta", role: "Legal Ops Lead · Vector Bio", initials: "PM" },
    { text: "Each clause is scored and cited to the section. I stopped re-reading boilerplate and just look at what changed.", name: "Daniel Reyes", role: "General Counsel · Almac Pharma", initials: "DR" },
    { text: "The amendment diffs are the part I use daily. I can see exactly how each change moved the total value.", name: "Sara Lindqvist", role: "Procurement Director · Cresso Cloud", initials: "SL" },
    { text: "Contract value finally reconciles across amendments. We retired the spreadsheet that nobody trusted anyway.", name: "Tom Whitfield", role: "Finance Lead · Finline Mutual", initials: "TW" },
    { text: "Our auditor asked for the change history on a clause and we just exported it. SOC 2 prep was a lot quieter this year.", name: "Aisha Bello", role: "Deputy GC · Holmgate Defense", initials: "AB" },
    { text: "When Sonar answers, it points to the clause. A new reviewer was useful by the end of their first day.", name: "Marco Bianchi", role: "Head of Legal · Wickline Foods", initials: "MB" },
    { text: "We answer a few questions and get a clean first SOW into Word. It's not final, but it saves the blank-page hour.", name: "Elena Park", role: "COO · Vesper Components", initials: "EP" },
  ];

  return (
    <section id="customers" className="scroll-mt-20 px-5 md:px-10 py-24 md:py-32">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-12 flex flex-col items-center gap-4 text-center">
          <Reveal as="h2" className="landing-h2 text-[clamp(28px,3.2vw,44px)] text-foreground leading-[1.1] max-w-[680px]">
            What contract teams tell us.
          </Reveal>
        </div>

        <div className="relative mx-auto flex h-[600px] justify-center gap-6 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,#000_12%,#000_88%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,#000_12%,#000_88%,transparent)]">
          <TestimonialsColumn testimonials={testimonials.slice(0, 3)} duration={20} />
          <TestimonialsColumn testimonials={testimonials.slice(3, 6)} duration={26} className="hidden md:block" />
          <TestimonialsColumn testimonials={testimonials.slice(6, 9)} duration={22} className="hidden lg:block" />
        </div>
      </div>
    </section>
  );
}
