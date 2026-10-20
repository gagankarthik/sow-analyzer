import { describe, expect, it } from "vitest";
import { ICON_OPTICAL_STROKE, ICON_SIZES, iconStrokeWidth, snapIconSize } from "./icon-scale";

describe("snapIconSize", () => {
  it("keeps the four scale sizes", () => {
    for (const s of ICON_SIZES) expect(snapIconSize(s)).toBe(s);
  });

  it("snaps every size the audit found onto the scale", () => {
    const cases: Array<[number, number]> = [
      [12, 12], [13, 12], [14, 16], [15, 16], [16, 16], [17, 16],
      [18, 20], [20, 20], [22, 20], [23, 24], [24, 24], [26, 24],
    ];
    for (const [input, out] of cases) expect(snapIconSize(input)).toBe(out);
  });

  it("raises anything below 12 to 12", () => {
    expect(snapIconSize(11)).toBe(12);
    expect(snapIconSize(3)).toBe(12);
  });

  it("handles fractional sizes at the boundaries", () => {
    expect(snapIconSize(13.9)).toBe(12);
    expect(snapIconSize(17.5)).toBe(16);
    expect(snapIconSize(22.9)).toBe(20);
  });

  it("passes display sizes through", () => {
    expect(snapIconSize(28)).toBe(28);
    expect(snapIconSize(44)).toBe(44);
    expect(snapIconSize(48.4)).toBe(48);
  });

  it("parses numeric strings and passes CSS lengths through", () => {
    expect(snapIconSize("15")).toBe(16);
    expect(snapIconSize("1em")).toBe("1em");
  });

  it("falls back to 24 for missing or invalid sizes", () => {
    expect(snapIconSize(undefined)).toBe(24);
    expect(snapIconSize(null)).toBe(24);
    expect(snapIconSize("")).toBe(24);
    expect(snapIconSize(0)).toBe(24);
    expect(snapIconSize(-4)).toBe(24);
    expect(snapIconSize(Number.NaN)).toBe(24);
  });
});

describe("iconStrokeWidth", () => {
  it("renders 1.5 screen pixels at every scale size", () => {
    expect(iconStrokeWidth(24)).toBe(1.5);
    expect(iconStrokeWidth(20)).toBe(1.8);
    expect(iconStrokeWidth(16)).toBe(2.25);
    expect(iconStrokeWidth(12)).toBe(3);
    for (const s of ICON_SIZES) expect((iconStrokeWidth(s) * s) / 24).toBeCloseTo(ICON_OPTICAL_STROKE, 2);
  });

  it("returns the optical stroke for non-numeric sizes", () => {
    expect(iconStrokeWidth("1em")).toBe(ICON_OPTICAL_STROKE);
  });
});
