import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import { EDITIONS, EDITION_IDS, type EditionId } from "@/components/landing/editions-data";
import { INDUSTRY_SECTIONS, type ProductSectionId } from "@/components/landing/site-nav";
import { Reveal } from "@/components/home/Reveal";

/* One Govern, two editions, compared row by row: who each is for, the
   agreements it reviews, what it checks and what it adds. Campus takes the
   matrix blue, Workforce the workflow violet. On narrow screens each row
   stacks, every cell labelled with its edition. The Industries menu links
   (`/#research-universities`, …) land on this section. */

const EDITION_AREA: Record<EditionId, ProductSectionId> = { campus: "matrix", workforce: "workflow" };

type Row = { label: string; cell: (id: EditionId) => ReactNode };

const ROWS: Row[] = [
  { label: "Built for", cell: (id) => EDITIONS[id].audience },
  { label: "Agreements it reviews", cell: (id) => EDITIONS[id].agreements.join(", ") },
  {
    label: "Checked against your matrix",
    cell: (id) => (
      <ul className="home-compare-list">
        {EDITIONS[id].checks.map((check) => (
          <li key={check.title}>{check.title}</li>
        ))}
      </ul>
    ),
  },
  {
    label: "Built in",
    cell: (id) => (
      <ul className="home-compare-list">
        {EDITIONS[id].features.map((feature) => (
          <li key={feature.title}>{feature.title}</li>
        ))}
      </ul>
    ),
  },
];

export function EditionComparison() {
  return (
    <section id="editions" className="home-section scroll-mt-20" aria-labelledby="editions-title">
      {INDUSTRY_SECTIONS.map(({ id }) => (
        <span key={id} id={id} className="home-anchor" aria-hidden="true" />
      ))}
      <div className="home-container">
        <Reveal className="home-section-head">
          <h2 id="editions-title" className="home-h2">
            Set up for the agreements you sign
          </h2>
          <p className="home-lede">
            One platform in two editions. Both share the same review, workflow and reporting; the edition decides
            the agreement types and the matrix positions your team starts from.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <table className="home-compare">
            <caption className="sr-only">Govern Campus and Govern Workforce compared</caption>
            <thead>
              <tr>
                <td />
                {EDITION_IDS.map((id) => (
                  <th key={id} scope="col" className={`lp-area-${EDITION_AREA[id]}`}>
                    <span className="home-compare-name">
                      <span className="home-compare-dot" aria-hidden="true" />
                      Govern {EDITIONS[id].name}
                    </span>
                    <span className="home-compare-tagline">{EDITIONS[id].tagline}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {EDITION_IDS.map((id) => (
                    <td key={id} data-edition={`Govern ${EDITIONS[id].name}`}>
                      {row.cell(id)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="home-compare-links">
                <td />
                {EDITION_IDS.map((id) => (
                  <td key={id} className={`lp-area-${EDITION_AREA[id]}`}>
                    <Link href={`/editions/${id}`} className="home-link home-link-area">
                      Explore Govern {EDITIONS[id].name} <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </Reveal>
      </div>
    </section>
  );
}
