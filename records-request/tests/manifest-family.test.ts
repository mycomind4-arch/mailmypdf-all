import assert from "node:assert/strict";
import test from "node:test";
import {
  RECORDS_REQUEST_REQUIRED_CAPABILITIES,
  createRecordsRequestManifest,
} from "@mailmypdf/workflows";
import agencyRecordsRequestManifest from "../workflows/agency-records-request/manifest.js";
import publicRecordsRequestManifest from "../workflows/public-records-request/manifest.js";
import openRecordsRequestManifest from "../workflows/open-records-request/manifest.js";
import governmentDocumentsRequestManifest from "../workflows/government-documents-request/manifest.js";

const manifests = [
  agencyRecordsRequestManifest,
  publicRecordsRequestManifest,
  openRecordsRequestManifest,
  governmentDocumentsRequestManifest,
] as const;

test("records request manifest family shares one request-first contract", () => {
  assert.equal(manifests.length, 4);
  assert.equal(new Set(manifests.map((value) => value.manifest.id)).size, 2);

  for (const workflow of manifests) {
    const manifest = workflow.manifest;
    assert.equal(manifest.vertical, "records-request");
    assert.equal(manifest.pipeline, "P08_RECORDS");
    assert.equal(manifest.primaryInput, "request");
    assert.equal(manifest.maturity, "wired");
    assert.equal(manifest.steps?.length, 7);
    assert.equal(manifest.requiresHumanReview, true);
    assert.equal(manifest.allowsConsequentialAction, true);
    assert.deepEqual(
      manifest.requiredCapabilities,
      RECORDS_REQUEST_REQUIRED_CAPABILITIES,
    );
    assert.ok(
      manifest.gates?.some(
        (gate) => gate.id === "authority-grounding" && gate.required,
      ),
    );
    assert.ok(
      manifest.gates?.some(
        (gate) => gate.kind === "mailing_authorization" && gate.required,
      ),
    );
  }
});

test("records request manifest factory preserves rich scope and authority fields", () => {
  const manifest = createRecordsRequestManifest({
    workflowId: "example-records-request",
    title: "Example Records Request",
  }).manifest;
  const scope = manifest.steps?.find((step) => step.id === "scope");
  const authority = manifest.steps?.find((step) => step.id === "authority");

  assert.ok(scope?.fields?.some((field) => field.id === "records-sought"));
  assert.ok(scope?.fields?.some((field) => field.id === "scope-confirmed"));
  assert.ok(authority?.fields?.some((field) => field.id === "authority-citation"));
  assert.ok(authority?.fields?.some((field) => field.id === "authority-verified"));
});
