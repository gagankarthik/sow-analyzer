// The demo's sample matrix (an Excel workbook) goes through the same parser
// and mapping an admin's upload does: every row maps to a known clause type,
// agreement type and office, with nothing flagged.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildPreview, detectMapping, parseMatrixFile, resolveAgreementType } from "../../components/govern/matrix/import-utils";

const SAMPLE = resolve(__dirname, "../../../sow-analyser-backend/samples/research/review-matrix.xlsx");

describe("matrix import", () => {
  it("reads the sample Excel matrix with every row ready to import", async () => {
    const bytes = readFileSync(SAMPLE);
    const file = new File([bytes], "review-matrix.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const sheet = await parseMatrixFile(file);
    expect(sheet.rows.length).toBe(22);
    const mapping = detectMapping(sheet.headers);
    expect(mapping.clauseType).not.toBeNull();
    expect(mapping.standard).not.toBeNull();
    expect(mapping.escalationOffice).not.toBeNull();
    const preview = buildPreview(sheet, mapping, true);
    const problems = preview.filter((r) => r.problems.length > 0);
    expect(problems).toEqual([]);
    expect(new Set(preview.map((r) => r.agreementType))).toEqual(new Set(["license", "sponsored_research"]));
  });

  it("knows the new agreement types by their everyday names", () => {
    expect(resolveAgreementType("Clinical trial agreement")).toBe("clinical_trial")
    expect(resolveAgreementType("DUA")).toBe("data_use")
    expect(resolveAgreementType("SaaS")).toBe("software")
  });
});
