import Link from "next/link";
import { ArrowRight } from "lucide-react";

/* One line of real product news above the header. */
export function AnnouncementBar() {
  return (
    <div className="lp-announce">
      <p>
        New in Govern: obligations Sonar finds now wait for a person to verify them, so every due date can be trusted.
      </p>
      <Link href="/product#capture" className="lp-announce-link">
        See how <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
      </Link>
    </div>
  );
}
