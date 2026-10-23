import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import { SonarMark } from "@/components/ui/SonarMark";
import { EDITIONS, type EditionId } from "@/components/landing/editions-data";
import {
  IconAgreement,
  IconCalendar,
  IconLicense,
  IconMatrix,
  IconPrivacy,
  IconValue,
  IconWorkflow,
  type Icon,
} from "@/components/landing/icons";
import { INDUSTRY_SECTIONS, type ProductSectionId } from "@/components/landing/site-nav";
import { Reveal } from "@/components/home/Reveal";

/* One platform, two editions, told as what each one is set up for rather
   than what it lacks: Campus and Workforce on either side, each with its
   own agreements and checks, and between them everything every edition
   shares. Campus takes the matrix blue, Workforce the workflow violet.
   The agreement lists come from components/landing/editions-data.ts; the
   types both editions review move to the shared column. The Industries
   menu links (`/#research-universities`, …) land on this section. */

const EDITION_STYLE: Record<EditionId, { area: ProductSectionId; icon: Icon }> = {
  campus: { area: "matrix", icon: IconLicense },
  workforce: { area: "workflow", icon: IconAgreement },
};

/* Agreement types both editions review; shown once, in the middle. */
const SHARED_AGREEMENT_PREFIXES = ["Confidentiality", "Software purchases"];
const isShared = (agreement: string) => SHARED_AGREEMENT_PREFIXES.some((prefix) => agreement.startsWith(prefix));

const SHARED_PLATFORM: { icon: Icon; label: string }[] = [
  { icon: IconMatrix, label: "Review against your matrix" },
  { icon: IconWorkflow, label: "Workflow and approvals" },
  { icon: IconValue, label: "Value reporting" },
  { icon: IconCalendar, label: "Obligations and renewals" },
  { icon: IconPrivacy, label: "Confidentiality (NDA) and software purchases" },
];

export function EditionsOverview() {
  return (
    <section id="editions" className="home-section scroll-mt-20" aria-labelledby="editions-title">
      {INDUSTRY_SECTIONS.map(({ id }) => (
        <span key={id} id={id} className="home-anchor" aria-hidden="true" />
      ))}
      <div className="home-container">
        <Reveal className="home-section-head">
          <h2 id="editions-title" className="home-h2">
            Two editions, one platform
          </h2>
          <p className="home-lede">Each edition comes set up for its agreements. Everything else is shared.</p>
        </Reveal>

        <div className="home-editions3">
          <EditionPanel id="campus" />

          <Reveal className="home-editions-core" delay={0.1}>
            <p className="home-editions-core-title">
              <SonarMark size="xs" />
              In every edition
            </p>
            <ul className="home-editions-core-list">
              {SHARED_PLATFORM.map(({ icon: ItemIcon, label }) => (
                <li key={label}>
                  <span className="home-editions-core-icon" aria-hidden="true">
                    <ItemIcon size={18} />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </Reveal>

          <EditionPanel id="workforce" />
        </div>
      </div>
    </section>
  );
}

function EditionPanel({ id }: { id: EditionId }) {
  const edition = EDITIONS[id];
  const { area, icon: EditionIcon } = EDITION_STYLE[id];
  const ownAgreements = edition.agreements.filter((agreement) => !isShared(agreement));

  return (
    <Reveal className={`home-edition-panel lp-area-${area}`}>
      <article aria-labelledby={`edition-${id}-title`}>
        <div className="home-edition-panel-head">
          <span className="home-edition-panel-icon" aria-hidden="true">
            <EditionIcon size={22} />
          </span>
          <div>
            <h3 id={`edition-${id}-title`} className="home-h3">
              Govern {edition.name}
            </h3>
            <p className="home-edition-panel-tagline">{edition.tagline}</p>
          </div>
        </div>

        <p className="home-edition-panel-label">Agreements it reviews</p>
        <ul className="home-edition-tags">
          {ownAgreements.map((agreement) => (
            <li key={agreement}>{agreement}</li>
          ))}
        </ul>

        <p className="home-edition-panel-label">Checked against your matrix</p>
        <ul className="home-edition-checks">
          {edition.checks.map((check) => (
            <li key={check.title}>{check.title}</li>
          ))}
        </ul>

        <Link href={`/editions/${id}`} className="home-link home-link-area">
          Explore Govern {edition.name} <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </article>
    </Reveal>
  );
}
