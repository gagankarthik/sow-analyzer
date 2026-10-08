// The optional "Contract details" an uploader can give with a document
// (Requirement 2, intake). Form values are strings; `intakePatch` turns them
// into the API's ContractPatch, leaving out anything blank so Sonar fills it.

import type { AgreementType, ContractPatch, Direction } from "@/lib/govern/types";

export const LET_SONAR_DECIDE = "auto";

export interface IntakeValues {
  agreementType: AgreementType | typeof LET_SONAR_DECIDE;
  direction: Direction | typeof LET_SONAR_DECIDE;
  counterparty: string;
  sponsor: string;
  piName: string;
  department: string;
  expectedValue: string;
  currency: string;
  requestedDate: string;
  huronRecordId: string;
  workdayRef: string;
}

export const EMPTY_INTAKE: IntakeValues = {
  agreementType: LET_SONAR_DECIDE,
  direction: LET_SONAR_DECIDE,
  counterparty: "",
  sponsor: "",
  piName: "",
  department: "",
  expectedValue: "",
  currency: "USD",
  requestedDate: "",
  huronRecordId: "",
  workdayRef: "",
};

export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "JPY", "CHF", "AUD"] as const;

/** Plain-words problem with the expected value, or null when it is fine/blank. */
export function expectedValueError(v: IntakeValues): string | null {
  const raw = v.expectedValue.replace(/[,\s$]/g, "");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? null : "Enter the value as a number, such as 250000.";
}

export function intakePatch(v: IntakeValues): ContractPatch {
  const patch: ContractPatch = {};
  const text = (s: string) => s.trim() || undefined;
  if (v.agreementType !== LET_SONAR_DECIDE) patch.agreementType = v.agreementType;
  if (v.direction !== LET_SONAR_DECIDE) patch.direction = v.direction;
  patch.counterparty = text(v.counterparty);
  patch.sponsor = text(v.sponsor);
  patch.piName = text(v.piName);
  patch.department = text(v.department);
  patch.requestedDate = text(v.requestedDate);
  patch.huronRecordId = text(v.huronRecordId);
  patch.workdayRef = text(v.workdayRef);
  const raw = v.expectedValue.replace(/[,\s$]/g, "");
  if (raw && !expectedValueError(v)) {
    patch.expectedValue = Number(raw);
    patch.currency = v.currency;
  }
  // Drop the keys left undefined so the API sees only what was entered.
  return Object.fromEntries(Object.entries(patch).filter(([, x]) => x !== undefined)) as ContractPatch;
}

export const hasIntakeDetails = (v: IntakeValues) => Object.keys(intakePatch(v)).length > 0;

/** Short "License · Acme Corp · PI Dr Lee" line for what was applied to a file. */
export function intakeSummary(p: ContractPatch, typeLabel: (t: AgreementType) => string): string {
  return [
    p.agreementType && typeLabel(p.agreementType),
    p.counterparty ?? p.sponsor,
    p.piName && `PI ${p.piName}`,
    p.department,
    p.huronRecordId && `Huron ${p.huronRecordId}`,
  ].filter(Boolean).join(" · ");
}
