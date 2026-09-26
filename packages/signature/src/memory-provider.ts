import { applySignatureEvent } from "./envelope.js";
import type { SignatureEnvelope, SignatureRequest, SignerConsent } from "./types.js";

export interface SignatureProvider {
  readonly name: string;
  createEnvelope(request: SignatureRequest, now: string): Promise<SignatureEnvelope>;
  getEnvelope(envelopeId: string): Promise<SignatureEnvelope | null>;
  voidEnvelope(envelopeId: string, reason: string, now: string): Promise<SignatureEnvelope>;
}

let sequence = 0;
function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}_${sequence}`;
}

/**
 * Reference/test-only provider: no external network call, no real signer
 * ever sees a signing link. Production use requires a real vendor adapter
 * (e.g. Documenso or Dropbox Sign) implementing SignatureProvider — see
 * README.md.
 */
export class InMemorySignatureProvider implements SignatureProvider {
  readonly name = "in-memory-test-provider";
  private readonly envelopes = new Map<string, SignatureEnvelope>();

  async createEnvelope(request: SignatureRequest, now: string): Promise<SignatureEnvelope> {
    const envelope: SignatureEnvelope = Object.freeze({
      id: nextId("env"),
      documentId: request.documentId,
      documentSha256: request.documentSha256,
      signers: request.signers,
      status: "pending",
      events: Object.freeze([{ type: "created", at: now } as const]),
      createdAt: now,
      expiresAt: request.expiresAt,
    });
    this.envelopes.set(envelope.id, envelope);
    return envelope;
  }

  async getEnvelope(envelopeId: string): Promise<SignatureEnvelope | null> {
    return this.envelopes.get(envelopeId) ?? null;
  }

  async voidEnvelope(envelopeId: string, reason: string, now: string): Promise<SignatureEnvelope> {
    const updated = applySignatureEvent(this.require(envelopeId), { type: "voided", at: now, reason });
    this.envelopes.set(envelopeId, updated);
    return updated;
  }

  /** Test-only hook standing in for a real provider's signing callback/webhook. */
  async simulateSign(
    envelopeId: string,
    signerId: string,
    consent: SignerConsent,
    now: string,
  ): Promise<SignatureEnvelope> {
    const updated = applySignatureEvent(this.require(envelopeId), { type: "signed", at: now, signerId, consent });
    this.envelopes.set(envelopeId, updated);
    return updated;
  }

  /** Test-only hook standing in for a real provider's decline callback/webhook. */
  async simulateDecline(envelopeId: string, signerId: string, reason: string, now: string): Promise<SignatureEnvelope> {
    const updated = applySignatureEvent(this.require(envelopeId), { type: "declined", at: now, signerId, reason });
    this.envelopes.set(envelopeId, updated);
    return updated;
  }

  private require(envelopeId: string): SignatureEnvelope {
    const envelope = this.envelopes.get(envelopeId);
    if (!envelope) throw new Error(`Unknown envelope: ${envelopeId}`);
    return envelope;
  }
}
