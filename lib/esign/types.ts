// Govern e-signature: the shapes shared by the reviewer's envelope editor and
// the public /sign/[token] page.
// Contract: sow-analyser-backend/docs/GOVERN_ESIGN.md.

export type EnvelopeStatus = "draft" | "sent" | "sealing" | "completed" | "declined" | "voided" | "expired" | "failed"

export type RecipientRole = "signer" | "cc"

export type RecipientStatus = "pending" | "sent" | "viewed" | "signed" | "declined"

export type SigningOrder = "sequential" | "parallel"

export type FieldType = "signature" | "initials" | "name" | "email" | "date" | "text" | "checkbox"

export type Person = { email: string; name: string | null }

export type Recipient = {
  id: string
  name: string
  email: string
  role: RecipientRole
  /** 1-based; signers with the same order sign in parallel in a sequential envelope. */
  order: number
  status: RecipientStatus
  sentAt: string | null
  viewedAt: string | null
  consentAt: string | null
  signedAt: string | null
  declinedAt: string | null
  declineReason: string | null
  linkExpiresAt: string | null
  ip: string | null
  userAgent: string | null
}

/** A field placed on a page: x, y, w, h are fractions of the displayed page, origin top-left. */
export type Field = {
  id: string
  recipientId: string
  type: FieldType
  page: number
  x: number
  y: number
  w: number
  h: number
  required: boolean
  label: string | null
  value: string | null
}

export type PageImage = { url: string; width: number; height: number }

export type EnvelopeSummary = {
  id: string
  status: EnvelopeStatus
  name: string
  createdAt: string
  sentAt: string | null
  completedAt: string | null
  expiresAt: string | null
  signers: { name: string; email: string; status: RecipientStatus }[]
  signedCount: number
  signerCount: number
}

export type Envelope = EnvelopeSummary & {
  subject: string | null
  message: string | null
  signingOrder: SigningOrder
  expiresInDays: number
  reminderEveryDays: number
  voidReason: string | null
  voidedAt: string | null
  createdBy: Person | null
  sentBy: Person | null
  source: { docId: string | null; filename: string; pageCount: number; sha256: string }
  sealed: { sha256: string; sealedAt: string; timestamped: boolean } | null
  recipients: Recipient[]
  fields: Field[]
  pages: PageImage[]
  failure: { at: string; reason: string } | null
  canEdit: boolean
}

/** One signing link, returned once by send / resend (to copy when email is off). */
export type SigningLink = { recipientId: string; name: string; email: string; url: string; emailed: boolean }

/** What the reviewer saves on a draft (ids optional for new recipients; fields get fresh ids). */
export type RecipientInput = { id?: string; name: string; email: string; role: RecipientRole; order: number }
export type FieldInput = Omit<Field, "id" | "value" | "label" | "required"> & { required?: boolean; label?: string | null }

export type EnvelopeInput = Partial<{
  name: string
  subject: string | null
  message: string | null
  signingOrder: SigningOrder
  expiresInDays: number
  reminderEveryDays: number
  recipients: RecipientInput[]
  fields: FieldInput[]
}>

export type SignerStatus = "ready" | "waiting" | "signed" | "declined" | "closed"

/** GET /sign/{token}: exactly what the signer sees. */
export type SignerView = {
  documentName: string
  organizationName: string | null
  senderName: string
  message: string | null
  recipient: { name: string; email: string }
  envelopeStatus: EnvelopeStatus
  status: SignerStatus
  pages: PageImage[]
  /** This signer's fields only, and only while it is their turn. */
  fields: Pick<Field, "id" | "type" | "page" | "x" | "y" | "w" | "h" | "required" | "label">[]
  consentText: string
  canDownload: boolean
  expiresAt: string | null
}

export type CompleteInput = {
  consent: true
  /** Text, name and checkbox ("true" / "false") values by field id. Signature, initials, date and email are set by the server. */
  values: Record<string, string>
  signature?: { image: string; kind: "drawn" | "typed" }
  initials?: { image: string }
}

export const FIELD_LABEL: Record<FieldType, string> = {
  signature: "Signature",
  initials: "Initials",
  name: "Full name",
  email: "Email",
  date: "Date signed",
  text: "Text",
  checkbox: "Checkbox",
}

/** Default size of a newly placed field, as fractions of a US Letter page. */
export const FIELD_SIZE: Record<FieldType, { w: number; h: number }> = {
  signature: { w: 0.28, h: 0.06 },
  initials: { w: 0.1, h: 0.05 },
  name: { w: 0.28, h: 0.035 },
  email: { w: 0.3, h: 0.035 },
  date: { w: 0.18, h: 0.035 },
  text: { w: 0.3, h: 0.035 },
  checkbox: { w: 0.03, h: 0.023 },
}

export const ENVELOPE_STATUS_LABEL: Record<EnvelopeStatus, string> = {
  draft: "Draft",
  sent: "Out for signature",
  sealing: "Sealing",
  completed: "Completed",
  declined: "Declined",
  voided: "Voided",
  expired: "Expired",
  failed: "Needs attention",
}

export const MAX_SIGNERS = 10
export const MAX_RECIPIENTS = 20
export const EXPIRY_OPTIONS = [3, 7, 14, 30, 60] as const
export const REMINDER_OPTIONS = [0, 1, 2, 3, 7] as const
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
