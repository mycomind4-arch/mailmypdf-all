import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CLAIM_DENIAL_EXTRACTION_SCHEMA_ID,
  claimDenialLetterSchema,
} from "../src/schemas/claim-denial-letter.js";
import { validateStructuredExtraction } from "../src/extraction-schema.js";

test("claim denial schema uses the existing canonical id and mature insurance fields", () => {
  assert.equal(CLAIM_DENIAL_EXTRACTION_SCHEMA_ID, "claim-denial-letter-v1");
  const fields = new Set(claimDenialLetterSchema.fields.map((field) => field.id));
  for (const requiredField of [
    "insurerName",
    "claimNumber",
    "policyNumber",
    "denialDate",
    "denialReasons",
    "citedPolicyProvisions",
    "amountInDispute",
    "appealDeadline",
    "appealInstructions",
    "requestedService",
    "diagnosisCode",
    "procedureCode",
  ]) {
    assert.ok(fields.has(requiredField), `missing ${requiredField}`);
  }
});

test("non-null extracted values require source evidence and unsupported optional values may stay null", () => {
  const valid = validateStructuredExtraction(claimDenialLetterSchema, {
    schemaId: "claim-denial-letter-v1",
    fields: Object.fromEntries(claimDenialLetterSchema.fields.map((field) => [field.id, {
      value: field.id === "denialReasons" ? ["Service is not covered"] : null,
      confidence: field.id === "denialReasons" ? 0.96 : 0,
      ...(field.id === "denialReasons" ? { source: { page: 1, excerpt: "This service is not covered under your plan." } } : {}),
    }])),
  });
  assert.equal(valid.valid, true);

  const missingSource = validateStructuredExtraction(claimDenialLetterSchema, {
    schemaId: "claim-denial-letter-v1",
    fields: Object.fromEntries(claimDenialLetterSchema.fields.map((field) => [field.id, {
      value: field.id === "denialReasons" ? ["Service is not covered"] : null,
      confidence: field.id === "denialReasons" ? 0.96 : 0,
    }])),
  });
  assert.equal(missingSource.valid, false);
  assert.ok(missingSource.issues.some((issue) => issue.fieldId === "denialReasons" && issue.code === "missing_source"));
});

test("relative appeal periods are not accepted as fabricated explicit deadline dates", () => {
  const appealDeadline = claimDenialLetterSchema.fields.find((field) => field.id === "appealDeadline");
  assert.ok(appealDeadline);
  assert.match(appealDeadline.description, /explicit calendar deadline/i);
  assert.match(appealDeadline.description, /Relative periods/i);
});
