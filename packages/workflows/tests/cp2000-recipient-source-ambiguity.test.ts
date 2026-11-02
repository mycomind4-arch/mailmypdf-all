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
  sha256: "a".repeat(64),
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

test("CP2000 checkout revokes recipient confirmation when transcribed notice dates change without an analysis version bump", () => {
  const binding = confirmCp2000Recipient({
    confirmedFromNotice: true, recipient, analysis, documents: [source],
  });
  const approval: ExactPacketApproval = {
    approvalId: "approval-date-drift", matterId: "matter-1",
    workflowId: "cp2000-response", packetSha256: "a".repeat(64),
    totalCents: 299, recipient, mailClass: "certified",
    approvedBy: "owner-1", approvedAt: "2026-10-30T00:00:00.000Z",
    recipientConfirmation: binding,
  };
  assert.doesNotThrow(() => assertApprovedCp2000Recipient({
    approval, analysis, documents: [source],
  }));
  for (const changed of [
    { deadline: "2026-11-15" },
    { decisionDate: "2026-10-15" },
  ]) {
    const staleAnalysis: WorkflowMatterAnalysis = {
      ...analysis,
      result: { ...analysis.result, ...changed },
    };
    assert.equal(staleAnalysis.version, analysis.version, "simulate same-version imported/replaced analysis");
    assert.throws(
      () => assertApprovedCp2000Recipient({
        approval, analysis: staleAnalysis, documents: [source],
      }),
      /CP2000_RECIPIENT_CONFIRMATION_STALE|changed after approval/i,
      "a changed notice date/deadline must require fresh review even when the source ID and response address match",
    );
  }
});

