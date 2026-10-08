// Reading an existing review matrix from Excel or CSV: parse the file into a
// grid of text, guess which column holds what, resolve clause types, offices
// and agreement types written the way people write them ("Legal Affairs",
// "Sponsored Research Agreement"), and flag every row that cannot be imported.
// No React here.

import { MATRIX_CLAUSE_TYPES, categoryLabel } from "@/lib/clause-categories";
import { AGREEMENT_TYPES, AGREEMENT_TYPE_LABEL, OFFICES, OFFICE_LABEL } from "@/lib/govern/labels";
import type { AgreementType, MatrixImportRow, Office } from "@/lib/govern/types";

export type ImportField =
  | "agreementType" | "clauseType" | "standard" | "fallback" | "unacceptable"
  | "escalationOffice" | "beneficial" | "suggestedLanguage";

export const IMPORT_FIELDS: { id: ImportField; label: string; required?: boolean }[] = [
  { id: "agreementType", label: "Agreement type" },
  { id: "clauseType", label: "Clause type", required: true },
  { id: "standard", label: "Standard position", required: true },
  { id: "fallback", label: "Fallback" },
  { id: "unacceptable", label: "Unacceptable terms" },
  { id: "escalationOffice", label: "Escalation office" },
  { id: "beneficial", label: "Beneficial terms" },
  { id: "suggestedLanguage", label: "Suggested language" },
];

/** field → column index, or null when no column holds it. */
export type ColumnMapping = Record<ImportField, number | null>;

export interface ParsedSheet {
  fileName: string;
  headers: string[];
  rows: string[][];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// ── Parsing ────────────────────────────────────────────────────────────────

export class ImportFileError extends Error {}

export async function parseMatrixFile(file: File): Promise<ParsedSheet> {
  const name = file.name.toLowerCase();
  let grid: string[][];
  if (name.endsWith(".csv") || name.endsWith(".txt")) grid = await parseCsv(file);
  else if (name.endsWith(".xlsx")) grid = await parseXlsx(file);
  else if (name.endsWith(".xls")) {
    throw new ImportFileError(
      "Older .xls files can't be read in the browser. In Excel choose File › Save As › Excel Workbook (.xlsx), then upload that file.",
    );
  } else throw new ImportFileError("Choose an Excel (.xlsx) or CSV file.");

  // Drop blank rows; the first remaining row is the header.
  const nonBlank = grid.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c !== ""));
  if (nonBlank.length < 2) throw new ImportFileError("The file has no rows under its header row.");
  const width = Math.max(...nonBlank.map((r) => r.length));
  const pad = (r: string[]) => Array.from({ length: width }, (_, i) => r[i] ?? "");
  const [header, ...rows] = nonBlank.map(pad);
  return { fileName: file.name, headers: header.map((h, i) => h || `Column ${i + 1}`), rows };
}

async function parseCsv(file: File): Promise<string[][]> {
  const Papa = (await import("papaparse")).default;
  const text = (await file.text()).replace(/^﻿/, "");
  const res = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
  if (res.errors.length && res.data.length === 0) throw new ImportFileError(`The CSV could not be read: ${res.errors[0].message}`);
  return res.data.map((r) => r.map((c) => String(c ?? "")));
}

async function parseXlsx(file: File): Promise<string[][]> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(await file.arrayBuffer());
  } catch {
    throw new ImportFileError("The Excel file could not be opened. Check it isn't password-protected, then try again.");
  }
  // First worksheet that has any content.
  const sheet = wb.worksheets.find((ws) => ws.actualRowCount > 0);
  if (!sheet) throw new ImportFileError("The workbook has no data.");
  const grid: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    for (let c = 1; c <= sheet.columnCount; c++) cells.push(cellText(row.getCell(c).value));
    grid.push(cells);
  });
  return grid;
}

function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (Array.isArray(o.richText)) return (o.richText as { text: string }[]).map((t) => t.text).join("");
    if ("result" in o) return cellText(o.result);
    if ("text" in o) return cellText(o.text);
    if ("hyperlink" in o) return String(o.hyperlink);
    return "";
  }
  return String(v);
}

// ── Column detection ───────────────────────────────────────────────────────

const HEADER_SYNONYMS: Record<ImportField, string[]> = {
  agreementType: ["agreement type", "contract type", "type of agreement", "agreement", "playbook"],
  clauseType: ["clause type", "clause", "clause category", "category", "term type", "topic"],
  standard: ["standard position", "standard", "preferred position", "our position", "position", "our standard"],
  fallback: ["fallback", "acceptable fallback", "fallback position", "fall back", "alternative position"],
  unacceptable: ["unacceptable terms", "unacceptable", "not acceptable", "deal breakers", "red lines", "prohibited terms"],
  escalationOffice: ["escalation office", "escalate to", "office", "escalation", "reviewing office"],
  beneficial: ["beneficial terms", "beneficial", "favorable terms", "favourable terms", "beneficial to us"],
  suggestedLanguage: ["suggested language", "suggested redline", "redline language", "model language", "suggested redline language", "proposed language"],
};

