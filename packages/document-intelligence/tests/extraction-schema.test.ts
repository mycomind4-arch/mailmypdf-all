import assert from "node:assert/strict";
import test from "node:test";
import {
  ExtractionSchemaRegistry,
  buildExtractionInstruction,
  createDocumentExtractionSchema,
  validateStructuredExtraction,
} from "../src/extraction-schema.js";

const schema = createDocumentExtractionSchema({
  id: "irs.cp2000.v1",
  version: 1,
  documentKinds: ["notice"],
  strict: true,
  fields: [
    {
      id: "noticeDate",
      label: "Notice date",
      type: "date",
      description: "Date printed on the notice",
      required: true,
    },
    {
      id: "amountDue",
      label: "Proposed amount",
      type: "money",
      description: "Proposed amount exactly as printed",
      required: false,
    },
    {
      id: "responseMode",
      label: "Response mode",
      type: "text",
      description: "Mode explicitly identified by the notice",
      required: false,
      allowedValues: ["agree", "disagree", "partial"],
    },
  ],
});

test("structured extraction requires source evidence for extracted values", () => {
  const result = validateStructuredExtraction(schema, {
    schemaId: "irs.cp2000.v1",
    fields: {
      noticeDate: {
        value: "2026-09-15",
        confidence: 0.99,
        source: { page: 1, excerpt: "Notice date: September 15, 2026" },
      },
      amountDue: {
        value: "$1,250.00",
        confidence: 0.92,
        source: { page: 2, excerpt: "Proposed amount $1,250.00" },
      },
    },
  });

  assert.equal(result.valid, true);
});

test("structured extraction rejects unsupported values and invented fields", () => {
  const result = validateStructuredExtraction(schema, {
    schemaId: "irs.cp2000.v1",
    fields: {
      noticeDate: {
        value: "September 15",
        confidence: 1,
        source: { page: 1, excerpt: "September 15" },
      },
      responseMode: {
        value: "maybe",
        confidence: 0.7,
        source: { page: 1, excerpt: "Response options" },
      },
      inventedDeadline: {
        value: "2026-10-01",
        confidence: 0.5,
        source: { page: 1, excerpt: "not actually there" },
      },
    },
  });

  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.fieldId === "noticeDate"));
  assert.ok(result.issues.some((issue) => issue.fieldId === "responseMode"));
  assert.ok(result.issues.some((issue) => issue.code === "unknown_field"));
});

test("non-null extracted values fail without provenance", () => {
  const result = validateStructuredExtraction(schema, {
    schemaId: "irs.cp2000.v1",
    fields: {
      noticeDate: {
        value: "2026-09-15",
        confidence: 0.99,
      },
    },
  });

  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "missing_source"));
});

test("schema registry rejects duplicate ids", () => {
  const registry = new ExtractionSchemaRegistry().register(schema);
  assert.equal(registry.get("irs.cp2000.v1").version, 1);
  assert.throws(() => registry.register(schema), /already registered/);
});

test("prompt builder derives extraction instructions from the same schema", () => {
  const instruction = buildExtractionInstruction(schema);
  assert.match(instruction, /irs\.cp2000\.v1/);
  assert.match(instruction, /noticeDate/);
  assert.match(instruction, /source \{ page, excerpt \}/);
});
