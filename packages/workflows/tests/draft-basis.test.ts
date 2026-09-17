import assert from "node:assert/strict";
import test from "node:test";
import {
  createWorkflowDraftBasis,
  workflowDocumentStateFingerprint,
  workflowDraftBasisMatches,
  type WorkflowMatterDocument,
} from "../src/index.js";

const source: WorkflowMatterDocument = {
  id: "source-link",
  documentId: "source-doc",
  role: "subject_notice",
  evidenceKind: null,
  pageCount: 2,
  included: false,
  position: 0,
  filename: "decision.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1200,
  securityStatus: "clean",
  usable: true,
};

const evidence: WorkflowMatterDocument = {
  id: "evidence-link",
  documentId: "evidence-doc",
  role: "evidence",
  evidenceKind: "supporting_record",
  pageCount: 3,
  included: true,
  position: 1,
  filename: "record.pdf",
  mimeType: "application/pdf",
  sizeBytes: 2400,
  securityStatus: "clean",
  usable: true,
};

test("draft basis is deterministic for the same logical document state", () => {
  const left = workflowDocumentStateFingerprint([source, evidence]);
  const right = workflowDocumentStateFingerprint([evidence, source]);
  assert.equal(left, right);

  const basis = createWorkflowDraftBasis({
    analysis: { version: 2, documentId: "source-doc" },
    inputVersion: 4,
    documents: [source, evidence],
  });
  assert.equal(
    workflowDraftBasisMatches(
      basis,
      createWorkflowDraftBasis({
        analysis: { version: 2, documentId: "source-doc" },
        inputVersion: 4,
        documents: [evidence, source],
      }),
    ),
    true,
  );
});

test("draft basis changes when analysis, input, or packet-relevant document state changes", () => {
  const basis = createWorkflowDraftBasis({
    analysis: { version: 1, documentId: "source-doc" },
    inputVersion: 1,
    documents: [source, evidence],
  });

  const changes = [
    createWorkflowDraftBasis({
      analysis: { version: 2, documentId: "source-doc" },
      inputVersion: 1,
      documents: [source, evidence],
    }),
    createWorkflowDraftBasis({
      analysis: { version: 1, documentId: "source-doc" },
      inputVersion: 2,
      documents: [source, evidence],
    }),
    createWorkflowDraftBasis({
      analysis: { version: 1, documentId: "source-doc" },
      inputVersion: 1,
      documents: [source, { ...evidence, included: false }],
    }),
    createWorkflowDraftBasis({
      analysis: { version: 1, documentId: "source-doc" },
      inputVersion: 1,
      documents: [source, { ...evidence, evidenceKind: "policy_or_plan" }],
    }),
    createWorkflowDraftBasis({
      analysis: { version: 1, documentId: "source-doc" },
      inputVersion: 1,
      documents: [source, { ...evidence, securityStatus: "quarantined", usable: false }],
    }),
  ];

  for (const changed of changes) {
    assert.equal(workflowDraftBasisMatches(basis, changed), false);
  }
});

test("draft basis rejects invalid source and version identities", () => {
  assert.throws(
    () =>
      createWorkflowDraftBasis({
        analysis: { version: 0, documentId: "source-doc" },
        inputVersion: 1,
        documents: [source],
      }),
    /positive analysis version/i,
  );
  assert.throws(
    () =>
      createWorkflowDraftBasis({
        analysis: { version: 1, documentId: "" },
        inputVersion: 1,
        documents: [source],
      }),
    /source identity/i,
  );
  assert.throws(
    () =>
      createWorkflowDraftBasis({
        analysis: { version: 1, documentId: "source-doc" },
        inputVersion: 0,
        documents: [source],
      }),
    /positive input version/i,
  );
});
