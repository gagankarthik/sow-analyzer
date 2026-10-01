import { CLAUSE_TYPES } from "@/lib/clause-types";

/* Clause index — the taxonomy Sonar extracts, read straight from the
   shared clause-type data so it can't drift from the product. */
export function ClauseIndex() {
  const named = CLAUSE_TYPES.filter((c) => c.id !== "other");

  return (
    <section id="clauses" className="lp-wrap scroll-mt-20 pb-20 md:pb-28">
      <h2 className="lp-h2 max-w-2xl">{named.length} clause types, found and filed on every pass.</h2>

      <dl className="mt-10 grid gap-x-10 border-b border-lp-line sm:grid-cols-2 lg:grid-cols-3">
        {named.map((c) => (
          <div key={c.id} className="lp-index-row">
            <dt className="lp-index-term">{c.label}</dt>
            <dd className="mt-0.5 text-sm text-lp-ink-3">{c.blurb}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
