import { Fragment, type ReactNode } from "react";

// The assistant's name, wherever it appears in the app: set in the same
// rainbow as the Ask Sonar button's edge (deeper stops, so the text keeps
// 4.5:1 on white), so Sonar's work is recognisable at a glance.

export function SonarName({ children = "Sonar" }: { children?: ReactNode }) {
  return <span className="sonar-text">{children}</span>;
}

/** A plain string with every "Sonar" set as <SonarName />. */
export function withSonar(text: string): ReactNode {
  const parts = text.split(/\b(Sonar)\b/);
  if (parts.length === 1) return text;
  return parts.map((p, i) => (p === "Sonar" ? <SonarName key={i} /> : <Fragment key={i}>{p}</Fragment>));
}
