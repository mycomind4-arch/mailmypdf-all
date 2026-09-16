import assert from "node:assert/strict";
import test from "node:test";
import { createId } from "@mailmypdf/core";
import { createSourceRef } from "@mailmypdf/documents";
import {
  createDocumentUnderstanding,
  replaceUnderstandingObservation,
  understandingToFacts,
  verifyUnderstandingObservation,
} from "../src/understanding.js";

const documentId = createId("doc-1");
const source = createSourceRef({
  documentId,
  documentName: "CP2000.pdf",
  page: 1,
  excerpt: "Tax year 2024",
});

test("document understanding keeps extracted values tied to source pages", () => {
  const understanding = createDocumentUnderstanding({
    documentId: "doc-1",
    documentName: "CP2000.pdf",
    classification: "IRS CP2000",
    classificationConfidence: 0.98,
    requiredKeys: ["tax_year", "notice_date"],
    observations: [
      {
        key: "tax_year",
        value: "2024",
        confidence: 0.96,
        sourceRefs: [source],
        provenanceLevel: "document_extracted",
        required: true,
      },
      {
        key: "notice_date",
        value: "2026-09-01",
        kind: "date",
        confidence: 0.91,
        sourceRefs: [source],
        provenanceLevel: "document_extracted",
        required: true,
      },
    ],
  });

  assert.equal(understanding.readyForFactPromotion, true);
  assert.deepEqual(understanding.missingRequiredKeys, []);
  assert.equal(understandingToFacts(understanding).length, 2);
});

test("AI-inferred observation cannot silently become a fact", () => {
  const understanding = createDocumentUnderstanding({
    documentId: "doc-1",
    documentName: "notice.pdf",
    classification: "official notice",
    classificationConfidence: 0.9,
    observations: [
      {
        key: "requested_action",
        value: "Send supporting records",
        kind: "action",
        confidence: 0.92,
        sourceRefs: [source],
        provenanceLevel: "ai_inferred",
        modelId: "claude-test",
      },
    ],
  });

  assert.equal(understanding.readyForFactPromotion, false);
  assert.deepEqual(understanding.reviewRequiredKeys, ["requested_action"]);
  assert.equal(understandingToFacts(understanding).length, 0);

  const verified = verifyUnderstandingObservation(
    understanding.observations[0]!,
    "user-1",
  );
  const reviewed = replaceUnderstandingObservation(understanding, verified);
  assert.equal(reviewed.readyForFactPromotion, true);
  assert.equal(understandingToFacts(reviewed).length, 1);
  assert.equal(
    understandingToFacts(reviewed)[0]!.provenance.level,
    "human_verified",
  );
});

test("understanding rejects cross-document provenance", () => {
  const wrongSource = createSourceRef({
    documentId: createId("doc-2"),
    documentName: "other.pdf",
    page: 1,
    excerpt: "Different document",
  });

  assert.throws(() =>
    createDocumentUnderstanding({
      documentId: "doc-1",
      documentName: "notice.pdf",
      classification: "notice",
      classificationConfidence: 0.8,
      observations: [
        {
          key: "amount",
          value: "$100",
          confidence: 0.9,
          sourceRefs: [wrongSource],
          provenanceLevel: "document_extracted",
        },
      ],
    }),
  );
});

test("missing required observations prevent readiness", () => {
  const understanding = createDocumentUnderstanding({
    documentId: "doc-1",
    documentName: "notice.pdf",
    classification: "notice",
    classificationConfidence: 0.8,
    requiredKeys: ["notice_date"],
    observations: [],
  });

  assert.equal(understanding.readyForFactPromotion, false);
  assert.deepEqual(understanding.missingRequiredKeys, ["notice_date"]);
});
