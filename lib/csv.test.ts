import { describe, expect, it } from "vitest"
import { CSV_BOM, csvCell, csvFileName, rowsToCsv, toCsv } from "./csv"

describe("csvCell", () => {
  it("leaves plain text and numbers alone", () => {
    expect(csvCell("Northfield")).toBe("Northfield")
    expect(csvCell(1250.5)).toBe("1250.5")
    expect(csvCell(-3)).toBe("-3")
    expect(csvCell(true)).toBe("true")
  })
  it("writes unknown as an empty cell", () => {
    expect(csvCell(null)).toBe("")
    expect(csvCell(undefined)).toBe("")
    expect(csvCell(Number.NaN)).toBe("")
  })
  it("quotes commas, quotes and line breaks, doubling inner quotes", () => {
    expect(csvCell("Acme, Inc.")).toBe('"Acme, Inc."')
    expect(csvCell('The "Lab"')).toBe('"The ""Lab"""')
    expect(csvCell("line one\nline two")).toBe('"line one\nline two"')
    expect(csvCell("a\r\nb")).toBe('"a\r\nb"')
  })
  it("keeps edge spaces by quoting", () => {
    expect(csvCell(" padded ")).toBe('" padded "')
  })
  it("defuses text that would run as a formula", () => {
    expect(csvCell("=SUM(A1:A2)")).toBe("'=SUM(A1:A2)")
    expect(csvCell("+1")).toBe("'+1")
    expect(csvCell("@cmd")).toBe("'@cmd")
    expect(csvCell("=1,2")).toBe("\"'=1,2\"")
  })
  it("writes dates as ISO", () => {
    expect(csvCell(new Date("2026-10-20T00:00:00Z"))).toBe("2026-10-20T00:00:00.000Z")
  })
})

describe("toCsv", () => {
  it("starts with a BOM for Excel and ends rows with CRLF", () => {
    const out = toCsv(["Name", "Value"], [["Acme, Inc.", 10], ["Beta", null]])
    expect(out.startsWith(CSV_BOM)).toBe(true)
    expect(out.slice(1)).toBe('Name,Value\r\n"Acme, Inc.",10\r\nBeta,\r\n')
  })
  it("can leave the BOM out", () => {
    expect(toCsv(["A"], [], { bom: false })).toBe("A\r\n")
  })
})

describe("rowsToCsv", () => {
  it("writes exactly the given columns in the given order", () => {
    const rows = [{ a: 1, b: "x" }, { a: 2, b: "y" }]
    const out = rowsToCsv([{ header: "B", value: (r: (typeof rows)[number]) => r.b }, { header: "A", value: (r) => r.a }], rows, { bom: false })
    expect(out).toBe("B,A\r\nx,1\r\ny,2\r\n")
  })
})

describe("csvFileName", () => {
  it("dates the file", () => {
    expect(csvFileName("contracts", new Date(2026, 9, 5))).toBe("contracts-2026-10-05.csv")
  })
})