export function detectMapping(headers: string[]): ColumnMapping {
  const h = headers.map(norm);
  const taken = new Set<number>();
  const mapping = Object.fromEntries(IMPORT_FIELDS.map((f) => [f.id, null])) as ColumnMapping;
  // Pass 1: exact matches. Pass 2: a header that contains a synonym.
  for (const exact of [true, false]) {
    for (const f of IMPORT_FIELDS) {
      if (mapping[f.id] !== null) continue;
      const idx = h.findIndex((col, i) =>
        !taken.has(i) && HEADER_SYNONYMS[f.id].some((s) => (exact ? col === s : col.includes(s))),
      );
      if (idx >= 0) { mapping[f.id] = idx; taken.add(idx); }
    }
  }
  return mapping;
}

// ── Value resolution ───────────────────────────────────────────────────────

export function resolveClauseType(text: string): string | null {
  const n = norm(text);
  if (!n) return null;
  const compact = n.replace(/ /g, "");
  for (const t of MATRIX_CLAUSE_TYPES) {
    if (t.id.toLowerCase() === compact || norm(t.label) === n || norm(categoryLabel(t.id)) === n) return t.id;
  }
  const SYN: Record<string, string> = {
    publication: "PublicationRights", "publication rights": "PublicationRights", "publication review": "PublicationRights",
    "background ip": "BackgroundIP", "foreground ip": "BackgroundIP", "ip ownership": "BackgroundIP",
    "license scope": "LicenseScope", "licence scope": "LicenseScope", "license grant scope": "LicenseScope", "field of use": "LicenseScope",
    royalties: "Royalties", royalty: "Royalties", milestones: "Royalties", equity: "Royalties",
    indemnity: "Indemnity", indemnification: "Indemnity", "indemnification and insurance": "Indemnity",
    "governing law": "GoverningLaw", "sovereign immunity": "GoverningLaw", jurisdiction: "GoverningLaw",
    "export control": "ExportControl", "export controls": "ExportControl",
    "data rights": "DataRights", "use of name": "DataRights",
    "sponsor reporting": "SponsorReporting", reporting: "SponsorReporting", "flow down": "SponsorReporting", "flow down terms": "SponsorReporting",
    diligence: "Diligence", "diligence obligations": "Diligence",
    "limitation of liability": "Liability", liability: "Liability", "liability cap": "Liability",
    payment: "Payment", "payment terms": "Payment", confidentiality: "Confidentiality",
    termination: "Termination", term: "Term", insurance: "Insurance", warranty: "Warranty", warranties: "Warranty",
    "intellectual property": "IP", ip: "IP", assignment: "Assignment", sublicensing: "Sublicensing",
  };
  if (SYN[n]) return SYN[n];
  // "Publication rights and review period (60 days)" — a label at the start.
  const prefix = MATRIX_CLAUSE_TYPES.find((t) => n.startsWith(norm(t.label)));
  return prefix?.id ?? null;
}

export function resolveOffice(text: string): Office | null | "unknown" {
  const n = norm(text);
  if (!n || n === "none" || n === "n a" || n === "na") return null;
  for (const o of OFFICES) if (norm(o) === n || norm(OFFICE_LABEL[o]) === n) return o;
  const SYN: Record<string, Office> = {
    legal: "legal_affairs", "office of legal affairs": "legal_affairs", ola: "legal_affairs", "general counsel": "legal_affairs",
    "tech commercialization": "tech_commercialization", "technology commercialization office": "tech_commercialization",
    "technology commercialisation": "tech_commercialization", tco: "tech_commercialization", licensing: "tech_commercialization",
    "sponsored programs": "sponsored_programs", "office of sponsored programs": "sponsored_programs", osp: "sponsored_programs",
    "export control": "export_control", "export controls": "export_control",
    "risk management": "risk_management", risk: "risk_management", "office of risk management": "risk_management",
  };
  if (SYN[n]) return SYN[n];
  const contains = OFFICES.find((o) => n.includes(norm(OFFICE_LABEL[o])));
  return contains ?? "unknown";
}

export function resolveAgreementType(text: string): AgreementType | null {
  const n = norm(text).replace(/\b(agreement|agreements|contract)\b/g, "").replace(/\s+/g, " ").trim();
  if (!n) return null;
  for (const t of AGREEMENT_TYPES) if (norm(t) === n || norm(AGREEMENT_TYPE_LABEL[t]) === n) return t;
  const SYN: Record<string, AgreementType> = {
    "sponsored research": "sponsored_research", sra: "sponsored_research", research: "sponsored_research",
    "clinical trial": "sponsored_research",
    grant: "grant", subaward: "grant", "sub award": "grant", "grant or subaward": "grant",
    license: "license", licence: "license", "exclusive license": "license", "non exclusive license": "license",
    "license option": "option", option: "option", "option to license": "option",
    mta: "mta", "material transfer": "mta",
    nda: "nda", cda: "nda", confidentiality: "nda", "non disclosure": "nda",
    collaboration: "collaboration", "research collaboration": "collaboration",
    other: "other",
  };
  return SYN[n] ?? null;
}

