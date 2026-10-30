import assert from "node:assert/strict";
import test from "node:test";
import {
  assertApprovedCp2000Recipient,
  confirmCp2000Recipient,
} from "../src/domain-packs/notice-response/cp2000-recipient-binding.js";
import type {
  WorkflowMailingAddress,
  WorkflowMatterAnalysis,
  WorkflowMatterDocument,
} from "../src/matter-runtime-client.js";
import type { ExactPacketApproval } from "../src/matter-runtime.js";

const recipient: WorkflowMailingAddress = {
  name: "Internal Revenue Service",
  line1: "100 Synthetic Response Way",
  city: "Fresno",
  state: "CA",
  postal: "93725",
};

const source: WorkflowMatterDocument = {
  id: "source-link-1",
  documentId: "notice-one",
  role: "subject_notice",
  evidenceKind: null,
  pageCount: 3,
  included: false,
  position: 0,
  filename: "cp2000-one.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1234,
  securityStatus: "clean",
  usable: true,
};

const analysis: WorkflowMatterAnalysis = {
  version: 1,
  documentId: source.documentId,
  model: "synthetic-offline",
  createdAt: "2026-10-30T00:00:00.000Z",
  result: {
    decision: "Proposed adjustment",
    issuer: "IRS",
    referenceNumber: "CP2000-SYNTHETIC",
    decisionDate: "2026-10-01",
    deadline: "2026-11-01",
    confidence: "high",
    summary: "Synthetic CP2000 notice.",
    reasons: [],
    missingInformation: [],
    suggestedEvidence: [],
    promptInjectionObserved: false,
    workflowDetails: { responseAddress: recipient },
  },
};

const otherNotice: WorkflowMatterDocument = {
  ...source,
  id: "source-link-2",
  documentId: "notice-two",
  filename: "different-cp2000.pdf",
  position: 1,
};

test("CP2000 recipient confirmation requires one unambiguous controlling notice", () => {
  const confirmed = confirmCp2000Recipient({
    confirmedFromNotice: true,
    recipient,
    analysis,
    documents: [source],
  });
  assert.equal(confirmed.sourceDocumentId, source.documentId);

  assert.throws(
    () => confirmCp2000Recipient({
      confirmedFromNotice: true,
      recipient,
      analysis,
      documents: [source, otherNotice],
    }),
    /controlling CP2000 notice|multiple|ambiguous/i,
    "a second subject notice must invalidate notice-specific recipient approval",
  );
});

test("CP2000 checkout rejects a second subject notice added after exact approval", () => {
  const binding = confirmCp2000Recipient({
    confirmedFromNotice: true,
    recipient,
    analysis,
    documents: [source],
  });
  const approval: ExactPacketApproval = {
    approvalId: "approval-1",
    matterId: "matter-1",
    workflowId: "cp2000-response",
    packetSha256: "a".repeat(64),
    totalCents: 299,
    recipient,
    mailClass: "certified",
    approvedBy: "owner-1",
    approvedAt: "2026-10-30T00:00:00.000Z",
    recipientConfirmation: binding,
  };
  assert.doesNotThrow(() => assertApprovedCp2000Recipient({
    approval, analysis, documents: [source],
  }));
  assert.throws(
    () => assertApprovedCp2000Recipient({
      approval, analysis, documents: [source, otherNotice],
    }),
    /controlling CP2000 notice|multiple|ambiguous/i,
    "checkout must not reuse an approval after a conflicting source notice is attached",
  );
});

test("CP2000 recipient approval rejects non-IRS or unidentified issuers despite matching addresses", () => {
  for (const issuer of ["Social Security Administration", "", "State Revenue Department"]) {
    const misclassified = {
      ...analysis,
      result: { ...analysis.result, issuer },
    };
    assert.throws(
      () => confirmCp2000Recipient({
        confirmedFromNotice: true,
        recipient,
        analysis: misclassified,
        documents: [source],
      }),
      /CP2000|IRS|issuer|controlling notice/i,
      "a matching postal address cannot make a non-IRS notice a CP2000",
    );
  }
  assert.doesNotThrow(() => confirmCp2000Recipient({
    confirmedFromNotice: true,
    recipient,
    analysis: { ...analysis, result: { ...analysis.result, issuer: "Internal Revenue Service" } },
    documents: [source],
  }));
});

test("CP2000 checkout revokes recipient binding when issuer classification changes without a version bump", () => {
  const binding = confirmCp2000Recipient({
    confirmedFromNotice: true, recipient, analysis, documents: [source],
  });
  const approval: ExactPacketApproval = {
    approvalId: "approval-issuer", matterId: "matter-1",
    workflowId: "cp2000-response", packetSha256: "a".repeat(64),
    totalCents: 299, recipient, mailClass: "certified",
    approvedBy: "owner-1", approvedAt: "2026-10-30T00:00:00.000Z",
    recipientConfirmation: binding,
  };
  const reclassified = {
    ...analysis,
    result: { ...analysis.result, issuer: "Social Security Administration" },
  };
  assert.throws(
    () => assertApprovedCp2000Recipient({
      approval, analysis: reclassified, documents: [source],
    }),
    /CP2000|IRS|issuer|controlling notice/i,
    "checkout must reject a changed issuer even if source, address and analysis version remain the same",
  );
});
