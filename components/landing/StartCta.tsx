import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";

/* Closing call to action, shared by the public pages: the offer and one
   action on a blue-to-violet wash, with a campus skyline (a clock tower,
   halls, a domed library, chapel spires and trees) in the open space to the
   right of the copy, on wide screens. */

export function StartCta() {
  return (
    <section id="start" className="lp-section scroll-mt-20" aria-labelledby="start-title">
      <div className="lp-wrap">
        <div className="lp-cta2">
          <svg className="lp-cta2-shapes" viewBox="0 0 320 320" aria-hidden="true" focusable="false">
            <path d="M320 0 V200 A200 200 0 0 1 120 0 Z" fill="#CDDCFD" />
            <rect x="200" y="200" width="120" height="120" fill="#DDD4FB" />
            <circle cx="150" cy="250" r="16" fill="#B9CFF9" />
          </svg>

          <div className="lp-cta2-copy">
            <h2 id="start-title" className="lp-cta2-title">
              See your own agreement, <span className="lp-serif">reviewed before the call.</span>
            </h2>
            <p className="lp-cta2-lede">
              Send one contract and your matrix, as a spreadsheet or a document. We run the review first, then walk
              your team through every rating and the next step.
            </p>
            <div className="lp-cta2-actions">
              <Link href="/signup" className="lp-btn lp-btn-primary lp-btn-lg">
                Request a demo
                <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
              </Link>
              <Link href="/calculator" className="lp-cta2-link">
                Or estimate your savings
                <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <CampusSkyline />
        </div>
      </div>
    </section>
  );
}

function CampusSkyline() {
  return (
    <svg className="lp-cta2-skyline" viewBox="470 0 730 170" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="lp-skyline-ink" x1="0" y1="0" x2="1200" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#B4C8F6" />
          <stop offset="1" stopColor="#C8B9F3" />
        </linearGradient>
      </defs>

      {/* Far row: plain blocks that give the skyline depth */}
      <g fill="url(#lp-skyline-ink)" opacity="0.45">
        <rect x="0" y="104" width="70" height="66" />
        <rect x="150" y="78" width="54" height="92" />
        <rect x="330" y="70" width="48" height="100" />
        <rect x="610" y="82" width="70" height="88" />
        <rect x="840" y="56" width="44" height="114" />
        <rect x="1040" y="74" width="40" height="96" />
        <rect x="1130" y="96" width="70" height="74" />
      </g>

      {/* Near row: the campus */}
      <g fill="url(#lp-skyline-ink)">
        {/* Hall with a pediment */}
        <path d="M30 118 L120 88 L210 118 Z" />
        <rect x="40" y="118" width="160" height="52" />
        {/* Clock tower */}
        <rect x="232" y="64" width="40" height="106" />
        <path d="M228 64 L252 22 L276 64 Z" />
        {/* Gothic hall with three gables */}
        <path d="M290 112 L320 90 L350 112 L380 90 L410 112 L440 90 L470 112 V170 H290 Z" />
        {/* Domed library */}
        <rect x="500" y="118" width="140" height="52" />
        <rect x="532" y="102" width="76" height="16" />
        <path d="M532 102 A38 38 0 0 1 608 102 Z" />
        <rect x="566" y="54" width="8" height="12" />
        {/* Trees */}
        <circle cx="676" cy="146" r="22" />
        <circle cx="708" cy="138" r="27" />
        {/* Bell tower */}
        <rect x="748" y="54" width="42" height="116" />
        <path d="M744 54 L769 30 L794 54 Z" />
        {/* Science building, stepped */}
        <rect x="808" y="104" width="150" height="66" />
        <rect x="838" y="88" width="90" height="16" />
        {/* Chapel with twin spires */}
        <rect x="986" y="110" width="128" height="60" />
        <rect x="986" y="70" width="26" height="40" />
        <path d="M986 70 L999 38 L1012 70 Z" />
        <rect x="1088" y="70" width="26" height="40" />
        <path d="M1088 70 L1101 38 L1114 70 Z" />
        {/* Trees */}
        <circle cx="1148" cy="146" r="24" />
        <circle cx="1186" cy="152" r="20" />
      </g>

      {/* Windows and the clock face, cut back to the wash */}
      <g fill="#E6E9FD">
        <circle cx="252" cy="84" r="7" />
        <rect x="64" y="132" width="10" height="24" rx="5" /><rect x="96" y="132" width="10" height="24" rx="5" />
        <rect x="128" y="132" width="10" height="24" rx="5" /><rect x="160" y="132" width="10" height="24" rx="5" />
        <rect x="316" y="124" width="8" height="22" rx="4" /><rect x="376" y="124" width="8" height="22" rx="4" />
        <rect x="436" y="124" width="8" height="22" rx="4" />
        <rect x="530" y="130" width="10" height="26" rx="5" /><rect x="565" y="130" width="10" height="26" rx="5" />
        <rect x="600" y="130" width="10" height="26" rx="5" />
        <rect x="763" y="70" width="12" height="20" rx="6" />
        <rect x="826" y="120" width="114" height="6" rx="3" /><rect x="826" y="138" width="114" height="6" rx="3" />
        <circle cx="1050" cy="132" r="10" />
      </g>
    </svg>
  );
}
