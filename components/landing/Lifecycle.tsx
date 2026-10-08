import { ChevronDown, ChevronUp } from "lucide-react";
import { ComingSoonBadge } from "@/components/landing/ComingSoon";
import {
  IconApprove,
  IconCalendar,
  IconCapture,
  IconMatrix,
  IconNegotiate,
  IconRenew,
  IconReport,
  IconSign,
  type Icon,
} from "@/components/landing/icons";
import type { ProductSectionId } from "@/components/landing/site-nav";
import type { GovernFeature } from "@/lib/govern/features";

/* The life of an agreement as a loop: a renewal or a new agreement starts
   the cycle again at intake. Each stage takes the colour of the product
   area that handles it. Wide screens draw the loop; narrow screens list the
   stages and close with a "back to intake" row. */

type Stage = {
  label: string;
  detail: string;
  icon: Icon;
  area: ProductSectionId;
  feature?: GovernFeature;
};

const STAGES: Stage[] = [
  {
    label: "Intake",
    detail: "Upload one agreement or a batch; Sonar reads it",
    icon: IconCapture,
    area: "capture",
  },
  {
    label: "Review",
    detail: "Every clause rated against your matrix",
    icon: IconMatrix,
    area: "matrix",
  },
  {
    label: "Negotiate",
    detail: "Send back with language; redlines scored again",
    icon: IconNegotiate,
    area: "workflow",
  },
  {
    label: "Approve",
    detail: "Routed to the office that must decide",
    icon: IconApprove,
    area: "workflow",
  },
  {
    label: "Sign",
    detail: "Out for signature is its own status",
    icon: IconSign,
    area: "workflow",
    feature: "docusign",
  },
  {
    label: "Obligations",
    detail: "Reports and milestones tracked to their dates",
    icon: IconCalendar,
    area: "trends",
    feature: "obligations",
  },
  {
    label: "Renew",
    detail: "Term ends flagged before the notice window",
    icon: IconRenew,
    area: "trends",
  },
  {
    label: "Report",
    detail: "Signed, pipeline and held-up value",
    icon: IconReport,
    area: "value",
  },
];

export function Lifecycle() {
  return (
    <section className="lp-section lp-band" aria-labelledby="lifecycle-title">
      <div className="lp-wrap">
        <div className="lp-section-head">
          <h2 id="lifecycle-title" className="lp-h2">
            One loop from intake to renewal.{" "}
            <span className="lp-h2-muted">
              One owner and one next step at every stage.
            </span>
          </h2>
        </div>

        <div className="relative">
          <ol className="lp-track">
            {STAGES.map(
              ({ label, detail, icon: StageIcon, area, feature }, index) => (
                <li key={label} className={`lp-track-stage lp-area-${area}`}>
                  <span className="lp-track-node" aria-hidden="true">
                    <StageIcon size={20} />
                  </span>
                  <span className="lp-track-step" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="lp-track-label">{label}</span>
                  <span className="lp-track-detail">{detail}</span>
                  {feature ? (
                    <ComingSoonBadge feature={feature} className="mt-2 justify-self-start" />
                  ) : null}
                </li>
              ),
            )}
          </ol>
          <span className="lp-loop-turn lp-loop-turn-right" aria-hidden="true">
            <ChevronDown size={16} strokeWidth={2} />
          </span>
          <span className="lp-loop-turn lp-loop-turn-left" aria-hidden="true">
            <ChevronUp size={16} strokeWidth={2} />
          </span>
        </div>
        <p className="lp-track-return">
          <span className="lp-track-return-node" aria-hidden="true">
            <IconRenew size={20} />
          </span>
          Renewals and new agreements start again at intake.
        </p>
      </div>
    </section>
  );
}
