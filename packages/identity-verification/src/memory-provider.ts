import { cancelVerificationSession, createVerificationSession, recordCheckResult } from "./session.js";
import type { VerificationCheckResult, VerificationSession, VerificationSessionRequest } from "./types.js";

export interface VerificationProvider {
  readonly name: string;
  createSession(request: VerificationSessionRequest): Promise<VerificationSession>;
  getSession(sessionId: string): Promise<VerificationSession | null>;
  cancelSession(sessionId: string, reason: string, now: string): Promise<VerificationSession>;
}

let sequence = 0;
function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}_${sequence}`;
}

/**
 * Reference/test-only provider: no external network call, no real document
 * or biometric check is ever performed. Production use requires a real
 * vendor adapter (e.g. Stripe Identity or Persona) implementing
 * VerificationProvider — see README.md.
 */
export class InMemoryVerificationProvider implements VerificationProvider {
  readonly name = "in-memory-test-provider";
  private readonly sessions = new Map<string, VerificationSession>();

  async createSession(request: VerificationSessionRequest): Promise<VerificationSession> {
    const draft = createVerificationSession(request);
    const session: VerificationSession = Object.freeze({ id: nextId("idv"), ...draft });
    this.sessions.set(session.id, session);
    return session;
  }

  async getSession(sessionId: string): Promise<VerificationSession | null> {
    return this.sessions.get(sessionId) ?? null;
  }

  async cancelSession(sessionId: string, reason: string, now: string): Promise<VerificationSession> {
    const updated = cancelVerificationSession(this.require(sessionId), reason, now);
    this.sessions.set(sessionId, updated);
    return updated;
  }

  /** Test-only hook standing in for a real provider's result webhook/callback. */
  async simulateCheckResult(sessionId: string, result: VerificationCheckResult): Promise<VerificationSession> {
    const updated = recordCheckResult(this.require(sessionId), result);
    this.sessions.set(sessionId, updated);
    return updated;
  }

  private require(sessionId: string): VerificationSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Unknown verification session: ${sessionId}`);
    return session;
  }
}
