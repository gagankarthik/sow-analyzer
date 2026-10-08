import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import { ComingSoonBadge } from "@/components/landing/ComingSoon";
import {
  IconApprove,
  IconCalendar,
  IconCapture,
  IconLeadership,
  IconMatrix,
  IconNegotiate,
  IconRenew,
  IconSign,
  type Icon,
} from "@/components/landing/icons";
import type { GovernFeature } from "@/lib/govern/features";

/* The lifecycle as a loop: eight stages around the matrix, clockwise
   from intake. On wide screens they sit on a ring (a 3 × 3 grid with the
   matrix in the middle and arrows between stages); on narrow screens they
   become an ordered list. */

type Stage = { label: string; detail: string; icon: Icon; feature?: GovernFeature };

// Clockwise order. `slot` is the grid cell on the ring.
const STAGES: (Stage & { slot: string })[] = [
  { slot: "a", label: "Intake", detail: "Upload one or a batch", icon: IconCapture },
  { slot: "b", label: "Review", detail: "Every clause rated", icon: IconMatrix },
  { slot: "c", label: "Negotiate", detail: "Redlines scored again", icon: IconNegotiate },
  { slot: "d", label: "Approve", detail: "Routed to the right office", icon: IconApprove },
  { slot: "e", label: "Sign", detail: "Out for signature", icon: IconSign, feature: "docusign" },
  { slot: "f", label: "Obligations", detail: "Reports and milestones due", icon: IconCalendar, feature: "obligations" },
  { slot: "g", label: "Renew", detail: "Term ends flagged early", icon: IconRenew },
  { slot: "h", label: "Report", detail: "Value and bottlenecks", icon: IconLeadership },
];

export function Lifecycle() {
  return (
    <section className="lp-section lp-band" aria-labelledby="lifecycle-title">
      <div className="lp-wrap">
        <div className="lp-center-head">
          <h2 id="lifecycle-title" className="lp-h2">
            The whole life of an agreement, in one place.
          </h2>
          <p className="lp-body mx-auto mt-4">
            From the day it arrives to the day it renews, every agreement has one record, one owner and
            one next step, all measured against your matrix.
          </p>
        </div>

        <div className="lp-ring">
          <span className="lp-ring-loop" aria-hidden="true" />
          {["top-1", "top-2", "right-1", "right-2", "bottom-1", "bottom-2", "left-1", "left-2"].map((pos) => (
            <span key={pos} className={`lp-ring-arrow lp-ring-arrow-${pos}`} aria-hidden="true" />
          ))}
          <ol className="lp-ring-stages">
            {STAGES.map(({ slot, label, detail, icon: StageIcon, feature }) => (
              <li key={label} className={`lp-ring-stage lp-ring-${slot}`}>
                <span className="lp-ring-icon">
                  <StageIcon size={24} />
                </span>
                <span className="lp-ring-label">{label}</span>
                <span className="lp-ring-detail">{detail}</span>
                {feature ? <ComingSoonBadge feature={feature} className="mt-1" /> : null}
              </li>
            ))}
          </ol>
          <div className="lp-ring-core">
            <IconMatrix size={28} />
            <p className="lp-ring-core-title">Your acceptance matrix</p>
            <p className="lp-ring-core-text">Standard positions, fallbacks and the office for each clause</p>
          </div>
        </div>

        <div className="mt-12 flex justify-center">
          <Link href="/product" className="lp-btn lp-btn-outline">
            See every stage
            <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
