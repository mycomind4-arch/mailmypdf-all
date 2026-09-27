import assert from "node:assert/strict";
import test from "node:test";

import { analysisRequiredFacts, deriveMatterGuidance } from "../src/lib/mcp/matter-guidance";

const matter = {
  id: "matter-1",
  workflowId: "cp14-response",
  verticalId: "notice-respond",
  status: "intake",
};

test("matter guidance advances document-first matters one safe step at a time", () => {
  const empty = deriveMatterGuidance({
    matter,
    documents: [],
    requiresSourceDocument: true,
    analysis: null,
    hasInput: false,
    hasDraft: false,
    approvalId: null,
  });
  assert.equal(empty.nextAction.toolName, "ingest_document");

  const quarantined = deriveMatterGuidance({
    matter,
    documents: [{
      documentId: "document-1",
      role: "subject_notice",
      included: false,
      securityStatus: "quarantined",
      usable: false,
    }],
    requiresSourceDocument: true,
    analysis: null,
    hasInput: false,
    hasDraft: false,
    approvalId: null,
  });
  assert.equal(quarantined.nextAction.toolName, "get_document_status");
  assert.equal(quarantined.nextAction.arguments.document_id, "document-1");

  const clean = deriveMatterGuidance({
    matter,
    documents: [{
      documentId: "document-1",
      role: "subject_notice",
      included: false,
      securityStatus: "clean",
      usable: true,
    }],
    requiresSourceDocument: true,
    analysis: null,
    hasInput: false,
    hasDraft: false,
    approvalId: null,
  });
  assert.equal(clean.nextAction.toolName, "analyze_matter");
});

test("matter guidance exposes bounded missing facts without returning the full analysis", () => {
  const analysis = {
    result: {
      missingInformation: ["Tax year", "  Response mode  ", 42, ""],
      privateExtractedData: "not returned",
    },
  };
  assert.deepEqual(analysisRequiredFacts(analysis), ["Tax year", "Response mode"]);

  const guidance = deriveMatterGuidance({
    matter,
    documents: [],
    requiresSourceDocument: false,
    analysis,
    hasInput: false,
    hasDraft: false,
    approvalId: null,
  });
  assert.equal(guidance.nextAction.toolName, "save_matter_input");
  assert.deepEqual(guidance.requiredFacts, ["Tax year", "Response mode"]);
});

test("request-first matters skip document ingestion and analysis calls", () => {
  const guidance = deriveMatterGuidance({
    matter: { ...matter, workflowId: "public-records-request", verticalId: "records-request" },
    documents: [],
    requiresSourceDocument: false,
    analysis: null,
    hasInput: true,
    hasDraft: false,
    approvalId: null,
  });
  assert.equal(guidance.nextAction.toolName, "generate_draft");
});

test("matter guidance preserves packet approval and checkout boundaries", () => {
  const draft = deriveMatterGuidance({
    matter,
    documents: [],
    requiresSourceDocument: false,
    analysis: { result: {} },
    hasInput: true,
    hasDraft: true,
    approvalId: null,
  });
  assert.equal(draft.nextAction.toolName, "preview_packet");
  assert.equal(draft.nextAction.requiresExplicitApproval, false);

  const approved = deriveMatterGuidance({
    matter,
    documents: [],
    requiresSourceDocument: false,
    analysis: { result: {} },
    hasInput: true,
    hasDraft: true,
    approvalId: "approval-1",
  });
  assert.equal(approved.nextAction.toolName, "prepare_checkout");
  assert.equal(approved.nextAction.arguments.approval_id, "approval-1");
  assert.equal(approved.nextAction.requiresExplicitApproval, false);
});

test("submitted and abandoned matters do not restart workflow mutations", () => {
  const submitted = deriveMatterGuidance({
    matter: { ...matter, status: "submitted" },
    documents: [], requiresSourceDocument: false, analysis: null,
    hasInput: false, hasDraft: false, approvalId: null,
  });
  assert.equal(submitted.nextAction.toolName, "get_order_status");

  const abandoned = deriveMatterGuidance({
    matter: { ...matter, status: "abandoned" },
    documents: [], requiresSourceDocument: false, analysis: null,
    hasInput: false, hasDraft: false, approvalId: null,
  });
  assert.equal(abandoned.nextAction.toolName, null);
});
