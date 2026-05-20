import type { ApiDocument, RiskLevel } from "./types";

/**
 * A "project" in the UI = a contract family: a root SOW/MSA grouped with its
 * amendments (linked by the pipeline's graph stage via parentDocId). We derive
 * families purely on the client from the flat document list — no backend
 * Project entity required.
 */
export interface ContractFamily {
  id: string; // root docId
  root: ApiDocument;
  documents: ApiDocument[]; // root first, then amendments oldest→newest
  clauseCount: number;
  highRiskCount: number;
  overallRisk: RiskLevel;
  riskCounts: { low: number; medium: number; high: number; critical: number };
  parties: string[];
  updatedAt: string;
  processing: boolean;
  failed: boolean;
}

const RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const PROCESSING = new Set(["PENDING", "PARSING", "CLASSIFYING", "EMBEDDING", "GRAPHING", "DIFFING", "TIMELINING", "PERSISTING"]);

export function groupFamilies(docs: ApiDocument[]): ContractFamily[] {
  const byId = new Map(docs.map((d) => [d.docId, d]));

  // Walk parentDocId to the ultimate root present in the list.
  const rootOf = (d: ApiDocument): string => {
    let cur = d;
    const seen = new Set<string>();
    while (cur.parentDocId && byId.has(cur.parentDocId) && !seen.has(cur.docId)) {
      seen.add(cur.docId);
      cur = byId.get(cur.parentDocId)!;
    }
    return cur.docId;
  };

  const groups = new Map<string, ApiDocument[]>();
  for (const d of docs) {
    const r = rootOf(d);
    const arr = groups.get(r);
    if (arr) arr.push(d);
    else groups.set(r, [d]);
  }

  const families: ContractFamily[] = [];
  for (const [rootId, members] of groups) {
    const root = byId.get(rootId) ?? members[0];
    const documents = [...members].sort((a, b) => {
      if (a.docId === rootId) return -1;
      if (b.docId === rootId) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const riskCounts = { low: 0, medium: 0, high: 0, critical: 0 };
    let clauseCount = 0;
    let highRiskCount = 0;
    let overallRisk: RiskLevel = "low";
    let updatedAt = "";
    let processing = false;
    let failed = false;
    const partySet = new Set<string>();

    for (const d of members) {
      clauseCount += d.clauseCount ?? 0;
      highRiskCount += d.highRiskCount ?? 0;
      if (d.riskCounts) {
        riskCounts.low += d.riskCounts.low ?? 0;
        riskCounts.medium += d.riskCounts.medium ?? 0;
        riskCounts.high += d.riskCounts.high ?? 0;
        riskCounts.critical += d.riskCounts.critical ?? 0;
      }
      const r = d.overallRisk ?? "low";
      if (RANK[r] > RANK[overallRisk]) overallRisk = r;
      if (d.updatedAt > updatedAt) updatedAt = d.updatedAt;
      if (PROCESSING.has(d.status)) processing = true;
      if (d.status === "FAILED") failed = true;
      (d.parties ?? []).forEach((p) => partySet.add(p));
    }

    families.push({
      id: rootId,
      root,
      documents,
      clauseCount,
      highRiskCount,
      overallRisk,
      riskCounts,
      parties: Array.from(partySet),
      updatedAt,
      processing,
      failed,
    });
  }

  families.sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
  return families;
}
