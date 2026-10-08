import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import { INDUSTRY_SECTIONS, type IndustrySectionId } from "@/components/landing/site-nav";

/* Industries Govern is built for. Each row has the id the Solutions menu
   and the footer link to (`/#research-universities`...). */

const AGREEMENTS: Record<IndustrySectionId, string> = {
  "research-universities": "Sponsored research, licenses, options, MTAs and NDAs, with publication rights, sovereign immunity and state governing law checked on every one.",
  "academic-medical-centers": "Clinical trial, data use and research agreements, rated for confidentiality, data rights, indemnity and insurance limits.",
  "research-institutes": "Grants, subawards and collaborations, checked for flow-down terms, reporting obligations and IP ownership.",
  "life-sciences": "Licensing in and sponsored research out, against your positions on royalties, milestones, diligence and field of use.",
};

export function Industries() {
  return (
    <section id="industries" className="lp-section scroll-mt-20" aria-labelledby="industries-title">
      <div className="lp-wrap lp-split">
        <div>
          <h2 id="industries-title" className="lp-h2">
            Built for <span className="lp-serif">research agreements.</span>
          </h2>
          <p className="lp-body mt-4">
            The clause types, offices and value reporting follow how research organisations work, not a
            sales pipeline.
          </p>
          <Link href="/solutions#research-universities" className="lp-link mt-6 inline-flex items-center gap-1">
            Govern by industry
            <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
        <ul className="lp-industries">
          {INDUSTRY_SECTIONS.map(({ id, label }) => (
            <li key={id} id={id} className="lp-industry scroll-mt-24">
              <h3 className="lp-h3">{label}</h3>
              <p className="mt-2 text-lp-ink-2">{AGREEMENTS[id]}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
