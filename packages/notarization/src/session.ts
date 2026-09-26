import type { NotarizationSession, NotarizationSessionRequest, NotaryAttestation } from "./types.js";

function assertSha256(value: string, label: string): void {
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error(`${label} requires a SHA-256 hex hash.`);
}

export function createNotarizationSession(
  request: NotarizationSessionRequest,
): Omit<NotarizationSession, "id"> {
  if (!request.documentId.trim()) throw new Error("Notarization session requires documentId.");
  assertSha256(request.documentSha256, "Notarization session");
  if (!request.verifiedSignerIdentity.name.trim() || !request.verifiedSignerIdentity.verifiedAt.trim()) {
    throw new Error("Notarization session requires an already-verified signer identity.");
  }
  if (request.expiresAt && Date.parse(request.expiresAt) <= Date.parse(request.now)) {
    throw new Error("Notarization session expiresAt must be after now.");
  }

  return Object.freeze({
    documentId: request.documentId,
    documentSha256: request.documentSha256,
    verifiedSignerIdentity: Object.freeze({ ...request.verifiedSignerIdentity }),
    status: "pending",
    createdAt: request.now,
    expiresAt: request.expiresAt,
  });
}

function isExpired(session: Pick<NotarizationSession, "expiresAt">, now: string): boolean {
  return session.expiresAt !== undefined && Date.parse(now) > Date.parse(session.expiresAt);
}

function assertPending(session: NotarizationSession, now: string): void {
  if (session.status !== "pending") throw new Error(`Cannot act on a ${session.status} notarization session.`);
  if (isExpired(session, now)) throw new Error("Notarization session has expired.");
}

export function attestNotarization(
  session: NotarizationSession,
  attestation: NotaryAttestation,
): NotarizationSession {
  assertPending(session, attestation.sealedAt);
  if (!attestation.notaryName.trim() || !attestation.notaryCommissionNumber.trim() || !attestation.notaryJurisdiction.trim()) {
    throw new Error("A notary attestation requires notaryName, notaryCommissionNumber, and notaryJurisdiction.");
  }
  if (!attestation.journalEntryId.trim()) {
    throw new Error("A notary attestation requires a journalEntryId for recordkeeping.");
  }
  return Object.freeze({ ...session, status: "notarized", attestation: Object.freeze({ ...attestation }) });
}

export function declineNotarization(session: NotarizationSession, reason: string, now: string): NotarizationSession {
  assertPending(session, now);
  if (!reason.trim()) throw new Error("A decline requires a reason.");
  return Object.freeze({ ...session, status: "declined", declineReason: reason });
}

export function voidNotarization(session: NotarizationSession, reason: string, now: string): NotarizationSession {
  assertPending(session, now);
  if (!reason.trim()) throw new Error("Voiding a notarization requires a reason.");
  return Object.freeze({ ...session, status: "voided", voidReason: reason });
}

export function isNotarized(session: NotarizationSession): boolean {
  return session.status === "notarized" && session.attestation !== undefined;
}

export function assertNotarized(session: NotarizationSession): void {
  if (!isNotarized(session)) throw new Error(`Notarization session is ${session.status}, not notarized.`);
}