test("CP2000 checkout rejects same-version changed notice decision and adjustment facts", () => {
  const binding = confirmCp2000Recipient({
    confirmedFromNotice: true, recipient, analysis, documents: [source],
  });
  const approval: ExactPacketApproval = {
    approvalId: "approval-substantive-facts-drift",
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

  for (const changedResult of [
    { decision: "Different proposed adjustment" },
    { workflowDetails: { ...analysis.result.workflowDetails, proposedTax: 25000 } },
  ]) {
    const correctedAnalysis: WorkflowMatterAnalysis = {
      ...analysis,
      result: { ...analysis.result, ...changedResult },
    };
    assert.equal(correctedAnalysis.version, analysis.version);
    assert.throws(
      () => assertApprovedCp2000Recipient({
        approval, analysis: correctedAnalysis, documents: [source],
      }),
      /changed after approval|CP2000_RECIPIENT_CONFIRMATION_STALE/i,
      "material notice facts must not change behind an already approved physical-mail packet",
    );
  }
});

test("CP2000 checkout rejects a changed notice reference on the same analysis version", () => {
  const binding = confirmCp2000Recipient({
    confirmedFromNotice: true, recipient, analysis, documents: [source],
  });
  const approval: ExactPacketApproval = {
    approvalId: "approval-reference-drift", matterId: "matter-1",
    workflowId: "cp2000-response", packetSha256: "a".repeat(64),
    totalCents: 299, recipient, mailClass: "certified",
    approvedBy: "owner-1", approvedAt: "2026-10-30T00:00:00.000Z",
    recipientConfirmation: binding,
  };
  assert.doesNotThrow(() => assertApprovedCp2000Recipient({
    approval, analysis, documents: [source],
  }));

  const correctedAnalysis: WorkflowMatterAnalysis = {
    ...analysis,
    result: { ...analysis.result, referenceNumber: "CP2000-REVISED-SYNTHETIC" },
  };
  assert.equal(correctedAnalysis.version, analysis.version);
  assert.throws(
    () => assertApprovedCp2000Recipient({
      approval, analysis: correctedAnalysis, documents: [source],
    }),
    /CP2000_RECIPIENT_CONFIRMATION_STALE|changed after approval/i,
    "a different controlling notice reference requires fresh review even if source ID, address, and version are unchanged",
  );
});

test("CP2000 recipient must use the IRS addressee when the notice has no explicit name", () => {
  const noticeWithoutName: WorkflowMatterAnalysis = {
    ...analysis,
    result: {
      ...analysis.result,
      workflowDetails: {
        responseAddress: {
          line1: recipient.line1,
          city: recipient.city,
          state: recipient.state,
          postal: recipient.postal,
        },
      },
    },
  };
  const wrongAddressee = { ...recipient, name: "Synthetic Third Party" };

  const confirmed = confirmCp2000Recipient({
    confirmedFromNotice: true,
    recipient,
    analysis: noticeWithoutName,
    documents: [source],
  });
  assert.ok(confirmed.sourceFingerprint, "the legitimate default IRS addressee remains valid");

  assert.throws(
    () => confirmCp2000Recipient({
      confirmedFromNotice: true,
      recipient: wrongAddressee,
      analysis: noticeWithoutName,
      documents: [source],
    }),
    /recipient differs|CP2000_RECIPIENT_MISMATCH/i,
    "the same postal location with a different addressee must not be approved",
  );

  const approval: ExactPacketApproval = {
    approvalId: "approval-addressee-drift",
    matterId: "matter-1",
    workflowId: "cp2000-response",
    packetSha256: "a".repeat(64),
    totalCents: 299,
    recipient: wrongAddressee,
    mailClass: "certified",
    approvedBy: "owner-1",
    approvedAt: "2026-10-30T00:00:00.000Z",
    recipientConfirmation: confirmed,
  };
  assert.throws(
    () => assertApprovedCp2000Recipient({
      approval, analysis: noticeWithoutName, documents: [source],
    }),
    /recipient differs|CP2000_RECIPIENT_MISMATCH/i,
    "a persisted recipient name drift must fail checkout even if notice and postal lines are unchanged",
  );
});

test("CP2000 approval rejects invisible or multiline characters in the extracted postal destination", () => {
  for (const line1 of [
    "100 Synthetic\u202e Notice Response Way",
    "100 Synthetic\u200b Notice Response Way",
    "100 Synthetic Notice Response Way\n",
  ]) {
    const corruptedRecipient = { ...recipient, line1 };
    const corruptedAnalysis: WorkflowMatterAnalysis = {
      ...analysis,
      result: {
        ...analysis.result,
        workflowDetails: { responseAddress: corruptedRecipient },
      },
    };
    assert.throws(
      () => confirmCp2000Recipient({
        confirmedFromNotice: true,
        recipient: corruptedRecipient,
        analysis: corruptedAnalysis,
        documents: [source],
      }),
      /printable|control|invalid/i,
      "unprintable source address must not authorize physical-mail recipient approval",
    );
  }
});

test("CP2000 checkout rejects a persisted approved recipient with hidden trailing line breaks", () => {
  const binding = confirmCp2000Recipient({
    confirmedFromNotice: true, recipient, analysis, documents: [source],
  });
  const approval: ExactPacketApproval = {
    approvalId: "approval-hidden-recipient",
    matterId: "matter-1",
    workflowId: "cp2000-response",
    packetSha256: "a".repeat(64),
    totalCents: 299,
    recipient: { ...recipient, line1: recipient.line1 + "\n" },
    mailClass: "certified",
    approvedBy: "owner-1",
    approvedAt: "2026-10-30T00:00:00.000Z",
    recipientConfirmation: binding,
  };
  assert.throws(
    () => assertApprovedCp2000Recipient({ approval, analysis, documents: [source] }),
    /printable|control|invalid/i,
    "normalization must not hide a changed printable envelope destination at checkout",
  );
});

test("CP2000 source-byte digest changes revoke approval even when source metadata and analysis are unchanged", () => {
  const binding = confirmCp2000Recipient({
    confirmedFromNotice: true, recipient, analysis, documents: [source],
  });
  const approval: ExactPacketApproval = {
    approvalId: "approval-source-bytes",
    matterId: "matter-1",
    workflowId: "cp2000-response",
    packetSha256: "c".repeat(64),
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
  const changedBytes = { ...source, sha256: "b".repeat(64) };
  assert.equal(changedBytes.documentId, source.documentId);
  assert.equal(changedBytes.sizeBytes, source.sizeBytes);
  assert.throws(
    () => assertApprovedCp2000Recipient({
      approval, analysis, documents: [changedBytes],
    }),
    /CP2000_RECIPIENT_CONFIRMATION_STALE|changed after approval/i,
    "a different registered SHA-256 must revoke the original approval",
  );
});

test("CP2000 approval fails closed when the trusted source digest is missing or malformed", () => {
  for (const sha256 of [undefined, null, "", "not-a-digest"]) {
    assert.throws(
      () => confirmCp2000Recipient({
        confirmedFromNotice: true,
        recipient,
        analysis,
        documents: [{ ...source, sha256 }],
      }),
      /trusted source digest|CP2000_NOTICE_DIGEST_MISSING/i,
    );
  }
});
