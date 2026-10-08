"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { EDITIONS, EDITION_IDS, type EditionId } from "@/components/landing/editions-data";

/* One Govern, two editions: a switch between Campus and Workforce, and the
   chosen edition's agreements, checks and features below it. Both panels are
   in the HTML (the other one hidden), so search engines read both. */

export function Editions() {
  const [active, setActive] = useState<EditionId>("campus");
  const tabs = useRef<Record<EditionId, HTMLButtonElement | null>>({ campus: null, workforce: null });

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const next: EditionId = e.key === "Home" ? "campus" : e.key === "End" ? "workforce" : active === "campus" ? "workforce" : "campus";
    setActive(next);
    tabs.current[next]?.focus();
  };

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

        <div role="tablist" aria-label="Editions" className="lp-eswitch" onKeyDown={onKey}>
          {EDITION_IDS.map((id) => (
            <button
              key={id}
              ref={(el) => { tabs.current[id] = el; }}
              type="button"
              role="tab"
              id={`edition-tab-${id}`}
              aria-selected={active === id}
              aria-controls={`edition-panel-${id}`}
              tabIndex={active === id ? 0 : -1}
              onClick={() => setActive(id)}
              className="lp-eswitch-tab"
            >
              {EDITIONS[id].name}
            </button>
          ))}
        </div>
        <p className="lp-eswitch-caption" aria-live="polite">{EDITIONS[active].tagline}</p>

        {EDITION_IDS.map((id) => {
          const e = EDITIONS[id];
          return (
            <div
              key={id}
              role="tabpanel"
              id={`edition-panel-${id}`}
              aria-labelledby={`edition-tab-${id}`}
              hidden={active !== id}
              className="lp-epanel"
            >
              <div className="lp-epanel-intro">
                <h3 className="lp-edition-name">Govern {e.name}</h3>
                <p className="lp-edition-audience">{e.audience}</p>
                <p className="lp-edition-label">Agreements</p>
                <ul className="lp-edition-chips">
                  {e.agreements.slice(0, 6).map((a) => <li key={a}>{a}</li>)}
                </ul>
                <Link href={`/editions/${id}`} className="lp-trust-link mt-8">
                  Explore Govern {e.name} <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
              <div className="lp-epanel-detail">
                <p className="lp-edition-label mt-0">Checked against your matrix</p>
                <dl className="lp-edition-list">
                  {e.checks.map((c) => (
                    <div key={c.title}>
                      <dt><Check size={16} aria-hidden="true" />{c.title}</dt>
                      <dd>{c.body}</dd>
                    </div>
                  ))}
                </dl>
                <p className="lp-edition-label">Built in</p>
                <ul className="lp-epanel-features">
                  {e.features.map((f) => (
                    <li key={f.title}><b>{f.title}.</b> {f.body}</li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
