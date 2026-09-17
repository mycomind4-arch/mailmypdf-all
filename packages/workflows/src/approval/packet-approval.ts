import type {
  WorkflowMailingAddress,
  WorkflowPacketPreview,
} from "../matter-runtime-client.js";
import {
  normalizeMailingAddress,
  WorkflowRuntimeError,
} from "../matter-runtime.js";

export type ApprovedPacketManifestEntry = {
  documentId: string;
  role: string;
  evidenceKind: string | null;
  filename: string;
  sha256: string;
  pageCount: number;
};

export type ReviewedPacket = {
  packetSha256: string;
  totalCents: number;
};

export type ImmutablePacketApproval = {
  approvalId: string;
  matterId: string;
  workflowId: string;
  packetSha256: string;
  responsePages: number;
  supportingPages: number;
  manifest: readonly ApprovedPacketManifestEntry[];
  totalCents: number;
  recipient: WorkflowMailingAddress;
  mailClass: "standard" | "certified" | "registered";
  approvedBy: string;
  approvedAt: string;
};

function normalizeHash(value: string, label: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new WorkflowRuntimeError(`${label} is invalid`, "PACKET_HASH_INVALID");
  }
  return normalized;
}

function safePageCount(value: number, label: string, allowZero = false): number {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    throw new WorkflowRuntimeError(`${label} is invalid`, "PACKET_PAGE_COUNT_INVALID");
  }
  return value;
}

export function normalizePacketManifest(
  value: readonly WorkflowPacketPreview["manifest"][number][],
): readonly ApprovedPacketManifestEntry[] {
  if (!Array.isArray(value)) {
    throw new WorkflowRuntimeError("Packet manifest is invalid", "PACKET_MANIFEST_INVALID");
  }

  return Object.freeze(value.map((entry) => {
    if (!entry || typeof entry !== "object") {
      throw new WorkflowRuntimeError("Packet manifest is invalid", "PACKET_MANIFEST_INVALID");
    }
    if (!entry.documentId?.trim() || !entry.role?.trim() || !entry.filename?.trim()) {
      throw new WorkflowRuntimeError("Packet manifest is incomplete", "PACKET_MANIFEST_INVALID");
    }
    return Object.freeze({
      documentId: entry.documentId.trim(),
      role: entry.role.trim(),
      evidenceKind: entry.evidenceKind?.trim() || null,
      filename: entry.filename.trim(),
      sha256: normalizeHash(entry.sha256, "Attachment hash"),
      pageCount: safePageCount(entry.pageCount, "Attachment page count"),
    });
  }));
}

export function assertReviewedPacket(
  reviewed: ReviewedPacket,
  current: Pick<WorkflowPacketPreview, "packetSha256" | "quote">,
): void {
  const reviewedHash = normalizeHash(reviewed.packetSha256, "Reviewed packet hash");
  const currentHash = normalizeHash(current.packetSha256, "Current packet hash");
  if (!Number.isSafeInteger(reviewed.totalCents) || reviewed.totalCents < 0) {
    throw new WorkflowRuntimeError("Reviewed packet price is invalid", "PACKET_PRICE_INVALID");
  }
  if (!Number.isSafeInteger(current.quote.totalCents) || current.quote.totalCents < 0) {
    throw new WorkflowRuntimeError("Current packet price is invalid", "PACKET_PRICE_INVALID");
  }
  if (reviewedHash !== currentHash || reviewed.totalCents !== current.quote.totalCents) {
    throw new WorkflowRuntimeError(
      "The packet or price changed. Review the updated packet before approving.",
      "REVIEWED_PACKET_CHANGED",
    );
  }
}

/**
 * Creates the immutable approval record from a server-materialized preview.
 * Page counts, manifest and price are part of the approval, not client inputs.
 */
export function createImmutablePacketApproval(input: {
  approvalId: string;
  matterId: string;
  workflowId: string;
  preview: WorkflowPacketPreview;
  reviewed: ReviewedPacket;
  recipient: WorkflowMailingAddress;
  mailClass: ImmutablePacketApproval["mailClass"];
  approvedBy: string;
  approvedAt?: string;
}): ImmutablePacketApproval {
  assertReviewedPacket(input.reviewed, input.preview);
  if (!input.approvalId.trim() || !input.matterId.trim() || !input.workflowId.trim() || !input.approvedBy.trim()) {
    throw new WorkflowRuntimeError("Approval identity is incomplete", "APPROVAL_IDENTITY_INCOMPLETE");
  }
  if (!Number.isSafeInteger(input.preview.quote.totalCents) || input.preview.quote.totalCents < 0) {
    throw new WorkflowRuntimeError("Packet quote is invalid", "PACKET_PRICE_INVALID");
  }

  return Object.freeze({
    approvalId: input.approvalId.trim(),
    matterId: input.matterId.trim(),
    workflowId: input.workflowId.trim(),
    packetSha256: normalizeHash(input.preview.packetSha256, "Packet hash"),
    responsePages: safePageCount(input.preview.responsePages, "Response page count"),
    supportingPages: safePageCount(input.preview.supportingPages, "Supporting page count", true),
    manifest: normalizePacketManifest(input.preview.manifest),
    totalCents: input.preview.quote.totalCents,
    recipient: normalizeMailingAddress(input.recipient),
    mailClass: input.mailClass,
    approvedBy: input.approvedBy.trim(),
    approvedAt: input.approvedAt ?? new Date().toISOString(),
  });
}

/**
 * Rebuild immediately before checkout and compare every material property.
 * Any packet, attachment, page-count or price change fails closed.
 */
export function assertMaterializedPacketMatchesApproval(
  approval: ImmutablePacketApproval,
  current: WorkflowPacketPreview,
): void {
  if (approval.packetSha256 !== normalizeHash(current.packetSha256, "Packet hash")) {
    throw new WorkflowRuntimeError(
      "The approved packet changed. Review and approve it again before checkout.",
      "APPROVED_PACKET_CHANGED",
    );
  }
  if (
    approval.responsePages !== current.responsePages ||
    approval.supportingPages !== current.supportingPages
  ) {
    throw new WorkflowRuntimeError(
      "The approved packet page count changed. Review and approve it again before checkout.",
      "APPROVED_PAGE_COUNT_CHANGED",
    );
  }

  const approvedManifest = JSON.stringify(normalizePacketManifest(approval.manifest));
  const currentManifest = JSON.stringify(normalizePacketManifest(current.manifest));
  if (approvedManifest !== currentManifest) {
    throw new WorkflowRuntimeError(
      "The approved attachment manifest changed. Review and approve it again before checkout.",
      "APPROVED_MANIFEST_CHANGED",
    );
  }

  if (approval.totalCents !== current.quote.totalCents) {
    throw new WorkflowRuntimeError(
      "The approved price changed. Review the updated quote before checkout.",
      "APPROVED_PRICE_CHANGED",
    );
  }
}
