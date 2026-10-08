import { CLAUSE_TYPES } from "@/lib/clause-types";

/* Clause index: the taxonomy Sonar extracts, read straight from the
   shared clause-type data so it can't drift from the product. */
export function ClauseIndex() {
  const named = CLAUSE_TYPES.filter((c) => c.id !== "other");

  return (
    <section id="clauses" className="lp-band lp-section scroll-mt-20">
      <div className="lp-wrap">
        <h2 className="lp-h2 max-w-2xl">{named.length} clause types, found and filed on every pass.</h2>

        <dl className="mt-10 grid gap-x-10 border-b border-lp-line sm:grid-cols-2 lg:grid-cols-3">
          {named.map((c) => (
            <div key={c.id} className="lp-index-row">
              <dt className="lp-index-term">{c.label}</dt>
              <dd className="mt-0.5 text-sm text-lp-ink-2">{c.blurb}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
