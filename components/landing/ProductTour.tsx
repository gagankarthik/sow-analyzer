import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "@/components/ui/icons";
import { COMING_SOON_LABEL, ComingSoonBadge, isComingSoon } from "@/components/landing/ComingSoon";
import {
  BoardCard,
  BottleneckCard,
  CaptureCard,
  HolderCard,
  IntegrationsCard,
  RedlineCard,
  ValueCard,
} from "@/components/landing/ProductCards";
import { PRODUCT_SECTIONS, type ProductSectionId } from "@/components/landing/site-nav";
import { IconBadge } from "@/components/landing/IconBadge";

/* Everything in the Product menu as one bento grid. Each tile carries its
   product area's colour (the same code as the hero window and the app) and
   the id the header and footer link to (`/#matrix`, `/#capture`...). All
   content is in the server HTML, so every feature is crawlable. */

const TILES: Record<ProductSectionId, { body: string; size: string; visual: ReactNode }> = {
  matrix: {
    body: "Every clause rated against your standard position, fallback and reviewing office, with the rule and the suggested language behind each finding.",
    size: "lp-tile-wide",
    visual: (
      <div className="lp-tile-pair">
        <RedlineCard />
        <HolderCard />
      </div>
    ),
  },
  capture: {
    body: "Parties, dates and money read from the whole agreement, scans included, each traced to its section.",
    size: "lp-tile-narrow",
    visual: <CaptureCard />,
  },
  workflow: {
    body: "Who holds each contract, how long it has waited against its target, and the one action that moves it on.",
    size: "lp-tile-half",
    visual: <BoardCard />,
  },
  value: {
    body: "Money signed, money in the pipeline and money held up by delays, incoming and outgoing kept apart.",
    size: "lp-tile-half",
    visual: <ValueCard />,
  },
  trends: {
    body: "Where the queue backs up: average days per stage against the target, by who each contract waits on.",
    size: "lp-tile-half",
    visual: <BottleneckCard />,
  },
  integrations: {
    body: "Built to sit beside the systems of record you already run, so a contract is entered once.",
    size: "lp-tile-half",
    visual: <IntegrationsCard status={isComingSoon("integrations") ? COMING_SOON_LABEL : "Available"} />,
  },
};

/* Row order for the grid: wide + narrow, then two halves, twice. */
const ORDER: ProductSectionId[] = ["matrix", "capture", "workflow", "trends", "value", "integrations"];
const SECTIONS = ORDER.map((id) => PRODUCT_SECTIONS.find((s) => s.id === id)!);

export function ProductTour() {
  return (
    <section id="product" className="lp-section scroll-mt-20" aria-labelledby="product-title">
      <div className="lp-wrap">
        <h2 id="product-title" className="lp-statement">
          Review, workflow and the money, <span className="lp-serif">on one record.</span>
        </h2>
        <p className="lp-lede mt-5">
          The rating, the owner, the clock and the value all live on the same contract. Nobody re-keys a
          value or chases a status in email.
        </p>

        <div className="lp-bento">
          {SECTIONS.map((section) => {
            const tile = TILES[section.id];
            return (
              <article
                key={section.id}
                id={section.id}
                className={`lp-tile lp-area-${section.id} ${tile.size} scroll-mt-24`}
                aria-labelledby={`${section.id}-title`}
              >
                <header className="lp-tile-head">
                  <IconBadge icon={section.icon} area={section.id} />
                  <h3 id={`${section.id}-title`} className="lp-tile-title">
                    {section.label}
                  </h3>
                  {"feature" in section ? <ComingSoonBadge feature={section.feature} /> : null}
                </header>
                <p className="lp-tile-body">{tile.body}</p>
                <div className="lp-tile-visual" aria-hidden="true">
                  {tile.visual}
                </div>
                <Link href={`/product#${section.id}`} className="lp-tile-link">
                  More on {section.label.toLowerCase()}
                  <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
