import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  createInsuranceAppealManifest,
  createInsuranceAppealManifestForWorkflow,
  INSURANCE_APPEAL_MANIFEST_PROFILES,
  INSURANCE_APPEAL_REQUIRED_CAPABILITIES,
} from "../src/index.js";

describe("Insurance appeal manifest factory", () => {
  test("defaults scaffold workflows to wired maturity with the canonical seven-step lifecycle", () => {
    const defined = createInsuranceAppealManifest({
      workflowId: "appeal-example-insurance-denial",
      title: "Appeal Example Insurance Denial",
      primaryDocumentId: "example-denial",
      primaryDocumentLabel: "Insurance denial letter",
      extractionSchema: "claim-denial-letter-v1",
    });

    const manifest = defined.manifest;
    assert.equal(manifest.maturity, "wired");
    assert.equal(manifest.pipeline, "P03_APPEAL");
    assert.deepEqual(manifest.adapters, ["insurance"]);
    assert.deepEqual(manifest.steps?.map((step) => step.id), [
      "decision", "analysis", "facts", "evidence", "draft", "review", "mail",
    ]);
    assert.equal(manifest.gates?.length, 4);
    assert.equal(manifest.outputs?.length, 7);
    assert.equal(manifest.acceptanceScenarios?.length, 4);
    assert.deepEqual(manifest.requiredCapabilities, INSURANCE_APPEAL_REQUIRED_CAPABILITIES);
    assert.ok(defined.plan);
  });

  test("keeps exact packet review and mailing authorization as required consequential gates", () => {
    const manifest = createInsuranceAppealManifest({
      workflowId: "appeal-example-insurance-denial",
      title: "Appeal Example Insurance Denial",
      primaryDocumentId: "example-denial",
      primaryDocumentLabel: "Insurance denial letter",
      extractionSchema: "claim-denial-letter-v1",
    }).manifest;

    assert.equal(manifest.requiresHumanReview, true);
    assert.equal(manifest.allowsConsequentialAction, true);
    assert.ok(manifest.gates?.some((gate) =>
      gate.id === "exact-packet-review" && gate.kind === "human_review" && gate.required,
    ));
    assert.ok(manifest.gates?.some((gate) =>
      gate.id === "mailing-authorization" && gate.kind === "mailing_authorization" && gate.required,
    ));
  });

  test("uses only the supplied registered extraction schema identity", () => {
    const manifest = createInsuranceAppealManifest({
      workflowId: "appeal-example-insurance-denial",
      title: "Appeal Example Insurance Denial",
      primaryDocumentId: "example-denial",
      primaryDocumentLabel: "Insurance denial letter",
      extractionSchema: "claim-denial-letter-v1",
    }).manifest;

    assert.equal(manifest.documents?.[0]?.extractionSchema, "claim-denial-letter-v1");
    assert.throws(() => createInsuranceAppealManifest({
      workflowId: "appeal-example-insurance-denial",
      title: "Appeal Example Insurance Denial",
      primaryDocumentId: "example-denial",
      primaryDocumentLabel: "Insurance denial letter",
      extractionSchema: "",
    }), /registered extraction schema id/);
  });
});


test("shared insurance profiles cover every platform runtime id and expose chat fields", () => {
  assert.equal(INSURANCE_APPEAL_MANIFEST_PROFILES.length, 11);
  assert.equal(
    new Set(INSURANCE_APPEAL_MANIFEST_PROFILES.map((profile) => profile.workflowId)).size,
    11,
  );

  const defined = createInsuranceAppealManifestForWorkflow(
    "appeal-insurance-claim-denial",
  );
  assert.ok(defined);
  const fields = (defined.manifest.steps ?? []).flatMap((step) => step.fields ?? []);
  assert.ok(fields.some((field) => field.id === "claimantName" && field.required));
  assert.ok(fields.some((field) => field.id === "factsConfirmed" && field.required));
  assert.ok(fields.some((field) => field.id === "evidenceReviewComplete" && field.required));
  assert.ok(fields.some((field) => field.id === "recipientAddress" && field.required));
  assert.equal(createInsuranceAppealManifestForWorkflow("appeal-not-real"), null);
});
