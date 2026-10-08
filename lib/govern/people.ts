import { OFFICE_LABEL } from "@/lib/govern/labels"
import type { Contract, Person } from "@/lib/govern/types"

/** A person on a contract and what they did on it. */
export interface ContractPerson extends Person {
  roles: string[]
}

/**
 * Everyone the record names on a contract, owner first, each once (by email),
 * with every role they hold. Read from the contract itself (owner, office
 * approvals, the PI question, a rejection, the signatory), never invented.
 */
export function contractPeople(c: Contract): ContractPerson[] {
  const byEmail = new Map<string, ContractPerson>()
  const add = (p: Person | null | undefined, role: string) => {
    if (!p?.email) return
    const key = p.email.toLowerCase()
    const existing = byEmail.get(key)
    if (existing) {
      if (!existing.roles.includes(role)) existing.roles.push(role)
      if (!existing.name && p.name) existing.name = p.name
      return
    }
    byEmail.set(key, { email: p.email, name: p.name, roles: [role] })
  }

  add(c.owner, "Owner")
  for (const a of c.routing?.approvals ?? []) {
    add(a.by, a.office === "reviewer" ? "Approved as reviewer" : `Approved for ${OFFICE_LABEL[a.office]}`)
  }
  add(c.piRequest?.by, "Asked the PI a question")
  add(c.rejection?.by, "Rejected it")
  add(c.signature?.signatory, "Signatory")
  return [...byEmail.values()]
}
