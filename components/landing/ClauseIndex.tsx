/* The clause positions in the standard review matrix, in the same order and
   wording as the matrix Govern ships with (sow-analyser-backend
   shared/govern/matrix.py), so the site can't promise a different list from
   the product. Each customer edits these to match their own positions. */

const MATRIX_POSITIONS: { label: string; checks: string }[] = [
  { label: "Publication rights and review period", checks: "How long the sponsor may review before you publish, and whether they can block it." },
  { label: "Background and foreground IP", checks: "Who owns what you bring and what the work creates, and any licence back." },
  { label: "License grant scope", checks: "Exclusivity, field of use and territory against the scope you accept." },
  { label: "Royalties and milestones", checks: "Royalty rates, milestone payments, equity and sublicense income against your floor." },
  { label: "Indemnification and insurance", checks: "Who indemnifies whom, any cap, and whether your policy allows it." },
  { label: "Governing law", checks: "The law that governs the agreement against your home state." },
  { label: "Export control", checks: "Foreign-party and export restrictions that need your export control office." },
  { label: "Data rights and confidentiality", checks: "Data use, the confidentiality term and use of your organization's name." },
  { label: "Sponsor reporting and flow-down", checks: "Reporting duties and terms that flow down from a prime award." },
  { label: "Diligence and termination", checks: "Commercialization milestones and what happens if they are missed." },
];

export function ClauseIndex() {
  return (
    <section id="clauses" className="lp-band lp-section scroll-mt-20">
      <div className="lp-wrap">
        <h2 className="lp-h2 max-w-3xl">
          Ten positions in the standard matrix, <span className="lp-serif">ready to make your own.</span>
        </h2>
        <p className="lp-lede mt-5">
          Every agreement type starts from these. Change any position, fallback or reviewing office, or import your
          own matrix from Excel.
        </p>

        <dl className="mt-10 grid gap-x-10 border-b border-lp-line sm:grid-cols-2 lg:grid-cols-3">
          {MATRIX_POSITIONS.map((c) => (
            <div key={c.label} className="lp-index-row">
              <dt className="lp-index-term">{c.label}</dt>
              <dd className="mt-0.5 text-sm text-lp-ink-2">{c.checks}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
