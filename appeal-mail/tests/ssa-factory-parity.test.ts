import assert from "node:assert/strict";
import test from "node:test";

import ssdiManifest from "../workflows/appeal-ssdi-denial/manifest";
import ssiManifest from "../workflows/appeal-ssi-denial/manifest";
import { getSsaReconsiderationFactoryArtifact } from "@mailmypdf/workflows";

test("SSDI and SSI local manifests are projections of the shared SSA factory artifacts", () => {
  const ssdi = getSsaReconsiderationFactoryArtifact("appeal-ssdi-denial");
  const ssi = getSsaReconsiderationFactoryArtifact("appeal-ssi-denial");

  assert.ok(ssdi);
  assert.ok(ssi);
  assert.equal(ssdi.factoryReady, true);
  assert.equal(ssi.factoryReady, true);
  assert.deepEqual(ssdi.diagnostics, []);
  assert.deepEqual(ssi.diagnostics, []);
  assert.equal(ssdiManifest, ssdi.definition);
  assert.equal(ssiManifest, ssi.definition);
  assert.equal(ssdi.manifest.route, "/appeal-mail/workflows/appeal-ssdi-denial/start");
  assert.equal(ssi.manifest.route, "/appeal-mail/workflows/appeal-ssi-denial/start");
});

test("SSA web and chat now use the same camelCase claimant-field contract", () => {
  for (const id of ["appeal-ssdi-denial", "appeal-ssi-denial"] as const) {
    const artifact = getSsaReconsiderationFactoryArtifact(id);
    assert.ok(artifact);

    const fields = new Set(
      artifact.manifest.steps
        ?.flatMap((step) => step.fields ?? [])
        .map((field) => field.id) ?? [],
    );

    assert.ok(fields.has("claimantName"));
    assert.ok(fields.has("claimantAddress"));
    assert.ok(fields.has("reasonsForDisagreement"));
    assert.ok(fields.has("confirmedReconsideration"));
    assert.ok(fields.has("factsConfirmed"));
    assert.ok(fields.has("recipientAddress"));

    assert.equal(fields.has("claimant-name"), false);
    assert.equal(fields.has("claimant-address"), false);
    assert.equal(fields.has("reasons-for-disagreement"), false);
  }
});
