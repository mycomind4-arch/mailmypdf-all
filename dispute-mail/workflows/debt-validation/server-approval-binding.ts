/**
 * Server-only approval/checkout binding for the debt-validation domain.
 *
 * The caller MUST obtain trustedNotice and packet from authenticated,
 * owner-scoped persistence, never from the request JSON. This module has no
 * Stripe/Lob, persistence, network, or other side effects.
 * It is a reusable boundary, NOT a wired production approval route.
 */
import { createHash } from "node:crypto";
import {
  normalizeMailingAddress,
  validateDebtValidationIntake,
  type DebtValidationIntake,
} from "./domain";

const SHA256 = /^[a-f0-9]{64}$/i;

export interface TrustedDebtValidationNotice {
  ownerId: string;
  matterId: string;
  documentId: string;
  sha256: string;
  version: number;
  responseMailingAddress: string;
  /** Set only after a reviewer verifies the postal destination on the controlling notice. */
  mailingAddressVerified: boolean;
}

export interface DebtValidationPacketSnapshot {
  ownerId: string;
  matterId: string;
  matterVersion: number;
  /** Server-authoritative quote; client-supplied prices are never trusted. */
  totalCents: number;
  mailClass: "standard" | "certified" | "registered";
  pdfSha256: string;
  enclosureManifestSha256: string;
  intakeSha256: string;
  recipientAddress: string;
  noticeDocumentId: string;
  noticeSha256: string;
  noticeVersion: number;
}

export interface DebtValidationApprovalBinding {
  ownerId: string;
  matterId: string;
  matterVersion: number;
  totalCents: number;
  mailClass: "standard" | "certified" | "registered";
  pdfSha256: string;
  enclosureManifestSha256: string;
  intakeSha256: string;
  recipientAddress: string;
  noticeDocumentId: string;
  noticeSha256: string;
  noticeVersion: number;
}

function fail(code: string): never {
  throw new Error("debt_validation_" + code);
}

function digest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function validSha(value: unknown): value is string {
  return typeof value === "string" && SHA256.test(value);
}

