import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { assertNoOutcomeClaims, canDraftBenefitsAppeal, canValidateBenefitsAppeal, extractBenefitsCase } from "../src/benefits-contract";

describe("Benefits Appeal contract", () => {
  test("extracts decision issues without deciding eligibility", () => {
    const result = extractBenefitsCase({
      jurisdiction: "Example State",
      decision: {
        id: "decision-1",
        decisionDate: "2026-08-01",
        deadline: "2026-09-01",
        agency: "Example Benefits Agency",
        caseNumber: "ABC-123",
        process: "reconsideration",
        text: "Your claim was denied.\nYour benefits were terminated due to overpayment.",
      },
      supportingDocuments: [],
    });
    assert.equal(result.issues.length, 2);
    assert.ok(result.issues.every((issue: any) => issue.status === "unmapped"));
  });

  test("requires evidence before drafting", () => {
    const result = extractBenefitsCase({
      decision: { id: "d", text: "Your claim was denied." },
      supportingDocuments: [],
    });
    assert.equal(canDraftBenefitsAppeal(result), false);
    result.issues[0].status = "supported";
    result.issues[0].evidenceIds.push("e1");
    assert.equal(canDraftBenefitsAppeal(result), true);
    assert.equal(canValidateBenefitsAppeal(result), true);
  });

  test("blocks supported issues without evidence provenance", () => {
    const result = extractBenefitsCase({
      decision: { id: "d", text: "Your claim was denied." },
      supportingDocuments: [],
    });
    result.issues[0].status = "supported";
    assert.equal(canDraftBenefitsAppeal(result), false);
  });

  test("blocks validation when an issue needs an authoritative source", () => {
    const result = extractBenefitsCase({
      decision: { id: "d", text: "Your claim was denied." },
      supportingDocuments: [],
    });
    result.issues[0].status = "needs_authority";
    assert.equal(canDraftBenefitsAppeal(result), false);
    assert.equal(canValidateBenefitsAppeal(result), false);
  });

  test("rejects unsupported outcome claims", () => {
    assert.throws(() => assertNoOutcomeClaims("You will win this appeal."));
    assert.doesNotThrow(() => assertNoOutcomeClaims("The decision states that income documentation was incomplete."));
  });
});
