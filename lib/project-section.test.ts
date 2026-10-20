import { describe, expect, it } from "vitest";
import { PROJECT_SECTIONS, projectSectionFromPath } from "./project-section";

describe("projectSectionFromPath", () => {
  it("names the sub-page from the URL", () => {
    expect(projectSectionFromPath("/projects/doc-1")).toBe("overview");
    expect(projectSectionFromPath("/projects/doc-1/sow")).toBe("sow");
    expect(projectSectionFromPath("/projects/doc-1/team")).toBe("team");
    expect(projectSectionFromPath("/projects/doc-1/documents/")).toBe("documents");
  });

  it("treats a proj_ id without a sub-page as a project workspace", () => {
    expect(projectSectionFromPath("/projects/proj_abc")).toBe("workspace");
    expect(projectSectionFromPath("/projects/proj_abc/sow")).toBe("sow");
  });

  it("ignores query strings and hashes", () => {
    expect(projectSectionFromPath("/projects/doc-1/audit?x=1")).toBe("audit");
    expect(projectSectionFromPath("/projects/doc-1#top")).toBe("overview");
  });

  it("falls back to the overview for unknown or foreign paths", () => {
    expect(projectSectionFromPath("/projects/doc-1/unknown")).toBe("overview");
    expect(projectSectionFromPath("/contracts/c1")).toBe("overview");
    expect(projectSectionFromPath("")).toBe("overview");
  });

  it("lists every tab once, overview first", () => {
    expect(PROJECT_SECTIONS[0]).toEqual({ id: "overview", path: "" });
    expect(new Set(PROJECT_SECTIONS.map((s) => s.id)).size).toBe(PROJECT_SECTIONS.length);
  });
});
