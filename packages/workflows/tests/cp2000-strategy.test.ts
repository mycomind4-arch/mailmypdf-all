import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeCp2000Notice,
  buildCp2000EvidenceChecklist,
  planCp2000Response,
} from "../src/domain-packs/notice-response/index.js";

const notice = {
  isCp2000: true,
  classificationConfidence: 1,
  taxYear: "2024",
  responseDate: "2025-06-01",
  proposedTax: "$2,000",
  proposedPenalty: null,
  proposedIncomeChanges: ["1099-NEC"],
  payerReferences: ["Acme LLC"],
  reportedIncome: "$10,000",
  irsReportedIncome: "$14,000",
  incomeSource: "1099-NEC",
} as const;

test("strategy preserves the user's selected partial-agreement position", () => {
  const analysis = analyzeCp2000Notice(notice);
  const evidence = buildCp2000EvidenceChecklist(notice, analysis);
  const plan = planCp2000Response({
    notice,
    analysis,
    evidence,
    responseMode: "partial-agreement",
    extractionConfident: true,
  });

  assert.equal(plan.position, "disagree_some");
  assert.ok(plan.issues.some((issue) => issue.includes("IRS reports")));
  assert.ok(plan.evidenceToInclude.length > 0);
  assert.ok(plan.supportingSourceIds.includes("irs.pub-5181"));
});

test("strategy fails closed when the position or extraction confidence is missing", () => {
  const analysis = analyzeCp2000Notice({ ...notice, responseDate: null });
  const evidence = buildCp2000EvidenceChecklist({ ...notice, responseDate: null }, analysis);
  const plan = planCp2000Response({
    notice: { ...notice, responseDate: null },
    analysis,
    evidence,
    responseMode: null,
    extractionConfident: false,
  });

  assert.equal(plan.position, "insufficient_info");
  assert.ok(plan.unresolvedIssues.length >= 2);
  assert.equal(plan.confidence, "low");
});
