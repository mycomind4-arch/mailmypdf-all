import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveObligation,
  obligationResolutionToFinding,
} from "../src/index.js";

describe("obligation resolution", () => {
  test("reconstructs core obligation terms from an executed agreement", () => {
    const source = {
      id: "agreement",
      sourceType: "executed-contract" as const,
      provenanceLevel: "document_extracted" as const,
    };
    const result = resolveObligation({
      obligationId: "obligation-1",
      requiredFields: ["creditor-entity-id", "obligor-entity-id", "obligation-type"],
      claims: [
        { id: "creditor", obligationId: "obligation-1", field: "creditor-entity-id", value: "creditor-1", effect: "supports", source },
        { id: "obligor", obligationId: "obligation-1", field: "obligor-entity-id", value: "obligor-1", effect: "supports", source },
        { id: "type", obligationId: "obligation-1", field: "obligation-type", value: "loan", effect: "supports", source },
        { id: "amount", obligationId: "obligation-1", field: "principal-amount", value: 5000, effect: "supports", source },
        { id: "currency", obligationId: "obligation-1", field: "currency", value: "USD", effect: "supports", source },
      ],
    });

    assert.equal(result.disposition, "resolved");
    assert.equal(result.missingRequiredFields.length, 0);
    assert.ok(result.terms.some((term) => term.field === "principal-amount" && term.value === 5000));
  });

  test("allows multiple obligors without treating them as a conflict", () => {
    const source = {
      id: "agreement",
      sourceType: "executed-contract" as const,
      provenanceLevel: "document_extracted" as const,
    };
    const result = resolveObligation({
      obligationId: "obligation-1",
      claims: [
        { id: "obligor-a", obligationId: "obligation-1", field: "obligor-entity-id", value: "party-a", effect: "supports", source },
        { id: "obligor-b", obligationId: "obligation-1", field: "obligor-entity-id", value: "party-b", effect: "supports", source },
      ],
    });

    assert.equal(result.disposition, "resolved");
    assert.equal(result.terms.filter((term) => term.field === "obligor-entity-id").length, 2);
  });

  test("conflicting strong amounts require human review", () => {
    const source = {
      id: "agreement",
      sourceType: "executed-contract" as const,
      provenanceLevel: "document_extracted" as const,
    };
    const result = resolveObligation({
      obligationId: "obligation-1",
      claims: [
        { id: "amount-a", obligationId: "obligation-1", field: "principal-amount", value: 5000, effect: "supports", source },
        { id: "amount-b", obligationId: "obligation-1", field: "principal-amount", value: 7000, effect: "supports", source },
      ],
    });

    assert.equal(result.disposition, "human-review-required");
    assert.equal(result.requiresHumanReview, true);
  });

  test("an invoice can support its claimed amount without proving enforceability", () => {
    const result = resolveObligation({
      obligationId: "obligation-1",
      claims: [{
        id: "invoice-amount",
        obligationId: "obligation-1",
        field: "principal-amount",
        value: 1250,
        effect: "supports",
        source: {
          id: "invoice",
          sourceType: "invoice",
          provenanceLevel: "document_extracted",
        },
      }],
    });

    assert.equal(result.disposition, "resolved");
    assert.equal(result.terms[0]?.value, 1250);
    assert.ok(result.reasons.some((reason) => reason.includes("does not independently determine enforceability")));
  });

  test("reports required-term gaps without inventing values", () => {
    const result = resolveObligation({
      obligationId: "obligation-1",
      requiredFields: ["creditor-entity-id", "obligor-entity-id", "obligation-type"],
      claims: [{
        id: "type",
        obligationId: "obligation-1",
        field: "obligation-type",
        value: "contract-payment",
        effect: "supports",
        source: {
          id: "agreement",
          sourceType: "executed-contract",
          provenanceLevel: "document_extracted",
        },
      }],
    });

    assert.equal(result.disposition, "resolved-with-gaps");
    assert.deepEqual(
      [...result.missingRequiredFields].sort(),
      ["creditor-entity-id", "obligor-entity-id"].sort(),
    );
  });

  test("converts the obligation record into a finding", () => {
    const source = {
      id: "agreement",
      sourceType: "executed-contract" as const,
      provenanceLevel: "document_extracted" as const,
    };
    const result = resolveObligation({
      obligationId: "obligation-1",
      claims: [
        { id: "creditor", obligationId: "obligation-1", field: "creditor-entity-id", value: "creditor-1", effect: "supports", source },
        { id: "obligor", obligationId: "obligation-1", field: "obligor-entity-id", value: "obligor-1", effect: "supports", source },
      ],
    });

    const finding = obligationResolutionToFinding(result);
    assert.equal(finding.findingType, "obligation_resolution");
    assert.equal(finding.provenance.ruleId, "identity-capacity.obligation-resolution.v1");
  });
});
