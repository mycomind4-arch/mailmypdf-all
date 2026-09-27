import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveWorkflowProtocolState,
  workflowProtocolDefinitionFromManifest,
  WORKFLOW_PROTOCOL_VERSION,
} from "../src/workflow-protocol.js";
import { createNoticeResponseManifest } from "../src/domain-packs/notice-response/manifest.js";
import { cp14NoticeResponseProfile } from "../src/domain-packs/notice-response/profiles.js";
import { createRecordsRequestManifest } from "../src/domain-packs/records-request/manifest.js";
import type {
  WorkflowMatterDocument,
  WorkflowMatterRecord,
} from "../src/matter-runtime-client.js";

const matter: WorkflowMatterRecord = {
  id: "matter-1",
  workflowId: "cp14-response",
  verticalId: "notice-respond",
  status: "active",
  createdAt: "2026-09-27T00:00:00.000Z",
  updatedAt: "2026-09-27T00:00:00.000Z",
};

const cleanSource: WorkflowMatterDocument = {
  id: "matter-document-1",
  documentId: "document-1",
  role: "subject_notice",
  evidenceKind: null,
  pageCount: 2,
  included: true,
  position: 0,
  filename: "cp14.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1200,
  securityStatus: "clean",
  usable: true,
};

const definition = workflowProtocolDefinitionFromManifest(
  createNoticeResponseManifest({ profile: cp14NoticeResponseProfile }),
);

function state(
  overrides: Partial<Parameters<typeof deriveWorkflowProtocolState>[0]> = {},
) {
  return deriveWorkflowProtocolState({
    matter,
    documents: [cleanSource],
    definition,
    analysisPresent: true,
    inputPresent: true,
    draftPresent: true,
    approvalPresent: true,
    orderPresent: true,
    ...overrides,
  });
}

test("workflow protocol is derived from the canonical CP14 manifest", () => {
  assert.equal(definition.workflowId, "cp14-response");
  assert.equal(definition.primaryDocument?.label, "IRS CP14 notice");
  assert.equal(definition.analysisRequired, true);
  assert.equal(definition.inputRequired, true);
  assert.ok(definition.inputFields.some((field) => field.id === "responseMode"));
  assert.ok(definition.inputFields.some((field) => field.id === "recipientAddress"));
});

test("workflow protocol asks for the primary document first", () => {
  const result = state({
    documents: [],
    analysisPresent: false,
    inputPresent: false,
    draftPresent: false,
    approvalPresent: false,
    orderPresent: false,
  });
  assert.equal(result.schemaVersion, WORKFLOW_PROTOCOL_VERSION);
  assert.equal(result.nextActions[0]?.toolName, "ingest_document");
  assert.equal(result.nextActions[0]?.requiresExplicitConsent, true);
});

test("workflow protocol blocks analysis until the source document is clean", () => {
  const result = state({
    documents: [{ ...cleanSource, securityStatus: "quarantined", usable: false }],
    analysisPresent: false,
    inputPresent: false,
    draftPresent: false,
    approvalPresent: false,
    orderPresent: false,
  });
  assert.equal(result.nextActions[0]?.toolName, "get_document_status");
  assert.equal(result.blockers.length, 1);
});

test("workflow protocol advances through analysis, facts, drafting, approval, and tracking", () => {
  assert.equal(state({ analysisPresent: false }).nextActions[0]?.toolName, "analyze_matter");

  const facts = state({ inputPresent: false });
  assert.equal(facts.nextActions[0]?.toolName, "save_matter_input");
  assert.ok((facts.nextActions[0]?.fields?.length ?? 0) > 0);

  assert.equal(state({ draftPresent: false }).nextActions[0]?.toolName, "generate_draft");
  assert.equal(state({ approvalPresent: false }).nextActions[0]?.toolName, "preview_packet");
  assert.equal(state({ orderPresent: false }).nextActions[0]?.toolName, "prepare_checkout");
  assert.equal(state().nextActions[0]?.toolName, "get_order_status");
});


test("fact-first workflows collect input before generating a draft", () => {
  const recordsDefinition = workflowProtocolDefinitionFromManifest(
    createRecordsRequestManifest({
      workflowId: "public-records-request",
      title: "Public Records Request",
    }).manifest,
  );

  assert.equal(recordsDefinition.analysisRequired, false);
  assert.equal(recordsDefinition.primaryDocument?.required ?? false, false);

  const result = deriveWorkflowProtocolState({
    matter: {
      ...matter,
      workflowId: "public-records-request",
      verticalId: "records-request",
    },
    documents: [],
    definition: recordsDefinition,
    analysisPresent: false,
    inputPresent: false,
    draftPresent: false,
    approvalPresent: false,
    orderPresent: false,
  });

  assert.equal(result.progress.analysisReady, true);
  assert.equal(result.nextActions[0]?.toolName, "save_matter_input");
});
