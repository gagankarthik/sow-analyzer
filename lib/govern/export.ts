// Excel and PDF downloads for the Govern reports (Requirement 4, "Export").
//
// A report is described once as plain data (title, a few headline figures,
// then tables) and written to either format, so the Excel file, the PDF and
// the screen all come from the same rows. Pages build those rows with the
// same metrics functions they render from, after applying the same filters.
//
// exceljs and jspdf are heavy, so both load only when someone clicks Download.

import { byEdition } from "@/lib/edition-runtime";
import { fmtMoney } from "@/lib/contract-value"
import { currencySymbol } from "@/lib/format"
import {
  AGREEMENT_TYPE_LABEL, DIRECTION_LABEL, SLA_LABEL, STAGE_LABEL, personName,
} from "./labels"
import { VALUE_BAND_LABEL, type ContractFilters } from "./metrics"
import type { Contract } from "./types"

export type CellValue = string | number | null

/** text: as is · money: an amount in the row's currency · number/days: a count · date: ISO date. */
export type ColumnKind = "text" | "money" | "number" | "days" | "date"

export interface ExportColumn {
  key: string
  header: string
  kind?: ColumnKind
  /** Excel column width in characters. */
  width?: number
}

export interface ExportTable {
  /** Sheet name in Excel, heading in the PDF. */
  name: string
  columns: ExportColumn[]
  rows: Record<string, CellValue>[]
  /** Row field that holds the currency code for money columns (default "currency"). */
  currencyKey?: string
  /** One plain sentence printed under the heading (what the table leaves out, etc.). */
  note?: string
}

export interface ExportReport {
  title: string
  /** File name without date or extension: "govern-bottlenecks". */
  fileBase: string
  /** Headline figures, already formatted as on screen. */
  summary?: { label: string; value: string }[]
  /** Plain sentences: active filters, what is not counted. */
  notes?: string[]
  tables: ExportTable[]
}

// ── Shared row builders ────────────────────────────────────────────────────

export const CONTRACT_COLUMNS: ExportColumn[] = [
  { key: "title", header: "Contract", width: 40 },
  { key: "type", header: "Agreement type", width: 22 },
  { key: "sponsor", get header() { return byEdition("Sponsor or licensee", "Vendor") }, width: 28 },
  { key: "pi", header: "PI", width: 20 },
  { key: "department", header: "Department", width: 24 },
  { key: "stage", header: "Stage", width: 22 },
  { key: "waitingOn", header: "Waiting on", width: 30 },
  { key: "owner", header: "Owner", width: 20 },
  { key: "daysInStage", header: "Days in stage", kind: "days", width: 13 },
  { key: "targetDays", header: "Target days", kind: "days", width: 12 },
  { key: "totalDays", header: "Total days", kind: "days", width: 11 },
  { key: "timing", header: "Timing", width: 14 },
  { key: "direction", header: "Money", width: 11 },
  { key: "value", header: "Value", kind: "money", width: 16 },
  { key: "currency", header: "Currency", width: 9 },
  { key: "nextStep", header: "Next step", width: 50 },
]

export function contractRow(c: Contract): Record<string, CellValue> {
  return {
    title: c.title,
    type: AGREEMENT_TYPE_LABEL[c.agreementType],
    sponsor: c.sponsor || c.counterparty,
    pi: c.piName,
    department: c.department,
    stage: STAGE_LABEL[c.stage],
    waitingOn: c.waitingOn.label,
    owner: c.owner ? personName(c.owner) : "Unassigned",
    daysInStage: c.daysInStage,
    targetDays: c.targetDays,
    totalDays: c.totalDays,
    timing: SLA_LABEL[c.slaStatus],
    direction: DIRECTION_LABEL[c.direction],
    value: c.value,
    currency: c.currency ? c.currency.toUpperCase() : null,
    nextStep: c.nextStep.headline,
  }
}

export function contractsTable(name: string, contracts: Contract[], note?: string): ExportTable {
  return { name, columns: CONTRACT_COLUMNS, rows: contracts.map(contractRow), note }
}

