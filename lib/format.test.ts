import { describe, expect, it } from "vitest";
import { formatDate as dsFormatDate } from "@/components/ds/format";
import { formatDate, parseAmount, parseDate } from "./format";

// A zone west of UTC, where the old off-by-one showed: new Date("2025-11-02")
// is UTC midnight, which is still November 1 in New York.
process.env.TZ = "America/New_York";

describe("calendar days", () => {
  it("reads a bare ISO day as that day in the local zone", () => {
    const d = parseDate("2025-11-02");
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2025, 10, 2]);
  });

  it("formats agreement dates on the day the document states", () => {
    expect(formatDate("2025-11-02")).toBe("Nov 2, 2025");
    expect(formatDate("2026-05-01")).toBe("May 1, 2026");
    expect(dsFormatDate("2026-01-15")).toBe("Jan 15, 2026");
  });

  it("still reads full timestamps as instants", () => {
    expect(parseDate("2026-01-15T12:00:00Z").getTime()).toBe(Date.UTC(2026, 0, 15, 12));
  });
});

describe("amounts as people type them", () => {
  it("accepts symbols, codes, separators and k/m", () => {
    expect(parseAmount("$120,000")).toBe(120000);
    expect(parseAmount("USD 120000")).toBe(120000);
    expect(parseAmount("250k")).toBe(250000);
    expect(parseAmount("1.5m")).toBe(1500000);
    expect(parseAmount("12.5%")).toBe(12.5);
    expect(parseAmount("€ 9 500")).toBe(9500);
  });

  it("tells empty from a typo", () => {
    expect(parseAmount("  ")).toBeNull();
    expect(parseAmount("12O,000")).toBe("invalid");
    expect(parseAmount("-5")).toBe("invalid");
  });
});
