import { ClauseSplitCard, NextStepCard } from "@/components/landing/ProductCards";

/* What reviewers stop doing: four chores, each beside what replaces it in
   the product, and the two pieces of product that do the replacing. */

const CHORES = [
  { before: "Read all forty clauses to find the three that matter.", after: "Open the three that fall outside your matrix. The rest are already rated." },
  { before: "Keep the playbook open in a spreadsheet beside the contract.", after: "Each clause shows your standard position and fallback next to its rating." },
  { before: "Write the same redline language again for every counterparty.", after: "Sonar drafts the suggested language from your matrix. You accept or edit it." },
  { before: "Email around to find out who has the contract.", after: "The board shows the owner, the next step and how long it has waited." },
];

export function ReviewersSection() {
  return (
    <section id="reviewers" className="lp-section scroll-mt-20" aria-labelledby="reviewers-title">
      <div className="lp-wrap">
        <h2 id="reviewers-title" className="lp-h2">
          What reviewers <span className="lp-serif">stop doing.</span>
        </h2>

        <div className="lp-chores-grid">
          <table className="lp-chores">
            <caption className="sr-only">Review work before and with Govern</caption>
            <thead>
              <tr>
                <th scope="col">Before</th>
                <th scope="col">With Govern</th>
              </tr>
            </thead>
            <tbody>
              {CHORES.map((c) => (
                <tr key={c.before}>
                  <td className="lp-chores-before">{c.before}</td>
                  <td className="lp-chores-after">{c.after}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="lp-chores-ui" aria-label="Govern review summary and next step for an example agreement" role="img">
            <ClauseSplitCard />
            <NextStepCard />
          </div>
        </div>
      </div>
    </section>
  );
}
