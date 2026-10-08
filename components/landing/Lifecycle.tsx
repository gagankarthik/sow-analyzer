import { ChevronDown, ChevronUp } from "lucide-react";
import { ComingSoonBadge } from "@/components/landing/ComingSoon";
import {
  IconApprove,
  IconCalendar,
  IconCapture,
  IconEdits,
  IconMatrix,
  IconNegotiate,
  IconSign,
  IconSigned,
  type Icon,
} from "@/components/landing/icons";
import { IconBadge } from "@/components/landing/IconBadge";
import type { ProductSectionId } from "@/components/landing/site-nav";
import type { GovernFeature } from "@/lib/govern/features";

/* How a contract moves: the journey exactly as each contract page shows
   it, from draft to signed, then the obligations it creates. Each stage
   takes the colour of the product area that handles it. Wide screens draw
   the loop (obligations feed the next agreement); narrow screens list it. */

type Stage = {
  label: string;
  detail: string;
  icon: Icon;
  area: ProductSectionId;
  feature?: GovernFeature;
};

const STAGES: Stage[] = [
  { label: "Draft", detail: "Uploaded or drafted from your template; Sonar reads it", icon: IconCapture, area: "capture" },
  { label: "Review", detail: "Every clause checked against your matrix", icon: IconMatrix, area: "matrix" },
  { label: "Redlines", detail: "Suggested language goes back to the other side", icon: IconNegotiate, area: "workflow" },
  { label: "Edits", detail: "Their revised version is checked again, round by round", icon: IconEdits, area: "workflow" },
  { label: "Approval", detail: "The offices your matrix names sign off", icon: IconApprove, area: "workflow" },
  { label: "Signature", detail: "Out for signature is its own step, with its own clock", icon: IconSign, area: "workflow", feature: "docusign" },
  { label: "Signed", detail: "Value counts as current; the record is complete", icon: IconSigned, area: "value" },
  { label: "Obligations", detail: "Reports, payments and term ends tracked to their dates", icon: IconCalendar, area: "trends", feature: "obligations" },
];

export function Lifecycle() {
  return (
    <section className="lp-section" aria-labelledby="lifecycle-title">
      <div className="lp-wrap">
        <div className="lp-panel">
        <div className="lp-section-head lp-center-head">
          <h2 id="lifecycle-title" className="lp-h2">
            How a contract <span className="lp-serif">moves.</span>
          </h2>
          <p className="lp-lede mx-auto mt-5">
            The same eight steps every contract page shows. One owner and one next step at each, and a clock
            against its target.
          </p>
        </div>

        <div className="relative">
          <ol className="lp-track">
            {STAGES.map(
              ({ label, detail, icon: StageIcon, area, feature }) => (
                <li key={label} className={`lp-track-stage lp-area-${area}`}>
                  <IconBadge icon={StageIcon} area={area} size="lg" className="lp-track-node" />
                  <span className="lp-track-label">
                    {label}
                    {feature ? <ComingSoonBadge feature={feature} /> : null}
                  </span>
                  <span className="lp-track-detail">{detail}</span>
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
          <span className="lp-loop-core" aria-hidden="true">
            Sonar checks every version
          </span>
        </div>
        <p className="lp-track-return">
          Obligations and renewals bring the next agreement back to draft.
        </p>
        </div>
      </div>
    </section>
  );
}
