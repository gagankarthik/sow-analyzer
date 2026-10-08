import { describe, expect, it } from "vitest"
import { OBLIGATION_VIEWS, daysUntil, startOfDay } from "./obligation-views"
import type { PortfolioObligation } from "./types"

const today = startOfDay(Date.parse("2026-10-08T15:00:00"))
const ob = (dueDate: string | null, extra: Partial<PortfolioObligation> = {}) =>
  ({ id: "o", kind: "sponsor_report", title: "Report", dueDate, verified: false, ...extra }) as PortfolioObligation
const view = (id: string) => OBLIGATION_VIEWS.find((v) => v.id === id)!

describe("obligation views", () => {
  it("counts days from local midnight", () => {
    expect(daysUntil("2026-10-08", today)).toBe(0)
    expect(daysUntil("2026-10-07", today)).toBe(-1)
    expect(daysUntil("2026-11-07", today)).toBe(30)
  })

  it("places an obligation by due date", () => {
    expect(view("overdue").test(ob("2026-10-01"), today)).toBe(true)
    expect(view("30").test(ob("2026-10-08"), today)).toBe(true)
    expect(view("30").test(ob("2026-12-01"), today)).toBe(false)
    expect(view("90").test(ob("2026-12-01"), today)).toBe(true)
    expect(view("no-date").test(ob(null), today)).toBe(true)
  })

  it("splits by verification and kind", () => {
    expect(view("needs").test(ob(null), today)).toBe(true)
    expect(view("verified").test(ob(null, { verified: true }), today)).toBe(true)
    expect(view("kind-sponsor_report").test(ob(null), today)).toBe(true)
    expect(view("kind-term_end").test(ob(null), today)).toBe(false)
  })
})
