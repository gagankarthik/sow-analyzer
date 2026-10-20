import { describe, expect, it } from "vitest";
import {
  PRIORITY_CELL, chartBarHeights, flushCellPad, flushRowHeight, loadingSubject, skeletonBarWidth, skeletonRowCount,
} from "./skeleton-geometry";

describe("flush table geometry", () => {
  it("matches the list table: 42px rows, 34px compact", () => {
    expect(flushRowHeight("comfortable")).toBe("h-[42px]");
    expect(flushRowHeight("compact")).toBe("h-[34px]");
    expect(flushCellPad("comfortable")).toBe("px-3 py-1.5");
    expect(flushCellPad("compact")).toBe("px-3 py-1");
  });

  it("hides lower-priority columns at the same container widths as DataTable", () => {
    expect(PRIORITY_CELL[1]).toBe("");
    expect(PRIORITY_CELL[2]).toContain("@4xl/table:table-cell");
    expect(PRIORITY_CELL[3]).toContain("@5xl/table:table-cell");
    expect(PRIORITY_CELL[4]).toContain("@7xl/table:table-cell");
  });
});

describe("skeletonBarWidth", () => {
  it("is deterministic, so server and client render the same HTML", () => {
    expect(skeletonBarWidth(3, 2)).toBe(skeletonBarWidth(3, 2));
    expect(skeletonBarWidth(3, 2, true)).toBe(skeletonBarWidth(3, 2, true));
  });

  it("varies from row to row in a column", () => {
    const widths = new Set(Array.from({ length: 6 }, (_, r) => skeletonBarWidth(r, 1)));
    expect(widths.size).toBeGreaterThan(1);
  });

  it("uses short fixed widths for numeric cells and percentages for text", () => {
    expect(skeletonBarWidth(0, 0, true)).toMatch(/^w-\d+$/);
    expect(skeletonBarWidth(0, 0)).toMatch(/^w-\[\d+%\]$/);
  });

  it("never fails on negative indexes", () => {
    expect(skeletonBarWidth(-1, -2)).toMatch(/^w-/);
  });
});

describe("skeletonRowCount", () => {
  it("uses the page size, capped to the first screen", () => {
    expect(skeletonRowCount(25)).toBe(12);
    expect(skeletonRowCount(5)).toBe(5);
    expect(skeletonRowCount(50, 8, 10)).toBe(10);
  });

  it("falls back when there is no page size, and never drops below one row", () => {
    expect(skeletonRowCount(undefined)).toBe(8);
    expect(skeletonRowCount(0, 6)).toBe(6);
    expect(skeletonRowCount(undefined, 0)).toBe(1);
  });
});

describe("chartBarHeights", () => {
  it("returns one height class per bar, in a repeating rhythm", () => {
    const h = chartBarHeights(12);
    expect(h).toHaveLength(12);
    expect(h.every((c) => /^h-\[\d+%\]$/.test(c))).toBe(true);
    expect(h[10]).toBe(h[0]);
  });

  it("handles zero and negative counts", () => {
    expect(chartBarHeights(0)).toEqual([]);
    expect(chartBarHeights(-3)).toEqual([]);
  });
});

describe("loadingSubject", () => {
  it("reads the subject from a label written either way", () => {
    expect(loadingSubject("Loading contracts…")).toBe("contracts");
    expect(loadingSubject("Loading the review matrix")).toBe("the review matrix");
    expect(loadingSubject("contracts")).toBe("contracts");
    expect(loadingSubject("loading setup...")).toBe("setup");
  });

  it("falls back to 'content' when nothing is named", () => {
    expect(loadingSubject("Loading")).toBe("content");
    expect(loadingSubject("")).toBe("content");
    expect(loadingSubject(undefined)).toBe("content");
  });

  it("does not strip words that merely start with 'loading'", () => {
    expect(loadingSubject("loadings report")).toBe("loadings report");
  });
});
