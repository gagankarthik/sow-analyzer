// Runs west of UTC, where reading a calendar date as an instant shows the day before.
process.env.TZ = "America/New_York";
import { expect, test } from "vitest";
import { formatDate } from "@/lib/format";

test("calendar dates show the stated day west of UTC", () => {
  expect(new Date(0).getTimezoneOffset()).toBeGreaterThan(0);
  expect(formatDate("2025-11-02")).toBe("Nov 2, 2025");
  expect(formatDate("2026-05-01")).toBe("May 1, 2026");
  expect(formatDate("2025-01-15")).toBe("Jan 15, 2025");
  expect(formatDate("2025-11-02T00:00:00Z")).toBe("Nov 2, 2025");
  expect(formatDate("2025-11-02T00:00:00.000Z")).toBe("Nov 2, 2025");
  expect(formatDate("2025-11-02T00:00:00+00:00")).toBe("Nov 2, 2025");
});

test("real timestamps still convert to local time", () => {
  expect(formatDate("2025-11-02T03:00:00Z")).toBe("Nov 1, 2025"); // 10 pm Nov 1 in New York
});
