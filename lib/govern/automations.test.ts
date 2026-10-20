import { describe, expect, it } from "vitest"
import {
  STARTER_TEMPLATES, actionSummary, actionsSummary, conditionSummary, emptyDraft, fromDraft, newAction, newCondition,
  ruleSentence, splitEmails, toDraft, triggerSummary, validateDraft,
} from "./automations"
import type { AutomationInput } from "./types"

describe("triggerSummary", () => {
  it("says each trigger in plain words", () => {
    expect(triggerSummary({ type: "in_stage_for", stage: "review", days: 10 })).toBe("In review for 10 days or more")
    expect(triggerSummary({ type: "in_stage_for", stage: "negotiation", days: 1 })).toBe("With the other side for 1 day or more")
    expect(triggerSummary({ type: "term_ends_in", days: 30 })).toBe("Term ends within 30 days")
    expect(triggerSummary({ type: "term_ends_in", days: 0 })).toBe("Term ends today")
    expect(triggerSummary({ type: "obligation_due_in", days: 14 })).toBe("Obligation due within 14 days")
    expect(triggerSummary({ type: "contract_received" })).toBe("Contract arrives")
    expect(triggerSummary({ type: "stage_changed" })).toBe("Changes stage")
    expect(triggerSummary({ type: "stage_changed", to: "approval" })).toBe("Moves to Approval and signature")
    expect(triggerSummary({ type: "sent_back" })).toBe("Sent back")
    expect(triggerSummary({ type: "blocker_added", tier: "unacceptable" })).toBe("Unacceptable clause found")
    expect(triggerSummary({ type: "blocker_added", tier: "deviates" })).toBe("Deviating clause found")
    expect(triggerSummary({ type: "blocker_added" })).toBe("Open item added")
    expect(triggerSummary({ type: "signed" })).toBe("Signed")
  })
})

describe("conditionSummary and actionSummary", () => {
  it("names conditions", () => {
    expect(conditionSummary({ field: "agreementType", op: "in", value: ["license", "option"] })).toBe("Type is License or Option")
    expect(conditionSummary({ field: "agreementType", op: "in", value: ["license", "option", "nda", "mta"] }))
      .toBe("Type is License, Option or 2 more")
    expect(conditionSummary({ field: "value", op: "gte", value: 500000 })).toBe("Value at least $500,000")
    expect(conditionSummary({ field: "value", op: "lte", value: 1000 }, "EUR")).toBe("Value at most €1,000")
    expect(conditionSummary({ field: "direction", op: "is", value: "incoming" })).toBe("Money in")
    expect(conditionSummary({ field: "owner", op: "unset" })).toBe("No owner")
    expect(conditionSummary({ field: "counterparty", op: "contains", value: "Acme" })).toBe("Counterparty contains “Acme”")
  })

  it("names actions", () => {
    expect(actionSummary({ type: "notify", to: "owner" })).toBe("Notify the owner")
    expect(actionSummary({ type: "notify", to: "office", office: "legal_affairs" })).toBe("Notify Legal Affairs")
    expect(actionSummary({ type: "notify", to: "emails", emails: ["a@x.edu"] })).toBe("Notify a@x.edu")
    expect(actionSummary({ type: "notify", to: "emails", emails: ["a@x.edu", "b@x.edu"] })).toBe("Notify 2 people")
    expect(actionSummary({ type: "escalate", office: "export_control" })).toBe("Escalate to Export Control")
    expect(actionSummary({ type: "assign" })).toBe("Assign by the rules")
    expect(actionSummary({ type: "assign", owner: { email: "dana@x.edu", name: "Dana Ruiz" } })).toBe("Assign to Dana Ruiz")
    expect(actionsSummary([{ type: "escalate", office: "legal_affairs" }, { type: "comment", text: "x" }]))
      .toBe("Escalate to Legal Affairs · Add a comment")
  })

  it("reads a whole rule as one sentence", () => {
    expect(ruleSentence(STARTER_TEMPLATES[1].input)).toBe("Term ends within 30 days (has an owner): Notify the owner.")
    expect(ruleSentence(STARTER_TEMPLATES[0].input))
      .toBe("In review for 10 days or more: Escalate to Legal Affairs, then notify the owner.")
  })
})

