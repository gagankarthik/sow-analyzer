import { AGREEMENT_TYPE_LABEL, DIRECTION_LABEL, personName } from "@/lib/govern/labels"
import { contractValueText } from "@/lib/govern/metrics"
import type { AgreementType, Contract, Matrix } from "@/lib/govern/types"

// The workspace's data model, as the Data manager shows it: the agreement
// types every contract is filed under, and the properties Govern keeps on
// each contract. Usage is computed from the organization's own contracts and
// matrix; nothing here is sample data.

export const AGREEMENT_TYPE_DESCRIPTION: Record<AgreementType, string> = {
  sponsored_research: "A sponsor funds research the organization carries out.",
  grant: "Funding awarded to the organization, or passed on to another institution as a subaward.",
  license: "The organization licenses its technology or IP to another party.",
  option: "A party reserves the right to license the technology later, for a fee and a fixed period.",
  mta: "Research materials move between institutions under conditions of use.",
  nda: "Confidential information is shared for a defined purpose.",
  collaboration: "Two or more parties carry out research together, each contributing work.",
  other: "Anything that is not one of the types above.",
}

export interface AgreementTypeRow {
  id: AgreementType
  label: string
  key: string
  description: string
  contracts: number
  open: number
  matrixClauses: number
}

export function agreementTypeRows(contracts: Contract[], matrix: Matrix | null | undefined): AgreementTypeRow[] {
  return (Object.keys(AGREEMENT_TYPE_LABEL) as AgreementType[]).map((id) => {
    const of = contracts.filter((c) => c.agreementType === id)
    return {
      id,
      label: AGREEMENT_TYPE_LABEL[id],
      key: id,
      description: AGREEMENT_TYPE_DESCRIPTION[id],
      contracts: of.length,
      open: of.filter((c) => !["signed", "active", "rejected", "closed"].includes(c.state)).length,
      matrixClauses: matrix?.playbooks?.[id]?.clauses?.length ?? 0,
    }
  })
}

export type PropertyType = "Text" | "Person" | "Date" | "Money" | "Choice" | "Reference"

export interface PropertyDef {
  key: string
  label: string
  type: PropertyType
  description: string
  /** Who fills it: Sonar reads it from the agreement, a person enters it, or Govern sets it. */
  source: "Sonar or a person" | "A person" | "Govern"
  value: (c: Contract) => string | null
}

const date = (iso: string | null) => (iso ? iso.slice(0, 10) : null)

export const CONTRACT_PROPERTIES: PropertyDef[] = [
  { key: "title", label: "Title", type: "Text", source: "Sonar or a person", description: "The agreement's name as it appears in lists.", value: (c) => c.title || null },
  { key: "agreementType", label: "Agreement type", type: "Choice", source: "Sonar or a person", description: "Which kind of agreement it is; picks the matrix it is checked against.", value: (c) => AGREEMENT_TYPE_LABEL[c.agreementType] },
  { key: "counterparty", label: "Counterparty", type: "Text", source: "Sonar or a person", description: "The other party to the agreement.", value: (c) => c.counterparty },
  { key: "sponsor", label: "Sponsor", type: "Text", source: "Sonar or a person", description: "Who funds the work, when that is not the counterparty.", value: (c) => c.sponsor },
  { key: "piName", label: "Principal investigator", type: "Text", source: "Sonar or a person", description: "The researcher responsible for the work.", value: (c) => c.piName },
  { key: "department", label: "Department", type: "Text", source: "A person", description: "The department the work sits in; used for routing and reports.", value: (c) => c.department },
  { key: "owner", label: "Owner", type: "Person", source: "A person", description: "The reviewer responsible for moving the contract to signature.", value: (c) => (c.owner ? personName(c.owner) : null) },
  { key: "direction", label: "Money", type: "Choice", source: "Sonar or a person", description: "Whether money comes in, goes out, or neither.", value: (c) => DIRECTION_LABEL[c.direction] },
  { key: "value", label: "Value", type: "Money", source: "Sonar or a person", description: "What the agreement is worth, in its currency.", value: (c) => (c.value === null ? null : contractValueText(c)) },
  { key: "requestedDate", label: "Requested date", type: "Date", source: "A person", description: "When the department needs it signed by.", value: (c) => date(c.requestedDate) },
  { key: "effectiveDate", label: "Effective date", type: "Date", source: "Sonar or a person", description: "When the agreement takes effect.", value: (c) => date(c.effectiveDate) },
  { key: "termEndDate", label: "Term ends", type: "Date", source: "Sonar or a person", description: "When the agreement ends; drives renewal reminders.", value: (c) => date(c.termEndDate) },
  { key: "huronRecordId", label: "Huron record", type: "Reference", source: "A person", description: "The matching record in Huron Research Suite.", value: (c) => c.huronRecordId },
  { key: "workdayRef", label: "Workday reference", type: "Reference", source: "A person", description: "The matching award in Workday, for spend reporting.", value: (c) => c.workdayRef },
  { key: "matrixVersion", label: "Matrix version", type: "Reference", source: "Govern", description: "The review matrix version the latest version was checked against.", value: (c) => (c.matrix?.version ? `v${c.matrix.version}` : null) },
]

export interface PropertyUsage {
  def: PropertyDef
  filled: number
  total: number
  unique: number
  example: string | null
}

export function propertyUsage(contracts: Contract[]): PropertyUsage[] {
  return CONTRACT_PROPERTIES.map((def) => {
    const values = contracts.map(def.value).filter((v): v is string => !!v && v.trim() !== "")
    return { def, filled: values.length, total: contracts.length, unique: new Set(values).size, example: values[0] ?? null }
  })
}
