import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeCp2000Notice,
  buildCp2000EvidenceChecklist,
  getCp2000ResearchPack,
} from "../src/domain-packs/notice-response/index.js";

test("research pack preserves source/fact separation and known authority identities", () => {
  const pack = getCp2000ResearchPack();
  assert.equal(pack.sources.find((source) => source.id === "irs.pub-5181")?.sourceType, "official_publication");
  assert.ok(pack.citations.every((citation) => citation.isSourceStatement));
  assert.ok(pack.citations.every((citation) => pack.sources.some((source) => source.id === citation.sourceId)));
});

test("builds stable required and recommended evidence from an income mismatch", () => {
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
    incomeSource: "1099-NEC from Acme LLC",
  } as const;
  const analysis = analyzeCp2000Notice(notice);
  const checklist = buildCp2000EvidenceChecklist(notice, analysis);

  assert.deepEqual(checklist.items.map((item) => item.id), [
    "cp2000-notice",
    "tax-return-2024",
    "information-return",
    "bank-statements",
    "corrected-information-return",
    "prior-irs-correspondence",
  ]);
  assert.equal(checklist.requiredCount, 3);
  assert.equal(checklist.providedCount, 1);
  assert.equal(checklist.ready, false);
  assert.equal(checklist.items[3]?.requirement, "recommended");
});

test("keeps the notice available while avoiding unsupported conditional evidence", () => {
  const notice = {
    isCp2000: true,
    classificationConfidence: 1,
    taxYear: null,
    responseDate: null,
    proposedTax: null,
    proposedPenalty: null,
    proposedIncomeChanges: [],
    payerReferences: [],
    reportedIncome: null,
    irsReportedIncome: null,
    incomeSource: null,
  } as const;
  const analysis = analyzeCp2000Notice(notice);
  const checklist = buildCp2000EvidenceChecklist(notice, analysis);

  assert.deepEqual(checklist.items.map((item) => item.type), [
    "cp2000_notice",
    "correspondence",
  ]);
  assert.equal(checklist.items[0]?.state, "provided");
  assert.equal(checklist.ready, true);
});