/** The active filters in plain words, for the notes block. */
export function describeFilters(f: ContractFilters, reviewerName?: (email: string) => string): string | null {
  const parts: string[] = []
  if (f.q.trim()) parts.push(`search "${f.q.trim()}"`)
  if (f.agreementType !== "all") parts.push(AGREEMENT_TYPE_LABEL[f.agreementType])
  if (f.sponsor !== "all") parts.push(`${byEdition("sponsor or licensee", "vendor")} ${f.sponsor}`)
  if (f.department !== "all") parts.push(`department ${f.department}`)
  if (f.reviewer !== "all") parts.push(`reviewer ${reviewerName ? reviewerName(f.reviewer) : f.reviewer}`)
  if (f.valueBand !== "all") parts.push(`value ${VALUE_BAND_LABEL[f.valueBand]}`)
  if (f.risk === "needs_attention") parts.push("needs attention only")
  if (f.risk === "high") parts.push("high or critical risk")
  if (f.risk === "critical") parts.push("critical risk")
  return parts.length ? `Filtered to: ${parts.join(" · ")}.` : null
}

// ── Writers ────────────────────────────────────────────────────────────────

function today(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function generatedLine(): string {
  return `Generated ${new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} from Blue IQ Govern`
}

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Give the browser a moment to start the download before the URL goes.
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

/** Excel sheet names: 31 characters, none of []:*?/\ , unique per workbook. */
function sheetName(name: string, used: Set<string>): string {
  const base = name.replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 31) || "Sheet"
  let candidate = base
  for (let i = 2; used.has(candidate.toLowerCase()); i++) candidate = `${base.slice(0, 28)} ${i}`
  used.add(candidate.toLowerCase())
  return candidate
}

/** "$"#,##0 for the row's currency, so the cell stays a number Excel can sum. */
function moneyFormat(currency: CellValue): string {
  const sym = currencySymbol(typeof currency === "string" ? currency : null)
  return sym ? `"${sym.replace(/"/g, "")}"#,##0` : "#,##0"
}

const HEADER_FILL = "FF1A41B8" // brand-primary-700
const ZEBRA_FILL = "FFF3F5F9" // paper

