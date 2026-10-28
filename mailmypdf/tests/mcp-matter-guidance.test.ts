import assert from "node:assert/strict";
import test from "node:test";

import { analysisRequiredFacts, deriveMatterGuidance, isCurrentMatterDraft } from "../src/lib/mcp/matter-guidance";
import { createWorkflowDraftBasis, type WorkflowMatterDocument } from "@mailmypdf/workflows";

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
    draftIsCurrent: false,
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
    draftIsCurrent: false,
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
    draftIsCurrent: false,
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
    draftIsCurrent: false,
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
    draftIsCurrent: false,
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
    draftIsCurrent: true,
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
    draftIsCurrent: true,
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
    hasInput: false, hasDraft: false, draftIsCurrent: false, approvalId: null,
  });
  assert.equal(submitted.nextAction.toolName, "get_order_status");

  const abandoned = deriveMatterGuidance({
    matter: { ...matter, status: "abandoned" },
    documents: [], requiresSourceDocument: false, analysis: null,
    hasInput: false, hasDraft: false, draftIsCurrent: false, approvalId: null,
  });
  assert.equal(abandoned.nextAction.toolName, null);
});

test("MCP matter guidance blocks packet and checkout suggestions when document readiness regresses", () => {
  const cleanSource = {
    documentId: "source-1",
    role: "subject_notice",
    included: false,
    securityStatus: "clean",
    usable: true,
  };
  const cases = [
    {
      label: "included evidence is quarantined even if its usable flag is stale",
      documents: [cleanSource, {
        documentId: "evidence-1",
        role: "evidence",
        included: true,
        securityStatus: "quarantined",
        usable: true,
      }],
      expectedTool: "get_document_status",
      expectedDocument: "evidence-1",
    },
    {
      label: "source notice is quarantined",
      documents: [{ ...cleanSource, securityStatus: "quarantined", usable: false }],
      expectedTool: "get_document_status",
      expectedDocument: "source-1",
    },
    {
      label: "source notice was removed",
      documents: [],
      expectedTool: "ingest_document",
      expectedDocument: null,
    },
  ] as const;

  for (const scenario of cases) {
    for (const approvalId of [null, "previous-approval"]) {
      const guidance = deriveMatterGuidance({
        matter,
        documents: [...scenario.documents],
        requiresSourceDocument: true,
        analysis: { result: {} },
        hasInput: true,
        hasDraft: true,
        draftIsCurrent: true,
        approvalId,
      });
      assert.equal(guidance.nextAction.toolName, scenario.expectedTool,
        `${scenario.label}, approval=${Boolean(approvalId)}`);
      if (scenario.expectedDocument) {
        assert.equal(guidance.nextAction.arguments.document_id, scenario.expectedDocument);
      }
      assert.equal(guidance.progress.sourceDocumentReady,
        scenario.documents.some((document) =>
          document.role === "subject_notice" && document.usable && document.securityStatus === "clean"));
    }
  }
});

test("MCP guidance never recommends checkout or packet preview from stale or missing draft prerequisites", () => {
  const readySource = {
    documentId: "source-1", role: "subject_notice", included: false,
    securityStatus: "clean", usable: true,
  };
  const scenarios = [
    {
      label: "approval persists after workflow facts disappear",
      analysis: { result: {} }, hasInput: false, hasDraft: true,
      draftIsCurrent: true, expected: "save_matter_input",
    },
    {
      label: "approval persists after draft disappears",
      analysis: { result: {} }, hasInput: true, hasDraft: false,
      draftIsCurrent: false, expected: "generate_draft",
    },
    {
      label: "approval persists after source analysis disappears",
      analysis: null, hasInput: true, hasDraft: true,
      draftIsCurrent: false, expected: "analyze_matter",
    },
    {
      label: "approval persists after saved draft basis changes",
      analysis: { result: {} }, hasInput: true, hasDraft: true,
      draftIsCurrent: false, expected: "generate_draft",
    },
  ];
  for (const scenario of scenarios) {
    const guidance = deriveMatterGuidance({
      matter,
      documents: [readySource],
      requiresSourceDocument: true,
      analysis: scenario.analysis,
      hasInput: scenario.hasInput,
      hasDraft: scenario.hasDraft,
      approvalId: "old-approval",
      draftIsCurrent: scenario.draftIsCurrent,
    });
    assert.equal(guidance.nextAction.toolName, scenario.expected, scenario.label);
    assert.equal(guidance.nextAction.arguments.approval_id, undefined, scenario.label);
  }
});

test("MCP draft freshness uses the exact runtime analysis, input and document fingerprint", () => {
  const documents: WorkflowMatterDocument[] = [{
    id: "doc-1", documentId: "source-1", role: "subject_notice",
    evidenceKind: null, included: false, position: 0, pageCount: 1,
    filename: "notice.pdf", mimeType: "application/pdf", sizeBytes: 1024,
    securityStatus: "clean", usable: true,
  }];
  const analysis = { version: 2, documentId: "source-1" };
  const storedInput = { version: 3 };
  const draft = {
    basis: createWorkflowDraftBasis({
      analysis, inputVersion: storedInput.version, documents,
    }),
  };
  const current = { storedInput, analysis, draft, documents };
  assert.equal(isCurrentMatterDraft(current), true);
  assert.equal(isCurrentMatterDraft({ ...current, storedInput: { version: 4 } }), false);
  assert.equal(isCurrentMatterDraft({ ...current, analysis: { ...analysis, version: 3 } }), false);
  assert.equal(isCurrentMatterDraft({ ...current, analysis: { ...analysis, documentId: "source-2" } }), false);
  assert.equal(isCurrentMatterDraft({ ...current, draft: { basis: undefined } }), false);
  assert.equal(isCurrentMatterDraft({ ...current, documents: [{ ...documents[0], included: true }] }), false);
  assert.equal(isCurrentMatterDraft({ ...current, analysis: null }), false);
  assert.equal(isCurrentMatterDraft({ ...current, storedInput: null }), false);
});


test("MCP guidance reanalyzes a replaced SSA denial notice before draft or checkout", () => {
  const replacement = {
    documentId: "replacement-notice", role: "subject_notice",
    included: false, securityStatus: "clean", usable: true,
  };
  for (const approvalId of [null, "old-approval"]) {
    const guidance = deriveMatterGuidance({
      matter: { ...matter, workflowId: "appeal-ssi-denial", verticalId: "appeal-mail" },
      documents: [replacement],
      requiresSourceDocument: true,
      analysis: { documentId: "original-notice", result: { decision: "denied" } },
      hasInput: true,
      hasDraft: true,
      draftIsCurrent: false,
      approvalId,
    });
    assert.equal(guidance.nextAction.toolName, "analyze_matter",
      "replacing a denial notice invalidates the previous analysis before any new draft");
    assert.equal(guidance.nextAction.arguments.approval_id, undefined);
  }
});
