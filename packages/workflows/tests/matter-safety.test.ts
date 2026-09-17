import assert from "node:assert/strict";
import test from "node:test";
import { attachMatterDocument, setMatterDocumentIncluded } from "../src/matter-document-policy.js";
import { assertStoredAnalysisReadyForDraft } from "../src/runtime-safety.js";
import type { WorkflowMatterDocument } from "../src/matter-runtime-client.js";

function described() {
  return {
    pageCount: 1,
    filename: "document.pdf",
    mimeType: "application/pdf",
    sizeBytes: 100,
    securityStatus: "clean",
    usable: true,
  };
}

function source(documentId = "source-1"): WorkflowMatterDocument {
  return {
    id: `attachment-${documentId}`,
    documentId,
    role: "subject_notice",
    evidenceKind: null,
    pageCount: 1,
    included: false,
    position: 0,
    filename: "notice.pdf",
    mimeType: "application/pdf",
    sizeBytes: 100,
    securityStatus: "clean",
    usable: true,
  };
}

test("supporting evidence requires an evidence kind", () => {
  assert.throws(() => attachMatterDocument([], described(), {
    documentId: "evidence-1",
    role: "evidence",
  }, "attachment-1"), /must declare what kind/i);
});

test("source notice cannot be toggled into the outgoing evidence packet", () => {
  assert.throws(() => setMatterDocumentIncluded([source()], "source-1", true), /not automatically mailed/i);
});

test("drafting stops when the analyzed source was replaced", () => {
  assert.throws(() => assertStoredAnalysisReadyForDraft({
    documentId: "source-old",
    result: { promptInjectionObserved: false },
  }, [source("source-new")]), /source document changed/i);
});

test("drafting stops when analysis observed embedded instructions", () => {
  assert.throws(() => assertStoredAnalysisReadyForDraft({
    documentId: "source-1",
    result: { promptInjectionObserved: true },
  }, [source()]), /embedded instructions/i);
});
