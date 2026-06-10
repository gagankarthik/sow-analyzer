// Central metadata for document types — friendly labels, short chip text, and a
// Badge tone — so every badge, filter, and chart renders the new licensing /
// compliance types consistently instead of raw enum strings.

import type { DocType } from "./types";

export type DocTypeTone =
  | "info" | "warning" | "neutral" | "ai" | "success" | "secondary";

export const DOC_TYPE_META: Record<DocType, { label: string; short: string; tone: DocTypeTone }> = {
  SOW:        { label: "Statement of Work",            short: "SOW",        tone: "info" },
  MSA:        { label: "Master Service Agreement",     short: "MSA",        tone: "info" },
  AMENDMENT:  { label: "Amendment",                    short: "Amendment",  tone: "warning" },
  NDA:        { label: "Non-Disclosure Agreement",     short: "NDA",        tone: "neutral" },
  LICENSE:    { label: "Licence / Technology",         short: "License",    tone: "ai" },
  DPA:        { label: "Data Processing Agreement",    short: "DPA",        tone: "success" },
  BAA:        { label: "Business Associate Agreement", short: "BAA",        tone: "success" },
  COMPLIANCE: { label: "Compliance / Attestation",     short: "Compliance", tone: "success" },
  OTHER:      { label: "Other",                        short: "Other",      tone: "neutral" },
};

export function docTypeLabel(t: string | null | undefined): string {
  return (t && DOC_TYPE_META[t as DocType]?.label) || (t ?? "Other");
}

export function docTypeShort(t: string | null | undefined): string {
  return (t && DOC_TYPE_META[t as DocType]?.short) || (t ?? "Other");
}

export function docTypeTone(t: string | null | undefined): DocTypeTone {
  return (t && DOC_TYPE_META[t as DocType]?.tone) || "neutral";
}
