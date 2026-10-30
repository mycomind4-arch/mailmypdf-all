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
      analysis: { documentId: "source-1", result: {} }, hasInput: false, hasDraft: true,
      draftIsCurrent: true, expected: "save_matter_input",
    },
    {
      label: "approval persists after draft disappears",
      analysis: { documentId: "source-1", result: {} }, hasInput: true, hasDraft: false,
      draftIsCurrent: false, expected: "generate_draft",
    },
    {
      label: "approval persists after source analysis disappears",
      analysis: null, hasInput: true, hasDraft: true,
      draftIsCurrent: false, expected: "analyze_matter",
    },
    {
      label: "approval persists after saved draft basis changes",
      analysis: { documentId: "source-1", result: {} }, hasInput: true, hasDraft: true,
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


test("MCP guidance requires reanalysis when a required source has malformed historical analysis identity", () => {
  const source = {
    documentId: "current-ssa-notice", role: "subject_notice",
    included: false, securityStatus: "clean", usable: true,
  };
  for (const workflowId of ["appeal-ssdi-denial", "appeal-ssi-denial"]) {
    for (const invalidDocumentId of [undefined, null, 42, "old-ssa-notice"]) {
      const guidance = deriveMatterGuidance({
        matter: { ...matter, workflowId, verticalId: "appeal-mail" },
        documents: [source], requiresSourceDocument: true,
        analysis: { documentId: invalidDocumentId, result: { decision: "denied" } },
        hasInput: true, hasDraft: true, draftIsCurrent: true,
        approvalId: "historical-approval",
      });
      assert.equal(guidance.nextAction.toolName, "analyze_matter",
        `${workflowId}: invalid source analysis id ${String(invalidDocumentId)} must not advance toward checkout`);
      assert.equal(guidance.nextAction.arguments.approval_id, undefined);
    }
  }
});



test("MCP guidance refuses to advance SSDI/SSI matters with ambiguous duplicate denial notices", () => {
  const firstNotice = {
    documentId: "analyzed-notice", role: "subject_notice",
    included: false, securityStatus: "clean", usable: true,
  };
  const secondNotice = {
    ...firstNotice, documentId: "another-denial-notice",
  };
  const completedForm = {
    documentId: "ssa-561", role: "evidence", evidenceKind: "ssa_561",
    mimeType: "application/pdf", included: true, securityStatus: "clean", usable: true,
  };
  for (const workflowId of ["appeal-ssdi-denial", "appeal-ssi-denial"]) {
    for (const approvalId of [null, "historical-approval"]) {
      const state = {
        matter: { ...matter, workflowId, verticalId: "appeal-mail" },
        documents: [firstNotice, completedForm],
        requiresSourceDocument: true,
        analysis: { documentId: "analyzed-notice", result: {
          issuer: "Social Security Administration",
          decision: "denied",
          workflowDetails: { appealStage: "reconsideration", decisionBasis: "nonmedical" },
        } },
        hasInput: true,
        hasDraft: true,
        draftIsCurrent: true,
        approvalId,
      };
      const singleSource = deriveMatterGuidance(state);
      assert.equal(singleSource.nextAction.toolName,
        approvalId ? "prepare_checkout" : "preview_packet",
        `${workflowId}: a single clean matching source remains eligible for review`);

      const duplicateSource = deriveMatterGuidance({
        ...state, documents: [firstNotice, secondNotice, completedForm],
      });
      assert.equal(duplicateSource.nextAction.toolName, null,
        `${workflowId}: duplicate denial notices must not suggest packet preview or checkout`);
      assert.match(duplicateSource.nextAction.reason, /multiple.*denial notices|multiple.*source notices/i);
      assert.equal(duplicateSource.nextAction.arguments.approval_id, undefined);
    }
  }
});

test("request-first guidance waits for an optional source notice to clear scanning before checkout", () => {
  const optionalSource = {
    documentId: "optional-source-1", role: "subject_notice",
    included: false, usable: false, securityStatus: "quarantined",
  };
  for (const approvalId of [null, "old-approval"]) {
    const input = {
      matter: { ...matter, workflowId: "public-records-request", verticalId: "records-request" },
      documents: [optionalSource],
      requiresSourceDocument: false,
      analysis: { result: {} },
      hasInput: true, hasDraft: true, draftIsCurrent: true, approvalId,
    };
    const pending = deriveMatterGuidance(input);
    assert.equal(pending.progress.sourceDocumentRequired, false);
    assert.equal(pending.progress.sourceDocumentPresent, true);
    assert.equal(pending.progress.sourceDocumentReady, false);
    assert.equal(pending.nextAction.toolName, "get_document_status");
    assert.equal(pending.nextAction.arguments.document_id, "optional-source-1");

    const ready = deriveMatterGuidance({
      ...input,
      documents: [{ ...optionalSource, usable: true, securityStatus: "clean" }],
    });
    assert.equal(ready.progress.sourceDocumentReady, true);
    assert.equal(ready.nextAction.toolName, approvalId ? "prepare_checkout" : "preview_packet");
  }

  const noSource = deriveMatterGuidance({
    matter: { ...matter, workflowId: "public-records-request", verticalId: "records-request" },
    documents: [], requiresSourceDocument: false, analysis: null,
    hasInput: true, hasDraft: false, draftIsCurrent: false, approvalId: null,
  });
  assert.equal(noSource.progress.sourceDocumentReady, true);
  assert.equal(noSource.nextAction.toolName, "generate_draft");
});


test("SSA MCP guidance requires exactly one included valid official form before packet preview or checkout", () => {
  const source = {
    documentId: "ssa-denial", role: "subject_notice", included: false,
    securityStatus: "clean", usable: true,
  };
  const officialForm = (kind: string, documentId = kind) => ({
    documentId, role: "evidence", evidenceKind: kind, mimeType: "application/pdf",
    included: true, securityStatus: "clean", usable: true,
  });
  for (const workflowId of ["appeal-ssdi-denial", "appeal-ssi-denial"]) {
    for (const approvalId of [null, "historical-approval"]) {
      const state = (documents: Array<typeof source | ReturnType<typeof officialForm>>, basis: string) =>
        deriveMatterGuidance({
          matter: { ...matter, workflowId, verticalId: "appeal-mail" },
          documents,
          requiresSourceDocument: true,
          analysis: {
            documentId: "ssa-denial",
            result: {
              issuer: "Social Security Administration",
              decision: "denied",
              workflowDetails: { appealStage: "reconsideration", decisionBasis: basis },
            },
          },
          hasInput: true, hasDraft: true, draftIsCurrent: true, approvalId,
        });

      const missingMedical = state([source, officialForm("ssa_561")], "medical");
      assert.equal(missingMedical.nextAction.toolName, "ingest_document", workflowId);
      assert.equal(missingMedical.nextAction.arguments.evidence_kind, "ssa_3441", workflowId);
      assert.equal(missingMedical.nextAction.arguments.approval_id, undefined);

      const duplicate = state([
        source, officialForm("ssa_561"), officialForm("ssa_561", "second-ssa-561"),
      ], "nonmedical");
      assert.equal(duplicate.nextAction.toolName, null, workflowId);
      assert.match(duplicate.nextAction.reason, /duplicate|exactly one/i);

      const reusedMedicalPdf = state([
        source,
        officialForm("ssa_561", "one-uploaded-pdf"),
        officialForm("ssa_3441", "one-uploaded-pdf"),
        officialForm("ssa_827"),
      ], "medical");
      assert.equal(reusedMedicalPdf.nextAction.toolName, null, workflowId);
      assert.match(reusedMedicalPdf.nextAction.reason, /same uploaded PDF|distinct completed PDFs/i);
      assert.equal(reusedMedicalPdf.nextAction.arguments.approval_id, undefined);

      const invalidPdf = state([
        source, { ...officialForm("ssa_561"), mimeType: "image/jpeg" },
      ], "nonmedical");
      assert.notEqual(invalidPdf.nextAction.toolName, "preview_packet");
      assert.notEqual(invalidPdf.nextAction.toolName, "prepare_checkout");

      const valid = state([
        source, officialForm("ssa_561"),
        { ...officialForm("ssa_561", "excluded-old-561"), included: false },
      ], "nonmedical");
      assert.equal(valid.nextAction.toolName,
        approvalId ? "prepare_checkout" : "preview_packet", workflowId);
    }
  }
});


test("MCP SSA guidance fails closed when the analyzed notice is not a confirmed reconsideration denial", () => {
  const source = {
    documentId: "ssa-notice", role: "subject_notice", included: false,
    securityStatus: "clean", usable: true,
  };
  const form = {
    documentId: "ssa-561", role: "evidence", evidenceKind: "ssa_561",
    mimeType: "application/pdf", included: true, securityStatus: "clean", usable: true,
  };
  const confirmed = {
    documentId: "ssa-notice",
    result: {
      issuer: "Social Security Administration",
      decision: "Denied",
      workflowDetails: { appealStage: "reconsideration", decisionBasis: "nonmedical" },
    },
  };
  const invalid = [
    { label: "unrelated issuer", result: { ...confirmed.result, issuer: "Private Insurance Company" } },
    { label: "unidentified issuer", result: { ...confirmed.result, issuer: null } },
    { label: "approval notice", result: { ...confirmed.result, decision: "approved" } },
    { label: "unconfirmed decision", result: { ...confirmed.result, decision: null } },
    { label: "hearing appeal", result: {
      ...confirmed.result, workflowDetails: { appealStage: "hearing", decisionBasis: "nonmedical" },
    } },
    { label: "unknown basis", result: {
      ...confirmed.result, workflowDetails: { appealStage: "reconsideration", decisionBasis: "unknown" },
    } },
    { label: "missing analysis result", result: undefined },
  ];
  for (const workflowId of ["appeal-ssdi-denial", "appeal-ssi-denial"]) {
    for (const approvalId of [null, "old-approval"]) {
      const base = {
        matter: { ...matter, workflowId, verticalId: "appeal-mail" },
        documents: [source, form],
        requiresSourceDocument: true,
        hasInput: true, hasDraft: true, draftIsCurrent: true, approvalId,
      };
      const ready = deriveMatterGuidance({ ...base, analysis: confirmed });
      assert.equal(ready.nextAction.toolName,
        approvalId ? "prepare_checkout" : "preview_packet", workflowId);
      for (const scenario of invalid) {
        const blocked = deriveMatterGuidance({
          ...base, analysis: { ...confirmed, result: scenario.result },
        });
        assert.equal(blocked.nextAction.toolName, null,
          `${workflowId}: ${scenario.label} must not recommend preview or checkout`);
        assert.match(blocked.nextAction.reason, /denial.*reconsideration/i);
        assert.equal(blocked.nextAction.arguments.approval_id, undefined);
        const beforeIntake = deriveMatterGuidance({
          ...base, hasInput: false, hasDraft: false, draftIsCurrent: false,
          analysis: { ...confirmed, result: scenario.result },
        });
        assert.equal(beforeIntake.nextAction.toolName, null,
          `${workflowId}: ${scenario.label} must not recommend saving claimant facts`);
      }
    }
  }
});

test("SSA MCP guidance does not recommend packet preview or checkout with unsupported included evidence", () => {
  const source = {
    documentId: "denial-notice", role: "subject_notice", included: false,
    securityStatus: "clean", usable: true,
  };
  const form = {
    documentId: "completed-561", role: "evidence", evidenceKind: "ssa_561",
    mimeType: "application/pdf", included: true, securityStatus: "clean", usable: true,
  };
  const supplemental = {
    documentId: "supporting-file", role: "evidence", evidenceKind: "other",
    mimeType: "application/zip", included: true, securityStatus: "clean", usable: true,
  };
  for (const workflowId of ["appeal-ssdi-denial", "appeal-ssi-denial"]) {
    for (const approvalId of [null, "historical-approval"]) {
      const input = {
        matter: { ...matter, workflowId, verticalId: "appeal-mail" },
        documents: [source, form, supplemental],
        requiresSourceDocument: true,
        analysis: {
          documentId: "denial-notice",
          result: {
            issuer: "Social Security Administration", decision: "denied",
            workflowDetails: { appealStage: "reconsideration", decisionBasis: "nonmedical" },
          },
        },
        hasInput: true, hasDraft: true, draftIsCurrent: true, approvalId,
      };
      const blocked = deriveMatterGuidance(input);
      assert.equal(blocked.nextAction.toolName, null,
        `${workflowId}: unsupported ZIP must not advance toward packet preview or payment`);
      assert.match(blocked.nextAction.reason, /unsupported|supported PDF or image/i);
      assert.equal(blocked.nextAction.arguments.approval_id, undefined);

      const excluded = deriveMatterGuidance({
        ...input, documents: [source, form, { ...supplemental, included: false }],
      });
      assert.equal(excluded.nextAction.toolName,
        approvalId ? "prepare_checkout" : "preview_packet",
        `${workflowId}: excluded historical evidence must not block mailing`);

      const supported = deriveMatterGuidance({
        ...input, documents: [source, form, { ...supplemental, mimeType: "image/png" }],
      });
      assert.equal(supported.nextAction.toolName,
        approvalId ? "prepare_checkout" : "preview_packet",
        `${workflowId}: included supported images remain eligible`);
    }
  }
});


test("SSA MCP guidance blocks unsupported source notice formats before preview or checkout", () => {
  const source = {
    documentId: "denial-notice", role: "subject_notice", included: false,
    mimeType: "application/zip", securityStatus: "clean", usable: true,
  };
  const form = {
    documentId: "completed-561", role: "evidence", evidenceKind: "ssa_561",
    mimeType: "application/pdf", included: true, securityStatus: "clean", usable: true,
  };
  for (const workflowId of ["appeal-ssdi-denial", "appeal-ssi-denial"]) {
    for (const approvalId of [null, "historical-approval"]) {
      const input = {
        matter: { ...matter, workflowId, verticalId: "appeal-mail" },
        documents: [source, form],
        requiresSourceDocument: true,
        analysis: {
          documentId: "denial-notice",
          result: {
            issuer: "Social Security Administration", decision: "denied",
            workflowDetails: { appealStage: "reconsideration", decisionBasis: "nonmedical" },
          },
        },
        hasInput: true, hasDraft: true, draftIsCurrent: true, approvalId,
      };
      const blocked = deriveMatterGuidance(input);
      assert.equal(blocked.nextAction.toolName, null,
        `${workflowId}: clean ZIP source cannot authorize packet preview or checkout`);
      assert.match(blocked.nextAction.reason, /source|evidence|supported PDF or image/i);
      assert.equal(blocked.nextAction.arguments.approval_id, undefined);

      const supported = deriveMatterGuidance({
        ...input, documents: [{ ...source, mimeType: "image/png" }, form],
      });
      assert.equal(supported.nextAction.toolName,
        approvalId ? "prepare_checkout" : "preview_packet",
        `${workflowId}: a clean manifest-supported source remains eligible`);
    }
  }
});
