import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  createSsaReconsiderationManifestForWorkflow,
  getSsaReconsiderationRuntimePolicy,
} from "../src/index.js";

describe("SSA reconsideration manifest factory", () => {
  test("SSDI declares the complete eight-step appeal workflow with work-history facts", () => {
    const defined = createSsaReconsiderationManifestForWorkflow("appeal-ssdi-denial");
    assert.ok(defined);
    const manifest = defined.manifest;

    assert.equal(manifest.id, "appeal-ssdi-denial");
    assert.equal(manifest.vertical, "appeal-mail");
    assert.equal(manifest.pipeline, "P03_APPEAL");
    assert.equal(manifest.maturity, "executable");
    assert.equal(manifest.requiresHumanReview, true);
    assert.equal(manifest.allowsConsequentialAction, true);
    assert.deepEqual(
      manifest.steps?.map((step) => step.id),
      ["decision", "analysis", "claimant", "evidence", "draft", "forms", "review", "mail"],
    );
    assert.equal(manifest.documents?.[0]?.id, "ssdi-denial-notice");
    assert.equal(manifest.gates?.length, 4);
    assert.equal(manifest.outputs?.length, 7);

    const fields = (manifest.steps ?? []).flatMap((step) => step.fields ?? []);
    assert.ok(fields.some((field) => field.id === "claimant-name" && field.required));
    assert.ok(fields.some((field) => field.id === "confirmed-reconsideration" && field.required));
    assert.ok(fields.some((field) => field.id === "reasons-for-disagreement" && field.required));
    assert.ok(fields.some((field) => field.id === "work-changes" && !field.required));
    assert.equal(fields.some((field) => field.id === "income-facts"), false);
  });

  test("SSI declares the same shape with needs-based facts instead of work-history facts", () => {
    const defined = createSsaReconsiderationManifestForWorkflow("appeal-ssi-denial");
    assert.ok(defined);
    const manifest = defined.manifest;

    assert.equal(manifest.id, "appeal-ssi-denial");
    assert.equal(manifest.documents?.[0]?.id, "ssi-denial-notice");
    assert.deepEqual(
      manifest.steps?.map((step) => step.id),
      ["decision", "analysis", "claimant", "evidence", "draft", "forms", "review", "mail"],
    );

    const fields = (manifest.steps ?? []).flatMap((step) => step.fields ?? []);
    assert.ok(fields.some((field) => field.id === "confirmed-reconsideration" && field.required));
    assert.ok(fields.some((field) => field.id === "income-facts" && !field.required));
    assert.ok(fields.some((field) => field.id === "eligibility-facts" && !field.required));
    assert.equal(fields.some((field) => field.id === "work-changes"), false);
  });

  test("keeps exact packet review and mailing authorization as required consequential gates", () => {
    const manifest = createSsaReconsiderationManifestForWorkflow("appeal-ssdi-denial")!.manifest;
    assert.ok(manifest.gates?.some((gate) =>
      gate.id === "exact-packet-review" && gate.kind === "human_review" && gate.required,
    ));
    assert.ok(manifest.gates?.some((gate) =>
      gate.id === "mailing-authorization" && gate.kind === "mailing_authorization" && gate.required,
    ));
  });

  test("returns null for an unknown workflow id and requires the two registered programs", () => {
    assert.equal(createSsaReconsiderationManifestForWorkflow("appeal-not-real"), null);
    assert.ok(getSsaReconsiderationRuntimePolicy("appeal-ssdi-denial"));
    assert.ok(getSsaReconsiderationRuntimePolicy("appeal-ssi-denial"));
  });
});
