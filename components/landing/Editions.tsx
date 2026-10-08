import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { EDITIONS, EDITION_IDS } from "@/components/landing/editions-data";

/* One Govern, two editions: the same workflow, matrix and reporting, with the
   agreement types and checks of the team that uses it. */

export function Editions() {
  return (
    <section id="editions" className="lp-section" aria-labelledby="editions-title">
      <div className="lp-wrap">
        <div className="lp-center-head">
          <h2 id="editions-title" className="lp-h2">
            One platform, <span className="lp-serif">two editions.</span>
          </h2>
          <p className="lp-lede mx-auto mt-5">
            The same review, workflow and reporting, set up for the agreements your team actually signs.
          </p>
        </div>

        <ul className="lp-editions">
          {EDITION_IDS.map((id) => {
            const e = EDITIONS[id];
            return (
              <li key={id} className="lp-edition">
                <p className="lp-edition-kicker">{e.tagline}</p>
                <h3 className="lp-edition-name">Govern {e.name}</h3>
                <p className="lp-edition-audience">{e.audience}</p>
                <p className="lp-edition-label">Agreements</p>
                <p className="lp-edition-types">{e.agreements.slice(0, 4).join(" · ")}</p>
                <p className="lp-edition-label">Checked against your matrix</p>
                <ul className="lp-edition-checks">
                  {e.checks.map((c) => (
                    <li key={c.title}><Check size={16} aria-hidden="true" />{c.title}</li>
                  ))}
                </ul>
                <Link href={`/editions/${id}`} className="lp-trust-link mt-auto">
                  Explore Govern {e.name} <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
