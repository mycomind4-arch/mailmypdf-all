import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  insuranceAppealManifest,
  insuranceAppealPackSet,
  validateAppealDraft,
} from "../src/index.js";

describe("Insurance appeal domain pack", () => {
  test("declares the canonical appeal capabilities needed by the shared engine", () => {
    assert.equal(insuranceAppealManifest.id, "appeal.insurance-denial");
    assert.equal(insuranceAppealPackSet.engine, "appeal");
    assert.ok(insuranceAppealManifest.capabilities.includes("classification"));
    assert.ok(insuranceAppealManifest.capabilities.includes("validation"));
    assert.ok(insuranceAppealManifest.capabilities.includes("mailing"));
    assert.ok(insuranceAppealManifest.capabilities.includes("proofAudit"));
    assert.ok(insuranceAppealPackSet.document.classifierHints.includes("denied"));
  });

  test("flags unsupported appeal grounds and unresolved placeholders", () => {
    const draft = [
      "Dear Appeals Department:",
      "Re: Claim ABC-123",
      "I appeal this denial and request that you reconsider the decision.",
      "The insurer applied the wrong policy provision to this claim and should reverse the denial.",
      "[INSERT SUPPORTING DETAIL]",
      "Sincerely,",
      "Jordan Example",
    ].join("\n\n");

    const result = validateAppealDraft(
      draft,
      {
        referenceNumber: "ABC-123",
        agency: "Example Insurer",
      },
      [
        {
          id: "ground-policy",
          type: "misapplied_rule",
          claim: "The insurer applied the wrong policy provision to this claim",
        },
      ],
      [],
      insuranceAppealPackSet.validation,
    );

    assert.equal(result.passed, true);
    assert.ok(result.warnings >= 2);
    assert.ok(result.findings.some((finding) => finding.check === "unsupported_ground:ground-policy" && !finding.passed));
    assert.ok(result.findings.some((finding) => finding.check.startsWith("placeholder:") && !finding.passed));
  });

  test("blocks a draft that is too short or missing required sections", () => {
    const result = validateAppealDraft(
      "Appeal this denial.",
      {},
      [],
      [],
      insuranceAppealPackSet.validation,
    );

    assert.equal(result.passed, false);
    assert.ok(result.blocks > 0);
    assert.ok(result.errors > 0);
  });
});
