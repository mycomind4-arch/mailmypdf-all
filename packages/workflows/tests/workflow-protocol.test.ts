import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveWorkflowProtocolState,
  generatedDraftReviewAction,
  workflowProtocolDefinitionFromManifest,
  WORKFLOW_PROTOCOL_VERSION,
} from "../src/workflow-protocol.js";
import { createNoticeResponseManifest } from "../src/domain-packs/notice-response/manifest.js";
import { cp14NoticeResponseProfile } from "../src/domain-packs/notice-response/profiles.js";
import { createNoticeResponseRuntimePolicy } from "../src/domain-packs/notice-response/runtime-policy.js";
import { createRecordsRequestManifest } from "../src/domain-packs/records-request/manifest.js";
import { createRecordsRequestRuntimePolicy } from "../src/domain-packs/records-request/runtime-policy.js";
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

const noticePolicy = createNoticeResponseRuntimePolicy("cp14-response");
const definition = workflowProtocolDefinitionFromManifest(
  createNoticeResponseManifest({ profile: cp14NoticeResponseProfile }),
  noticePolicy.chatContract,
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
    draftIsCurrent: true,
    approvalPresent: true,
    orderPresent: false,
    ...overrides,
  });
}

test("workflow protocol is derived from the canonical CP14 manifest", () => {
  assert.equal(definition.workflowId, "cp14-response");
  assert.equal(definition.primaryDocument?.label, "IRS CP14 notice");
  assert.equal(definition.analysisRequired, true);
  assert.equal(definition.inputRequired, true);
  assert.ok(definition.inputFields.some((field) => field.id === "responseMode"));
  assert.equal(definition.inputFields.some((field) => field.id === "recipientAddress"), false);
  assert.equal(definition.packetRecipientField?.id, "recipientAddress");
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

test("workflow protocol blocks checkout guidance for unsafe included supporting evidence", () => {
  // The source notice is clean, but an included supporting document can be
  // quarantined after a draft and approval were saved.
  const unsafeSupport: WorkflowMatterDocument = {
    ...cleanSource,
    id: "matter-document-support",
    documentId: "support-1",
    role: "evidence",
    included: true,
    position: 1,
    securityStatus: "quarantined",
    usable: true, // A stale flag must not override the security scan.
  };
  const blocked = state({ documents: [cleanSource, unsafeSupport] });
  assert.equal(blocked.nextActions[0]?.toolName, "get_document_status");
  assert.equal(blocked.nextActions[0]?.arguments.document_id, "support-1");
  assert.ok(blocked.blockers.some((reason) => /security|scan|document/i.test(reason)));
  assert.ok(!blocked.nextActions.some((step) => step.toolName === "prepare_checkout"));

  // Excluded evidence is not part of the packet, and an existing order is
  // always tracked rather than restarting pre-checkout security guidance.
  assert.equal(
    state({ documents: [cleanSource, { ...unsafeSupport, included: false }] })
      .nextActions[0]?.toolName,
    "prepare_checkout",
  );
  assert.equal(
    state({ documents: [cleanSource, unsafeSupport], orderPresent: true })
      .nextActions[0]?.toolName,
    "get_order_status",
  );
});

test("workflow protocol advances through analysis, facts, drafting, approval, and tracking", () => {
  assert.equal(state({ analysisPresent: false }).nextActions[0]?.toolName, "analyze_matter");

  const facts = state({ inputPresent: false });
  assert.equal(facts.nextActions[0]?.toolName, "save_matter_input");
  assert.ok((facts.nextActions[0]?.fields?.length ?? 0) > 0);

  assert.equal(state({ draftPresent: false }).nextActions[0]?.toolName, "generate_draft");
  assert.equal(state({ approvalPresent: false }).nextActions[0]?.toolName, "preview_packet");
  assert.equal(state({ orderPresent: false }).nextActions[0]?.toolName, "prepare_checkout");
  assert.equal(state({ orderPresent: true }).nextActions[0]?.toolName, "get_order_status");
});

test("stale draft basis never advertises packet preview or checkout", () => {
  // A historical approval can remain persisted after the input or analysis
  // changes. A stale draft must not authorize the next consequential step.
  const stale = { draftIsCurrent: false, orderPresent: false } as
    Partial<Parameters<typeof deriveWorkflowProtocolState>[0]>;
  for (const approvalPresent of [false, true]) {
    const result = state({ ...stale, approvalPresent });
    assert.equal(result.progress.draftReady, false);
    assert.equal(result.progress.approvalReady, false);
    assert.equal(result.nextActions[0]?.toolName, "generate_draft");
    assert.ok(!result.nextActions.some((action) =>
      action.toolName === "preview_packet" || action.toolName === "prepare_checkout"));
  }
  assert.equal(
    state({ ...stale, inputPresent: false }).nextActions[0]?.toolName,
    "save_matter_input",
  );
});

test("submitted and ordered matters preserve tracking despite stale draft prerequisites", () => {
  // A historical order must remain trackable even when its original source,
  // analysis, input, draft or approval can no longer be reconstructed.
  for (const status of ["active", "submitted"]) {
    const result = state({
      matter: { ...matter, status },
      documents: [],
      analysisPresent: false,
      inputPresent: false,
      draftPresent: false,
      draftIsCurrent: false,
      approvalPresent: false,
      orderPresent: true,
    });
    assert.equal(result.progress.orderReady, true, status);
    assert.equal(result.nextActions[0]?.toolName, "get_order_status", status);
    assert.equal(result.nextActions[0]?.kind, "tracking", status);
    assert.equal(result.nextActions.length, 1, status);
  }

  // A submitted record with no accessible order must not restart intake or
  // recommend another checkout. Surface the inconsistent state for review.
  const missingOrder = state({
    matter: { ...matter, status: "submitted" },
    documents: [],
    analysisPresent: false,
    inputPresent: false,
    draftPresent: false,
    draftIsCurrent: false,
    approvalPresent: false,
    orderPresent: false,
  });
  assert.deepEqual(missingOrder.nextActions, []);
  assert.match(missingOrder.blockers.join(" "), /order/i);
});

test("abandoned matters never recommend MCP workflow mutations", () => {
  for (const overrides of [
    {
      documents: [],
      analysisPresent: false,
      inputPresent: false,
      draftPresent: false,
      approvalPresent: false,
      orderPresent: false,
    },
    {
      documents: [cleanSource],
      analysisPresent: true,
      inputPresent: true,
      draftPresent: true,
      approvalPresent: true,
      orderPresent: false,
    },
  ]) {
    const result = state({ ...overrides, matter: { ...matter, status: "abandoned" } });
    assert.equal(result.matterStatus, "abandoned");
    assert.deepEqual(result.nextActions, [], "abandoned matters must not offer uploads, drafts, checkout or mailing");
    assert.match(result.blockers.join(" "), /abandoned/i);
  }
});

test("generated draft requires user review before saving and does not carry unreviewed text", () => {
  const next = generatedDraftReviewAction(matter.id);
  assert.equal(next.toolName, "save_draft");
  assert.equal(next.kind, "draft_review");
  assert.equal(next.requiresUserInput, true);
  assert.deepEqual(next.arguments, { matter_id: matter.id });
  assert.match(next.prompt, /confirm the exact final text/);
});


test("fact-first workflows collect input before generating a draft", () => {
  const recordsDefinition = workflowProtocolDefinitionFromManifest(
    createRecordsRequestManifest({
      workflowId: "public-records-request",
      title: "Public Records Request",
    }).manifest,
    createRecordsRequestRuntimePolicy("public-records-request").chatContract,
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
    draftIsCurrent: false,
    approvalPresent: false,
    orderPresent: false,
  });

  assert.equal(result.progress.analysisReady, true);
  assert.equal(result.nextActions[0]?.toolName, "save_matter_input");
});


test("packet preview exposes only the certified recipient field", () => {
  const result = state({ approvalPresent: false });
  const preview = result.nextActions[0];
  assert.equal(preview?.toolName, "preview_packet");
  assert.deepEqual(preview?.fields?.map((field) => field.id), ["recipientAddress"]);
});