function sameSha(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function sameAddress(left: string, right: string): boolean {
  return normalizeMailingAddress(left) === normalizeMailingAddress(right);
}

/** Stable field order; hash address text as rendered in the letter.\n * Postal-equivalent case/spacing edits may change the reviewed PDF bytes and\n * therefore must invalidate the approval intake fingerprint. */
export function debtValidationIntakeSha256(intake: DebtValidationIntake): string {
  if (validateDebtValidationIntake(intake).length) fail("invalid_intake");
  return digest(JSON.stringify([
    intake.consumerName.trim(),
    intake.consumerMailingAddress.trim(),
    intake.collectorName.trim(),
    intake.collectorResponseAddress.trim(),
    intake.accountReference.trim(),
    intake.disputeExplanation.trim(),
    intake.requestOriginalCreditor,
    intake.noticeDocumentId,
    intake.noticeSha256.toLowerCase(),
    intake.noticeVersion,
    normalizeMailingAddress(intake.noticeResponseAddress),
    intake.noticeDate,
    intake.noticeDisputeDeadline,
    intake.recipientConfirmed,
    normalizeMailingAddress(intake.confirmedRecipientAddress),
    intake.confirmedNoticeSha256.toLowerCase(),
    intake.confirmedNoticeDocumentId,
    intake.confirmedNoticeVersion,
  ]));
}

function assertTrustedNotice(
  ownerId: string,
  matterId: string,
  notice: TrustedDebtValidationNotice,
): void {
  if (!ownerId || !matterId || !notice
    || notice.ownerId !== ownerId || notice.matterId !== matterId) fail("owner_scope");
  if (!notice.mailingAddressVerified || !notice.documentId
    || !validSha(notice.sha256) || !Number.isSafeInteger(notice.version)
    || notice.version < 1 || !notice.responseMailingAddress.trim()) fail("unverified_notice");
}

function assertPacket(
  ownerId: string,
  matterId: string,
  notice: TrustedDebtValidationNotice,
  packet: DebtValidationPacketSnapshot,
): void {
  if (!packet || packet.ownerId !== ownerId || packet.matterId !== matterId) fail("packet_scope");
  if (!Number.isSafeInteger(packet.matterVersion) || packet.matterVersion < 1
    || !Number.isSafeInteger(packet.totalCents) || packet.totalCents < 0
    || !["standard", "certified", "registered"].includes(packet.mailClass)
    || !validSha(packet.pdfSha256) || !validSha(packet.enclosureManifestSha256)
    || !validSha(packet.intakeSha256)) fail("invalid_packet");
  if (packet.noticeDocumentId !== notice.documentId
    || !validSha(packet.noticeSha256)
    || !sameSha(packet.noticeSha256, notice.sha256)
    || packet.noticeVersion !== notice.version) fail("stale_notice");
  if (!packet.recipientAddress || !sameAddress(packet.recipientAddress, notice.responseMailingAddress)) {
    fail("recipient_changed");
  }
}

/**
 * Bind an explicit user-confirmed notice, recipient, intake and exact packet.
 * Both records are trusted server reads; the request supplies only intake and
 * the PDF digest the customer actually reviewed.
 */
export function createDebtValidationApprovalBinding(args: {
  ownerId: string;
  matterId: string;
  intake: DebtValidationIntake;
  reviewedPdfSha256: string;
  trustedNotice: TrustedDebtValidationNotice;
  packet: DebtValidationPacketSnapshot;
}): DebtValidationApprovalBinding {
  const { ownerId, matterId, intake, reviewedPdfSha256, trustedNotice, packet } = args;
  assertTrustedNotice(ownerId, matterId, trustedNotice);
  assertPacket(ownerId, matterId, trustedNotice, packet);
  if (validateDebtValidationIntake(intake).length) fail("invalid_intake");
  if (intake.noticeDocumentId !== trustedNotice.documentId
    || !sameSha(intake.noticeSha256, trustedNotice.sha256)
    || intake.noticeVersion !== trustedNotice.version
    || !sameAddress(intake.noticeResponseAddress, trustedNotice.responseMailingAddress)
    || !sameAddress(intake.confirmedRecipientAddress, trustedNotice.responseMailingAddress)
    || !sameAddress(intake.collectorResponseAddress, trustedNotice.responseMailingAddress)) {
    fail("notice_or_recipient_mismatch");
  }
  if (!validSha(reviewedPdfSha256) || !sameSha(reviewedPdfSha256, packet.pdfSha256)) {
    fail("unreviewed_packet");
  }
  if (!sameSha(debtValidationIntakeSha256(intake), packet.intakeSha256)) {
    fail("intake_changed");
  }
  return {
    ownerId,
    matterId,
    matterVersion: packet.matterVersion,
    totalCents: packet.totalCents,
    mailClass: packet.mailClass,
    pdfSha256: packet.pdfSha256.toLowerCase(),
    enclosureManifestSha256: packet.enclosureManifestSha256.toLowerCase(),
    intakeSha256: packet.intakeSha256.toLowerCase(),
    recipientAddress: normalizeMailingAddress(packet.recipientAddress),
    noticeDocumentId: trustedNotice.documentId,
    noticeSha256: trustedNotice.sha256.toLowerCase(),
    noticeVersion: trustedNotice.version,
  };
}

/**
 * Re-read the current owner-scoped intake as well as the notice and packet.
 * A persisted approval/packet snapshot must not authorize checkout after
 * the user edits their dispute or revokes recipient confirmation.
 * The caller must load currentIntake from authenticated persistence, never
 * from checkout request JSON.
 */
export function assertDebtValidationCheckoutBinding(args: {
  ownerId: string;
  matterId: string;
  binding: DebtValidationApprovalBinding;
  trustedNotice: TrustedDebtValidationNotice;
  packet: DebtValidationPacketSnapshot;
  currentIntake: DebtValidationIntake;
}): void {
  const { ownerId, matterId, binding, trustedNotice, packet, currentIntake } = args;
  assertTrustedNotice(ownerId, matterId, trustedNotice);
  assertPacket(ownerId, matterId, trustedNotice, packet);
  if (!currentIntake || validateDebtValidationIntake(currentIntake).length
    || currentIntake.noticeDocumentId !== trustedNotice.documentId
    || !sameSha(currentIntake.noticeSha256, trustedNotice.sha256)
    || currentIntake.noticeVersion !== trustedNotice.version
    || !sameAddress(currentIntake.noticeResponseAddress, trustedNotice.responseMailingAddress)
    || !sameAddress(currentIntake.collectorResponseAddress, trustedNotice.responseMailingAddress)
    || !sameAddress(currentIntake.confirmedRecipientAddress, trustedNotice.responseMailingAddress)
    || !sameSha(debtValidationIntakeSha256(currentIntake), packet.intakeSha256)) {
    fail("stale_intake");
  }
  if (!binding || binding.ownerId !== ownerId || binding.matterId !== matterId
    || binding.matterVersion !== packet.matterVersion
    || binding.totalCents !== packet.totalCents
    || binding.mailClass !== packet.mailClass
    || binding.noticeDocumentId !== trustedNotice.documentId
    || !validSha(binding.noticeSha256) || !sameSha(binding.noticeSha256, trustedNotice.sha256)
    || binding.noticeVersion !== trustedNotice.version
    || !validSha(binding.pdfSha256) || !sameSha(binding.pdfSha256, packet.pdfSha256)
    || !validSha(binding.enclosureManifestSha256)
    || !sameSha(binding.enclosureManifestSha256, packet.enclosureManifestSha256)
    || !validSha(binding.intakeSha256) || !sameSha(binding.intakeSha256, packet.intakeSha256)
    || typeof binding.recipientAddress !== "string"
    || !sameAddress(binding.recipientAddress, packet.recipientAddress)
    || !sameAddress(binding.recipientAddress, trustedNotice.responseMailingAddress)) {
    fail("stale_approval");
  }
}
