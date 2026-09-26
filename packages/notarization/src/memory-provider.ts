import { attestNotarization, createNotarizationSession, declineNotarization, voidNotarization } from "./session.js";
import type { NotarizationSession, NotarizationSessionRequest, NotaryAttestation } from "./types.js";

export interface NotaryProvider {
  readonly name: string;
  createSession(request: NotarizationSessionRequest): Promise<NotarizationSession>;
  getSession(sessionId: string): Promise<NotarizationSession | null>;
}

let sequence = 0;
function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}_${sequence}`;
}

/**
 * Reference/test-only provider: no real notary session, no real seal.
 * Production use requires a real remote-online-notarization (RON) vendor
 * adapter (e.g. Proof.com) implementing NotaryProvider — see README.md.
 */
export class InMemoryNotaryProvider implements NotaryProvider {
  readonly name = "in-memory-test-provider";
  private readonly sessions = new Map<string, NotarizationSession>();

  async createSession(request: NotarizationSessionRequest): Promise<NotarizationSession> {
    const draft = createNotarizationSession(request);
    const session: NotarizationSession = Object.freeze({ id: nextId("not"), ...draft });
    this.sessions.set(session.id, session);
    return session;
  }

  async getSession(sessionId: string): Promise<NotarizationSession | null> {
    return this.sessions.get(sessionId) ?? null;
  }

  /** Test-only hook standing in for a real notary completing the session. */
  async simulateAttestation(sessionId: string, attestation: NotaryAttestation): Promise<NotarizationSession> {
    const updated = attestNotarization(this.require(sessionId), attestation);
    this.sessions.set(sessionId, updated);
    return updated;
  }

  async simulateDecline(sessionId: string, reason: string, now: string): Promise<NotarizationSession> {
    const updated = declineNotarization(this.require(sessionId), reason, now);
    this.sessions.set(sessionId, updated);
    return updated;
  }

  async voidSession(sessionId: string, reason: string, now: string): Promise<NotarizationSession> {
    const updated = voidNotarization(this.require(sessionId), reason, now);
    this.sessions.set(sessionId, updated);
    return updated;
  }

  private require(sessionId: string): NotarizationSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Unknown notarization session: ${sessionId}`);
    return session;
  }
}