// ── Rows ───────────────────────────────────────────────────────────────────

export interface PreviewRow {
  /** Row number as the person sees it in Excel (header is row 1). */
  sheetRow: number;
  agreementType: AgreementType | null;
  row: MatrixImportRow;
  clauseLabel: string;
  problems: string[];
}

export function buildPreview(sheet: ParsedSheet, mapping: ColumnMapping, splitByColumn: boolean): PreviewRow[] {
  const get = (r: string[], f: ImportField) => (mapping[f] === null ? "" : (r[mapping[f] as number] ?? "").trim());
  return sheet.rows.map((r, i) => {
    const problems: string[] = [];
    const rawType = get(r, "clauseType");
    const clauseType = resolveClauseType(rawType);
    if (!rawType) problems.push("No clause type");
    else if (!clauseType) problems.push(`Unknown clause type “${rawType}”`);

    const standard = get(r, "standard");
    if (!standard) problems.push("No standard position");

    const rawOffice = get(r, "escalationOffice");
    const office = resolveOffice(rawOffice);
    if (office === "unknown") problems.push(`Unknown office “${rawOffice}”`);

    let agreementType: AgreementType | null = null;
    if (splitByColumn) {
      const rawAgreement = get(r, "agreementType");
      agreementType = resolveAgreementType(rawAgreement);
      if (!rawAgreement) problems.push("No agreement type");
      else if (!agreementType) problems.push(`Unknown agreement type “${rawAgreement}”`);
    }

    const row: MatrixImportRow = { clauseType: clauseType ?? rawType, standard };
    const opt = (f: ImportField) => get(r, f) || undefined;
    row.fallback = opt("fallback");
    row.unacceptable = opt("unacceptable");
    row.beneficial = opt("beneficial");
    row.suggestedLanguage = opt("suggestedLanguage");
    if (office && office !== "unknown") row.escalationOffice = office;

    return {
      sheetRow: i + 2,
      agreementType,
      row,
      clauseLabel: clauseType ? (MATRIX_CLAUSE_TYPES.find((t) => t.id === clauseType)?.label ?? clauseType) : rawType || "—",
      problems,
    };
  });
}

/** "a; b ;c" → ["a", "b", "c"] (how the import format writes lists). */
export function splitList(s: string | undefined): string[] {
  return (s ?? "").split(/;|\n/).map((x) => x.trim()).filter(Boolean);
}

// ── Template ───────────────────────────────────────────────────────────────

export async function downloadTemplate(): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Blue IQ Govern";
  const ws = wb.addWorksheet("Review matrix");
  ws.columns = IMPORT_FIELDS.map((f) => ({ header: f.label, key: f.id, width: f.id === "standard" || f.id === "suggestedLanguage" ? 48 : 26 }));
  ws.addRow({
    agreementType: "License",
    clauseType: "Publication rights and review period",
    standard: "The Organization may publish freely after a review period of no more than 60 days.",
    fallback: "Review period up to 90 days, with a further 30-day delay for patent filing.",
    unacceptable: "Sponsor approval required to publish; Sponsor may delete results",
    escalationOffice: "Legal Affairs",
    beneficial: "Review period of 30 days or less",
    suggestedLanguage: "The Organization may publish the results after giving Sponsor 60 days to review for confidential information and patentable inventions.",
  });
  ws.addRow({
    agreementType: "Sponsored research",
    clauseType: "Governing law and sovereign immunity",
    standard: "Home-state law governs; nothing waives the Organization's sovereign immunity.",
    fallback: "Silent on governing law.",
    unacceptable: "Another state's law; Waiver of sovereign immunity",
    escalationOffice: "Legal Affairs",
    beneficial: "",
    suggestedLanguage: "This Agreement is governed by the laws of the Organization's home state. Nothing in it waives the sovereign immunity of the Organization.",
  });
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE9EDF4" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.eachRow((row) => { row.alignment = { wrapText: true, vertical: "top" }; });

  const notes = wb.addWorksheet("How to fill this in");
  notes.columns = [{ header: "Column", key: "c", width: 24 }, { header: "What to write", key: "w", width: 90 }];
  notes.addRows([
    { c: "Agreement type", w: `One of: ${AGREEMENT_TYPES.map((t) => AGREEMENT_TYPE_LABEL[t]).join(", ")}. Optional if you import one type at a time.` },
    { c: "Clause type", w: `One of: ${MATRIX_CLAUSE_TYPES.map((t) => t.label).join("; ")}.` },
    { c: "Standard position", w: "What you expect the clause to say. Required." },
    { c: "Fallback", w: "A position you will still accept." },
    { c: "Unacceptable terms", w: "Terms you never accept. Separate several with a semicolon (;)." },
    { c: "Escalation office", w: `One of: ${OFFICES.map((o) => OFFICE_LABEL[o]).join(", ")}.` },
    { c: "Beneficial terms", w: "Terms that favour you. Separate several with a semicolon (;)." },
    { c: "Suggested language", w: "Redline wording reviewers can send back to the other side." },
  ]);
  notes.getRow(1).font = { bold: true };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "review-matrix-template.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
