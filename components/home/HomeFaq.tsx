import { Reveal } from "@/components/home/Reveal";

/* The questions a buyer asks before booking a demo, answered in full.
   Each answer restates something the page and the editions already say,
   so nothing here is a new claim. Answers open on demand (native
   <details>, no script), and the same items feed the page's FAQPage
   JSON-LD through HOME_FAQ. */

export const HOME_FAQ: { q: string; a: string }[] = [
  {
    q: "How does Govern review a contract?",
    a: "Sonar, the AI in Govern, reads every clause, scanned pages included. Your review matrix then rates each clause against your standard and the fallback you accept, and each exception goes to the office your matrix names, with the clause, the rule and suggested language.",
  },
  {
    q: "Can we use our own review matrix?",
    a: "Yes. Import the matrix your office already keeps in Excel, or edit it in Govern. Each position has a standard, an acceptable fallback and the office that approves exceptions, and changing a position re-checks every open agreement.",
  },
  {
    q: "Which agreements does Govern review?",
    a: "Govern Campus reviews sponsored research, license and option, material transfer, grant and subaward, clinical trial and data use agreements. Govern Workforce reviews statements of work, master services, staffing vendor agreements, amendments and change orders. Both review confidentiality agreements and software purchases.",
  },
  {
    q: "What happens to obligations after signing?",
    a: "Sonar finds the reports, payments, milestones and term ends in the signed agreement. Each one waits for a person to verify it before it is tracked to its date, so every due date can be trusted.",
  },
  {
    q: "Is our contract data used to train AI models?",
    a: "No. No model is trained on your documents. Contracts are encrypted with AES-256 at rest and TLS 1.2 or later in transit, and each organization's workspace is isolated. A signed Data Processing Agreement and the sub-processor list are available on request.",
  },
  {
    q: "What do we need for a demo?",
    a: "One contract and your matrix, as a spreadsheet or a document. We run the review before the call, then walk your team through every rating and the next step.",
  },
];

export function HomeFaq() {
  return (
    <section id="faq" className="home-section scroll-mt-20" aria-labelledby="faq-title">
      <div className="home-container home-faq">
        <Reveal className="home-faq-head">
          <h2 id="faq-title" className="home-h2">
            Questions buyers ask
          </h2>
          <p className="home-lede">Straight answers before you book a call.</p>
        </Reveal>
        <div className="home-faq-list">
          {HOME_FAQ.map((item) => (
            <details key={item.q} className="home-faq-item">
              <summary>
                <span>{item.q}</span>
                <span className="home-faq-icon" aria-hidden="true" />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
