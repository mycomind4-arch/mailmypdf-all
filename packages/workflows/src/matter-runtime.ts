import type {
  WorkflowMailingAddress,
  WorkflowMatterDocument,
  WorkflowPacketPreview,
} from "./matter-runtime-client.js";

export class WorkflowRuntimeError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = "WorkflowRuntimeError";
  }
}

export function requireCleanSourceDocument(
  documents: readonly WorkflowMatterDocument[],
): WorkflowMatterDocument {
  const source = documents.find((document) => document.role === "subject_notice");
  if (!source) {
    throw new WorkflowRuntimeError("Add the source decision notice before continuing.", "SOURCE_DOCUMENT_MISSING");
  }
  if (!source.usable || source.securityStatus !== "clean") {
    throw new WorkflowRuntimeError(
      "The source document must clear security scanning before downstream use.",
      "SOURCE_DOCUMENT_NOT_CLEAN",
    );
  }
  return source;
}

export function requireIncludedDocumentsReady(
  documents: readonly WorkflowMatterDocument[],
): WorkflowMatterDocument[] {
  const included = documents
    .filter((document) => document.role === "evidence" && document.included)
    .sort((a, b) => a.position - b.position);

  const blocked = included.filter(
    (document) => !document.usable || document.securityStatus !== "clean",
  );
  if (blocked.length) {
    throw new WorkflowRuntimeError(
      `${blocked.length} included document(s) have not cleared security scanning.`,
      "PACKET_DOCUMENT_NOT_CLEAN",
    );
  }
  return included;
}

export function normalizeMailingAddress(
  input: WorkflowMailingAddress,
): WorkflowMailingAddress {
  const normalized: WorkflowMailingAddress = {
    name: input.name.trim(),
    line1: input.line1.trim(),
    line2: input.line2?.trim() || null,
    city: input.city.trim(),
    state: input.state.trim().toUpperCase(),
    postal: input.postal.trim(),
  };
  if (!normalized.name || !normalized.line1 || !normalized.city) {
    throw new WorkflowRuntimeError("A complete mailing address is required.", "ADDRESS_INCOMPLETE");
  }
  if (!/^[A-Z]{2}$/.test(normalized.state)) {
    throw new WorkflowRuntimeError("Mailing state must be a two-letter abbreviation.", "ADDRESS_STATE_INVALID");
  }
  if (!/^\d{5}(?:-\d{4})?$/.test(normalized.postal)) {
    throw new WorkflowRuntimeError("Mailing ZIP code is invalid.", "ADDRESS_POSTAL_INVALID");
  }
  return normalized;
}

export type ExactPacketApproval = {
  approvalId: string;
  matterId: string;
  workflowId: string;
  packetSha256: string;
  totalCents: number;
  recipient: WorkflowMailingAddress;
  mailClass: "standard" | "certified" | "registered";
  approvedBy: string;
  approvedAt: string;
};

export function createExactPacketApproval(input: {
  approvalId: string;
  matterId: string;
  workflowId: string;
  preview: WorkflowPacketPreview;
  recipient: WorkflowMailingAddress;
  mailClass: ExactPacketApproval["mailClass"];
  approvedBy: string;
  approvedAt?: string;
}): ExactPacketApproval {
  if (!/^[0-9a-f]{64}$/i.test(input.preview.packetSha256)) {
    throw new WorkflowRuntimeError("Packet hash is invalid.", "PACKET_HASH_INVALID");
  }
  if (!Number.isSafeInteger(input.preview.quote.totalCents) || input.preview.quote.totalCents < 0) {
    throw new WorkflowRuntimeError("Packet quote is invalid.", "PACKET_QUOTE_INVALID");
  }
  if (!input.approvalId.trim() || !input.matterId.trim() || !input.workflowId.trim() || !input.approvedBy.trim()) {
    throw new WorkflowRuntimeError("Approval identity is incomplete.", "APPROVAL_IDENTITY_INCOMPLETE");
  }

  return Object.freeze({
    approvalId: input.approvalId,
    matterId: input.matterId,
    workflowId: input.workflowId,
    packetSha256: input.preview.packetSha256.toLowerCase(),
    totalCents: input.preview.quote.totalCents,
    recipient: normalizeMailingAddress(input.recipient),
    mailClass: input.mailClass,
    approvedBy: input.approvedBy,
    approvedAt: input.approvedAt ?? new Date().toISOString(),
  });
}

export function assertPacketMatchesApproval(
  approval: ExactPacketApproval,
  preview: WorkflowPacketPreview,
): void {
  if (approval.packetSha256 !== preview.packetSha256.toLowerCase()) {
    throw new WorkflowRuntimeError(
      "The packet changed after approval. Review and approve the new packet.",
      "APPROVED_PACKET_CHANGED",
    );
  }
  if (approval.totalCents !== preview.quote.totalCents) {
    throw new WorkflowRuntimeError(
      "The server-authoritative price changed after approval. Review and approve again.",
      "APPROVED_PRICE_CHANGED",
    );
  }
}

function idPart(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized || !/^[a-zA-Z0-9._:-]+$/.test(normalized)) {
    throw new WorkflowRuntimeError(`${label} is invalid for idempotency.`, "IDEMPOTENCY_ID_INVALID");
  }
  return normalized;
}

/** Stable across retries for one immutable approval. */
export function paymentIdempotencyKey(approvalId: string): string {
  return `workflow_payment_${idPart(approvalId, "approvalId")}`;
}

/** Stable across webhook/provider retries for one paid order. */
export function mailingIdempotencyKey(orderId: string, packetSha256: string): string {
  const hash = packetSha256.toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hash)) {
    throw new WorkflowRuntimeError("packetSha256 is invalid for idempotency.", "IDEMPOTENCY_HASH_INVALID");
  }
  return `workflow_mail_${idPart(orderId, "orderId")}_${hash.slice(0, 16)}`;
}

export type WorkflowRuntimeReadiness = {
  sourceReady: boolean;
  includedDocumentsReady: boolean;
  approvalReady: boolean;
  blockers: readonly string[];
};

export function evaluateWorkflowRuntimeReadiness(input: {
  documents: readonly WorkflowMatterDocument[];
  approval?: ExactPacketApproval | null;
}): WorkflowRuntimeReadiness {
  const blockers: string[] = [];

  try {
    requireCleanSourceDocument(input.documents);
  } catch (error) {
    blockers.push(error instanceof Error ? error.message : String(error));
  }

  try {
    requireIncludedDocumentsReady(input.documents);
  } catch (error) {
    blockers.push(error instanceof Error ? error.message : String(error));
  }

  if (!input.approval) blockers.push("The exact packet has not been approved.");

  return {
    sourceReady: !blockers.some((message) => /source/i.test(message)),
    includedDocumentsReady: !blockers.some((message) => /included document/i.test(message)),
    approvalReady: Boolean(input.approval),
    blockers,
  };
}