describe("draft round trip", () => {
  it("turns every starter template into a draft and back unchanged", () => {
    for (const t of STARTER_TEMPLATES) {
      const draft = toDraft(t.input)
      expect(validateDraft(draft).count).toBe(0)
      expect(fromDraft(draft)).toEqual(t.input)
    }
  })

  it("keeps every field of a full rule", () => {
    const rule: AutomationInput = {
      name: "All of it",
      enabled: false,
      trigger: { type: "stage_changed", to: "approval" },
      conditions: [
        { field: "agreementType", op: "in", value: ["license"] },
        { field: "direction", op: "is", value: "outgoing" },
        { field: "value", op: "lte", value: 250000 },
        { field: "department", op: "is", value: "Chemistry" },
        { field: "owner", op: "unset" },
        { field: "counterparty", op: "contains", value: "Lakeshore" },
      ],
      actions: [
        { type: "notify", to: "emails", emails: ["a@x.edu", "b@x.edu"], message: "{contract} moved." },
        { type: "assign", owner: { email: "dana@x.edu", name: "Dana Ruiz" } },
        { type: "assign" },
        { type: "comment", text: "Hello {owner}" },
      ],
    }
    expect(fromDraft(toDraft(rule))).toEqual(rule)
  })

  it("cleans what was typed", () => {
    const d = emptyDraft()
    d.name = "  Ping  "
    d.actions = [{ ...newAction("notify"), to: "emails", emails: "A@x.edu, b@x.edu; a@x.edu" }]
    expect(fromDraft(d).name).toBe("Ping")
    expect(fromDraft(d).actions[0]).toEqual({ type: "notify", to: "emails", emails: ["a@x.edu", "b@x.edu"] })
    expect(splitEmails(" ")).toEqual([])
  })
})

describe("validateDraft", () => {
  it("starts with only the name to fill in", () => {
    const errors = validateDraft(emptyDraft())
    expect(errors.name).toBe("Name the rule.")
    expect(errors.count).toBe(1)
  })

  it("checks days, conditions and actions the way the API does", () => {
    const d = emptyDraft()
    d.name = "x"
    d.trigger.days = 0
    expect(validateDraft(d).trigger).toBe("Use 1 to 3650 days.")
    d.trigger = { ...d.trigger, type: "term_ends_in", days: 0 }
    expect(validateDraft(d).trigger).toBeUndefined()
    d.trigger.days = 2.5
    expect(validateDraft(d).trigger).toBe("Use whole days.")
    d.trigger.days = 30

    d.conditions = [newCondition("agreementType"), { ...newCondition("value"), amount: -1 }, newCondition("department"), newCondition("owner")]
    expect(validateDraft(d).conditions).toEqual([
      "Pick at least one agreement type.", "Enter an amount of 0 or more.", "Enter some text to match.", undefined,
    ])
    d.conditions = []

    d.actions = [
      { ...newAction("notify"), to: "emails", emails: "nope" },
      { ...newAction("notify"), message: "Hi {name}" },
      newAction("comment"),
      { ...newAction("assign"), ownerEmail: "bad" },
      newAction("escalate"),
    ]
    const errors = validateDraft(d)
    expect(errors.actions[0]).toBe("nope is not an email address.")
    expect(errors.actions[1]).toMatch(/^\{name\} is not a placeholder/)
    expect(errors.actions[2]).toBe("Write the comment.")
    expect(errors.actions[3]).toMatch(/valid email/)
    expect(errors.actions[4]).toBeUndefined()
    expect(errors.count).toBe(4)

    d.actions = []
    expect(validateDraft(d).actions).toEqual(["Add at least one action."])
  })
})
