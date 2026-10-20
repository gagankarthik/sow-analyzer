// Which document sub-page a /projects/<id>/<section> URL names, so the
// route's loading shell can draw that sub-page's shape before it renders.

export type ProjectSection = "overview" | "sow" | "amendments" | "insights" | "timeline" | "audit" | "team" | "documents" | "workspace";

/** The sub-pages in tab order, with their path segment ("" is the overview). */
export const PROJECT_SECTIONS: { id: Exclude<ProjectSection, "workspace">; path: string }[] = [
  { id: "overview", path: "" },
  { id: "sow", path: "sow" },
  { id: "amendments", path: "amendments" },
  { id: "insights", path: "insights" },
  { id: "timeline", path: "timeline" },
  { id: "audit", path: "audit" },
  { id: "team", path: "team" },
  { id: "documents", path: "documents" },
];

/** "/projects/doc1/sow" → "sow"; a "proj_…" id with no sub-page is a project workspace. */
export function projectSectionFromPath(pathname: string): ProjectSection {
  const m = /^\/projects\/([^/?#]+)(?:\/([^/?#]+))?/.exec(pathname);
  if (!m) return "overview";
  if (!m[2] && m[1].startsWith("proj_")) return "workspace";
  return PROJECT_SECTIONS.find((s) => s.path === (m[2] ?? ""))?.id ?? "overview";
}
