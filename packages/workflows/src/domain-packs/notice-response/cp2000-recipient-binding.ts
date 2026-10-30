import type {
  WorkflowMailingAddress,
  WorkflowMatterAnalysis,
  WorkflowMatterDocument,
} from "../../matter-runtime-client.js";
import {
  normalizeMailingAddress,
  WorkflowRuntimeError,
  type ExactPacketApproval,
} from "../../matter-runtime.js";

/**
 * A CP2000 destination is the response address printed on the controlling
 * notice, never a generic IRS office or a fax destination. This guard is
 * server-side; the UI checklist alone is not authorization.
 */
function noticeAddress(analysis: WorkflowMatterAnalysis): WorkflowMailingAddress {
  const value = analysis.result.workflowDetails?.responseAddress;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new WorkflowRuntimeError(
      "The controlling CP2000 notice has no verified response mailing address. Review the notice before approval.",
      "CP2000_NOTICE_ADDRESS_MISSING",
    );
  }
  const raw = value as Record<string, unknown>;
  if (["line1", "city", "state", "postal"].some((field) =>
    typeof raw[field] !== "string" || !(raw[field] as string).trim()
  )) {
    throw new WorkflowRuntimeError(
      "The controlling CP2000 response address is incomplete.",
      "CP2000_NOTICE_ADDRESS_MISSING",
    );
  }
  return normalizeMailingAddress({
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name : "Internal Revenue Service",
    line1: raw.line1 as string,
    line2: typeof raw.line2 === "string" ? raw.line2 : null,
    city: raw.city as string,
    state: raw.state as string,
    postal: raw.postal as string,
  });
}

/**
 * A matching address does not establish that an uploaded document is an IRS
 * notice. Fail closed on an unidentified or different issuing agency before
 * binding the destination to CP2000 approval or checkout.
 *
 * This is an issuer check, not proof that the source is specifically CP2000
 * or that the address came from page one; those require notice provenance.
 */
function assertIrsIssuer(analysis: WorkflowMatterAnalysis): void {
  const raw = analysis.result.issuer;
  const normalized = typeof raw === "string"
    ? raw.trim().toLowerCase().replace(/[.,()\-]/g, " ").replace(/\s+/g, " ")
    : "";
  const knownIrsNames = new Set([
    "irs",
    "internal revenue service",
    "internal revenue service irs",
    "irs internal revenue service",
    "us internal revenue service",
    "united states internal revenue service",
    "department of the treasury internal revenue service",
    "department of treasury internal revenue service",
    "us department of the treasury internal revenue service",
    "united states department of the treasury internal revenue service",
  ]);
  if (!knownIrsNames.has(normalized)) {
    throw new WorkflowRuntimeError(
      "The controlling CP2000 source is not identified as an IRS notice. Verify the source before approving a recipient.",
      "CP2000_NOTICE_ISSUER_MISMATCH",
    );
  }
}

function sourceBinding(
  analysis: WorkflowMatterAnalysis,
  documents: readonly WorkflowMatterDocument[],
): NonNullable<ExactPacketApproval["recipientConfirmation"]> {
  // Normal attachment routes replace an earlier subject notice, but persisted
  // or imported matters may contain conflicting source links. Never bind a
  // mailing recipient to whichever notice happens to appear first.
  assertIrsIssuer(analysis);
  const sources = documents.filter((document) => document.role === "subject_notice");
  if (sources.length > 1) {
    throw new WorkflowRuntimeError(
      "Multiple controlling CP2000 notices are attached. Keep one source notice and analyze it again.",
      "CP2000_NOTICE_AMBIGUOUS",
    );
  }
  const source = sources[0];
  if (!source || !source.usable || source.securityStatus !== "clean" ||
      source.documentId !== analysis.documentId) {
    throw new WorkflowRuntimeError(
      "The controlling CP2000 notice changed or is not ready. Analyze it again.",
      "CP2000_NOTICE_CHANGED",
    );
  }
  if (!Number.isSafeInteger(analysis.version) || analysis.version < 1) {
    throw new WorkflowRuntimeError("CP2000 notice analysis is invalid.", "CP2000_NOTICE_CHANGED");
  }
  const destination = noticeAddress(analysis);
  return {
    sourceDocumentId: source.documentId,
    analysisVersion: analysis.version,
    sourceFingerprint: JSON.stringify({
      documentId: source.documentId,
      filename: source.filename,
      mimeType: source.mimeType,
      sizeBytes: source.sizeBytes,
      pageCount: source.pageCount,
      securityStatus: source.securityStatus,
      usable: source.usable,
      responseAddress: destination,
    }),
  };
}

function assertExactDestination(
  recipient: WorkflowMailingAddress,
  analysis: WorkflowMatterAnalysis,
): void {
  const actual = normalizeMailingAddress(recipient);
  const expected = noticeAddress(analysis);
  if (actual.line1 !== expected.line1 ||
      actual.line2 !== expected.line2 ||
      actual.city !== expected.city ||
      actual.state !== expected.state ||
      actual.postal !== expected.postal ||
      (analysis.result.workflowDetails?.responseAddress &&
        typeof (analysis.result.workflowDetails.responseAddress as Record<string, unknown>).name === "string" &&
        (analysis.result.workflowDetails.responseAddress as Record<string, unknown>).name &&
        actual.name !== expected.name)) {
    throw new WorkflowRuntimeError(
      "The recipient differs from the response mailing address on the controlling CP2000 notice.",
      "CP2000_RECIPIENT_MISMATCH",
    );
  }
}

export function confirmCp2000Recipient(input: {
  confirmedFromNotice: unknown;
  recipient: WorkflowMailingAddress;
  analysis: WorkflowMatterAnalysis;
  documents: readonly WorkflowMatterDocument[];
}): NonNullable<ExactPacketApproval["recipientConfirmation"]> {
  if (input.confirmedFromNotice !== true) {
    throw new WorkflowRuntimeError(
      "Explicit confirmation of the CP2000 notice response address is required.",
      "CP2000_RECIPIENT_CONFIRMATION_REQUIRED",
    );
  }
  assertExactDestination(input.recipient, input.analysis);
  return sourceBinding(input.analysis, input.documents);
}

export function assertApprovedCp2000Recipient(input: {
  approval: ExactPacketApproval;
  analysis: WorkflowMatterAnalysis;
  documents: readonly WorkflowMatterDocument[];
}): void {
  const binding = input.approval.recipientConfirmation;
  const current = sourceBinding(input.analysis, input.documents);
  if (!binding || binding.sourceDocumentId !== current.sourceDocumentId ||
      binding.analysisVersion !== current.analysisVersion ||
      binding.sourceFingerprint !== current.sourceFingerprint) {
    throw new WorkflowRuntimeError(
      "The controlling CP2000 notice or its confirmation changed after approval. Review and approve again.",
      "CP2000_RECIPIENT_CONFIRMATION_STALE",
    );
  }
  assertExactDestination(input.approval.recipient, input.analysis);
}