export async function downloadExcel(report: ExportReport): Promise<void> {
  const mod = await import("exceljs")
  const ExcelJS = (mod as unknown as { default?: typeof mod }).default ?? mod
  const wb = new ExcelJS.Workbook()
  wb.creator = "Blue IQ Govern"
  wb.created = new Date()
  const used = new Set<string>()

  // Summary sheet: title, date, headline figures, notes.
  if (report.summary?.length || report.notes?.length) {
    const ws = wb.addWorksheet(sheetName("Summary", used))
    ws.columns = [{ width: 34 }, { width: 60 }]
    ws.addRow([report.title]).font = { bold: true, size: 16 }
    ws.addRow([generatedLine()]).font = { italic: true, color: { argb: "FF5C6470" } }
    ws.addRow([])
    for (const s of report.summary ?? []) {
      const row = ws.addRow([s.label, s.value])
      row.getCell(1).font = { bold: true }
    }
    if (report.notes?.length) {
      ws.addRow([])
      for (const n of report.notes) {
        const row = ws.addRow([n])
        ws.mergeCells(row.number, 1, row.number, 2)
        row.getCell(1).alignment = { wrapText: true, vertical: "top" }
      }
    }
  }

  for (const table of report.tables) {
    const ws = wb.addWorksheet(sheetName(table.name, used), {
      views: [{ state: "frozen", ySplit: 1 }],
    })
    ws.columns = table.columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width ?? Math.max(12, c.header.length + 4),
    }))
    const curKey = table.currencyKey ?? "currency"
    for (const r of table.rows) {
      const row = ws.addRow(table.columns.map((c) => {
        const v = r[c.key]
        if (v === null || v === undefined || v === "") return null
        if (c.kind === "date" && typeof v === "string") {
          const t = new Date(v)
          return Number.isNaN(t.getTime()) ? v : t
        }
        return v
      }))
      table.columns.forEach((c, i) => {
        const cell = row.getCell(i + 1)
        if (c.kind === "money") cell.numFmt = moneyFormat(r[curKey] ?? null)
        else if (c.kind === "number" || c.kind === "days") cell.numFmt = "#,##0"
        else if (c.kind === "date") cell.numFmt = "d mmm yyyy"
        if (c.kind && c.kind !== "text") cell.alignment = { horizontal: "right" }
        else cell.alignment = { wrapText: true, vertical: "top" }
      })
      if (row.number % 2 === 1) {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA_FILL } }
        })
      }
    }
    const header = ws.getRow(1)
    header.height = 22
    header.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } }
      cell.alignment = { vertical: "middle", wrapText: true }
    })
    if (table.rows.length > 0) {
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: table.columns.length } }
    }
    if (table.note) {
      ws.addRow([])
      const noteRow = ws.addRow([table.note])
      noteRow.getCell(1).font = { italic: true, color: { argb: "FF5C6470" } }
    }
  }

  const buffer = await wb.xlsx.writeBuffer()
  saveBlob(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${report.fileBase}-${today()}.xlsx`,
  )
}

/** The PDF's built-in fonts cover Windows-1252 only; swap what they cannot draw. */
function pdfText(s: string): string {
  return s
    .replace(/−/g, "-")
    .replace(/₹/g, "INR ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x00-\xFF€–—…·•]/g, "")
}

function pdfCell(v: CellValue, kind: ColumnKind | undefined, currency: CellValue): string {
  if (v === null || v === undefined || v === "") return "—"
  if (kind === "money" && typeof v === "number") return pdfText(fmtMoney(v, typeof currency === "string" ? currency : null))
  if ((kind === "number" || kind === "days") && typeof v === "number") return v.toLocaleString()
  if (kind === "date" && typeof v === "string") {
    const t = new Date(v)
    return Number.isNaN(t.getTime()) ? v : t.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
  }
  return pdfText(String(v))
}

export async function downloadPdf(report: ExportReport): Promise<void> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")])
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" })
  const margin = 40
  const pageW = doc.internal.pageSize.getWidth()
  const lastY = () => (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? margin
  const pageH = doc.internal.pageSize.getHeight()
  let y = margin

  const ensure = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage()
      y = margin
    }
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.setTextColor(21, 24, 30)
  doc.text(pdfText(report.title), margin, y + 8)
  y += 26
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(92, 100, 112)
  doc.text(pdfText(generatedLine()), margin, y)
  y += 18

  // Summary block: label / value pairs in up to four columns.
  if (report.summary?.length) {
    const cols = Math.min(4, report.summary.length)
    const colW = (pageW - margin * 2) / cols
    const rows = Math.ceil(report.summary.length / cols)
    ensure(rows * 40 + 10)
    doc.setDrawColor(221, 226, 234)
    doc.setFillColor(247, 248, 251)
    doc.roundedRect(margin, y, pageW - margin * 2, rows * 40 + 10, 4, 4, "FD")
    report.summary.forEach((s, i) => {
      const cx = margin + 12 + (i % cols) * colW
      const cy = y + 18 + Math.floor(i / cols) * 40
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8.5)
      doc.setTextColor(92, 100, 112)
      doc.text(pdfText(s.label), cx, cy)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.setTextColor(21, 24, 30)
      const value = doc.splitTextToSize(pdfText(s.value), colW - 20) as string[]
      doc.text(value[0] ?? "", cx, cy + 16)
    })
    y += rows * 40 + 22
  }

  if (report.notes?.length) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(65, 71, 82)
    for (const n of report.notes) {
      const lines = doc.splitTextToSize(pdfText(n), pageW - margin * 2) as string[]
      ensure(lines.length * 12)
      doc.text(lines, margin, y)
      y += lines.length * 12 + 2
    }
    y += 8
  }

  for (const table of report.tables) {
    ensure(70)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.setTextColor(21, 24, 30)
    doc.text(pdfText(table.name), margin, y + 4)
    y += 12
    if (table.note) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8.5)
      doc.setTextColor(92, 100, 112)
      const lines = doc.splitTextToSize(pdfText(table.note), pageW - margin * 2) as string[]
      doc.text(lines, margin, y + 6)
      y += lines.length * 11 + 2
    }
    const curKey = table.currencyKey ?? "currency"
    const body = table.rows.length
      ? table.rows.map((r) => table.columns.map((c) => pdfCell(r[c.key] ?? null, c.kind, r[curKey] ?? null)))
      : [[{ content: "Nothing to show.", colSpan: table.columns.length }]]
    autoTable(doc, {
      startY: y + 4,
      margin: { left: margin, right: margin, bottom: margin },
      head: [table.columns.map((c) => pdfText(c.header))],
      body,
      theme: "grid",
      styles: { font: "helvetica", fontSize: 8, cellPadding: 4, textColor: [47, 53, 64], lineColor: [221, 226, 234], lineWidth: 0.5, overflow: "linebreak" },
      headStyles: { fillColor: [26, 65, 184], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [247, 248, 251] },
      columnStyles: Object.fromEntries(
        table.columns.map((c, i) => [i, c.kind && c.kind !== "text" ? { halign: "right" as const } : {}]),
      ),
    })
    y = lastY() + 24
  }

  // Page numbers.
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(138, 145, 158)
    doc.text(`${pdfText(report.title)} · page ${p} of ${pages}`, pageW - margin, pageH - 18, { align: "right" })
  }

  doc.save(`${report.fileBase}-${today()}.pdf`)
}
