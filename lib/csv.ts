// CSV that opens cleanly in Excel, Numbers and Google Sheets: RFC 4180
// quoting, CRLF line ends and a UTF-8 byte-order mark (without it Excel reads
// "Zürich" as "ZÃ¼rich"). Text that starts like a formula is prefixed with an
// apostrophe so a cell such as "=HYPERLINK(...)" is shown, never run.

export type CsvCell = string | number | boolean | Date | null | undefined

export const CSV_BOM = "﻿"

const FORMULA_START = /^[=+\-@\t\r]/

/** One cell, quoted when it has to be. */
export function csvCell(value: CsvCell): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : ""
  if (typeof value === "boolean") return value ? "true" : "false"
  let s = value instanceof Date ? (Number.isNaN(value.getTime()) ? "" : value.toISOString()) : value
  if (FORMULA_START.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s
}

/** A header row and data rows as one CSV document. */
export function toCsv(headers: string[], rows: CsvCell[][], { bom = true }: { bom?: boolean } = {}): string {
  const lines = [headers, ...rows].map((r) => r.map(csvCell).join(","))
  return (bom ? CSV_BOM : "") + lines.join("\r\n") + "\r\n"
}

/** Columns described once: a header and how to read a row. */
export interface CsvColumn<T> {
  header: string
  value: (row: T) => CsvCell
}

export function rowsToCsv<T>(columns: CsvColumn<T>[], rows: T[], options?: { bom?: boolean }): string {
  return toCsv(columns.map((c) => c.header), rows.map((r) => columns.map((c) => c.value(r))), options)
}

/** "contracts-2026-10-20.csv" in the person's local date. */
export function csvFileName(base: string, now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${base}-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.csv`
}

/** Starts the download in the browser. */
export function downloadCsv(fileName: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
