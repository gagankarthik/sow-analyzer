import type { ReactNode } from "react";
import { SonarMark } from "@/components/ui/SonarMark";

/* One line naming what Sonar, the AI, does in a section, set beside its
   mark so the reader sees the same actor at work across the page. */
export function SonarLine({ children }: { children: ReactNode }) {
  return (
    <p className="home-sonar-line">
      <SonarMark size="xs" />
      <span>{children}</span>
    </p>
  );
}
