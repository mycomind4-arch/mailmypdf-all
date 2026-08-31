import { describe, it, expect, beforeEach } from 'vitest';
import {
  requireAuthentication,
  authorizeCaseAccess,
  authorizeDocumentAccess,
  buildIsolatedAIContext,
  validateAIContextAccess,
  authorizeApproval,
  authorizePayment,
  authorizeFulfillment,
  registerProviderOrder,
  validateProviderCallback,
  checkReplay,
  computeAuditHash,
  createAuditEntry,
  verifyAuditIntegrity,
  sanitizeForLog,
  generateSecureDocumentUrl,
  validateSecureUrl,
  type AuthenticatedUser,
  type CaseRef,
  type DocumentRef,
} from './security';

const USER_A: AuthenticatedUser = { id: 'user-a', role: 'user' };
const USER_B: AuthenticatedUser = { id: 'user-b', role: 'user' };
const ADMIN: AuthenticatedUser = { id: 'admin-1', role: 'admin' };

const CASE_A: CaseRef = { caseId: 'case-1', ownerUserId: 'user-a' };
const CASE_B: CaseRef = { caseId: 'case-2', ownerUserId: 'user-b' };
const DOC_A: DocumentRef = { documentId: 'doc-1', ownerUserId: 'user-a' };
const DOC_B: DocumentRef = { documentId: 'doc-2', ownerUserId: 'user-b' };

describe('Security: Authentication', () => {
  it('rejects unauthenticated user', () => {
    expect(requireAuthentication(null).allowed).toBe(false);
    expect(requireAuthentication(undefined).allowed).toBe(false);
    expect(requireAuthentication({ id: '', role: 'user' }).allowed).toBe(false);
  });

  it('accepts authenticated user', () => {
    expect(requireAuthentication(USER_A).allowed).toBe(true);
  });
});

describe('Security: Owner Isolation', () => {
  it('owner can access their own case', () => {
    expect(authorizeCaseAccess(USER_A, CASE_A).allowed).toBe(true);
  });

  it('non-owner cannot access another user case', () => {
    const result = authorizeCaseAccess(USER_B, CASE_A);
    expect(result.allowed).toBe(false);
    expect(result.code).toBe('OWNER_MISMATCH');
  });

  it('admin can access any case', () => {
    expect(authorizeCaseAccess(ADMIN, CASE_A).allowed).toBe(true);
    expect(authorizeCaseAccess(ADMIN, CASE_B).allowed).toBe(true);
  });

  it('unauthenticated user cannot access any case', () => {
    const result = authorizeCaseAccess({ id: '', role: 'user' }, CASE_A);
    expect(result.allowed).toBe(false);
    expect(result.code).toBe('NOT_AUTHENTICATED');
  });

  it('owner can access their own document', () => {
    expect(authorizeDocumentAccess(USER_A, DOC_A).allowed).toBe(true);
  });

  it('non-owner cannot access another user document', () => {
    const result = authorizeDocumentAccess(USER_B, DOC_A);
    expect(result.allowed).toBe(false);
    expect(result.code).toBe('OWNER_MISMATCH');
  });
});

describe('Security: AI Context Isolation', () => {
  it('builds isolated context with only user data', () => {
    const context = buildIsolatedAIContext(USER_A, ['case-1', 'case-2'], ['doc-1', 'doc-2']);
    expect(context.userId).toBe('user-a');
    expect(context.caseIds).toEqual(['case-1', 'case-2']);
  });

  it('AI cannot access case outside its context', () => {
    const context = buildIsolatedAIContext(USER_A, ['case-1'], ['doc-1']);
    const result = validateAIContextAccess(context, 'case-2');
    expect(result.allowed).toBe(false);
    expect(result.code).toBe('OWNER_MISMATCH');
  });

  it('AI can access case within its context', () => {
    const context = buildIsolatedAIContext(USER_A, ['case-1', 'case-2'], ['doc-1']);
    expect(validateAIContextAccess(context, 'case-1').allowed).toBe(true);
    expect(validateAIContextAccess(context, 'case-2').allowed).toBe(true);
  });

  it('AI context with empty caseIds blocks all access', () => {
    const context = buildIsolatedAIContext(USER_A, [], []);
    expect(validateAIContextAccess(context, 'any-case').allowed).toBe(false);
  });
});

describe('Security: Approval/Payment/Fulfillment Authorization', () => {
  it('approval requires user_review state', () => {
    expect(authorizeApproval(USER_A, CASE_A, 'user_review').allowed).toBe(true);
    expect(authorizeApproval(USER_A, CASE_A, 'drafted').allowed).toBe(false);
    expect(authorizeApproval(USER_A, CASE_A, 'approved').allowed).toBe(false);
  });

  it('non-owner cannot approve', () => {
    expect(authorizeApproval(USER_B, CASE_A, 'user_review').allowed).toBe(false);
  });

  it('payment requires checkout_pending state', () => {
    expect(authorizePayment(USER_A, CASE_A, 'checkout_pending').allowed).toBe(true);
    expect(authorizePayment(USER_A, CASE_A, 'paid').allowed).toBe(false);
    expect(authorizePayment(USER_A, CASE_A, 'approved').allowed).toBe(false);
  });

  it('non-owner cannot pay', () => {
    expect(authorizePayment(USER_B, CASE_A, 'checkout_pending').allowed).toBe(false);
  });

  it('fulfillment requires paid state', () => {
    expect(authorizeFulfillment(USER_A, CASE_A, 'paid').allowed).toBe(true);
    expect(authorizeFulfillment(USER_A, CASE_A, 'checkout_pending').allowed).toBe(false);
    expect(authorizeFulfillment(USER_A, CASE_A, 'fulfilled').allowed).toBe(false);
  });

  it('non-owner cannot fulfill', () => {
    expect(authorizeFulfillment(USER_B, CASE_A, 'paid').allowed).toBe(false);
  });
});

describe('Security: Provider Callback Validation', () => {
  beforeEach(() => {
    // Register a known order
    registerProviderOrder('order-123');
  });

  it('accepts callback for known order', () => {
    const result = validateProviderCallback({
      orderId: 'order-123',
      status: 'mailed',
      timestamp: new Date().toISOString(),
    });
    expect(result.allowed).toBe(true);
  });

  it('rejects callback for unknown order', () => {
    const result = validateProviderCallback({
      orderId: 'order-unknown',
      status: 'mailed',
      timestamp: new Date().toISOString(),
    });
    expect(result.allowed).toBe(false);
    expect(result.code).toBe('INVALID_CALLBACK');
  });

  it('rejects expired callback', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 31);
    const result = validateProviderCallback({
      orderId: 'order-123',
      status: 'mailed',
      timestamp: oldDate.toISOString(),
    });
    expect(result.allowed).toBe(false);
    expect(result.code).toBe('EXPIRED');
  });
});

describe('Security: Replay Resistance', () => {
  it('accepts first use of nonce', () => {
    expect(checkReplay('nonce-1').allowed).toBe(true);
  });

  it('rejects replayed nonce', () => {
    checkReplay('nonce-replay');
    const result = checkReplay('nonce-replay');
    expect(result.allowed).toBe(false);
    expect(result.code).toBe('REPLAY_DETECTED');
  });

  it('accepts different nonces', () => {
    expect(checkReplay('nonce-a').allowed).toBe(true);
    expect(checkReplay('nonce-b').allowed).toBe(true);
  });
});

describe('Security: Audit Integrity', () => {
  it('creates audit entry with hash', () => {
    const entry = createAuditEntry('case_created', 'user-a', 'case-1', 'Case created');
    expect(entry.hash).toBeDefined();
    expect(entry.hash.length).toBe(8);
  });

  it('verifies untampered audit entry', () => {
    const entry = createAuditEntry('approved', 'user-a', 'case-1', 'User approved');
    expect(verifyAuditIntegrity(entry).allowed).toBe(true);
  });

  it('detects tampered audit entry', () => {
    const entry = createAuditEntry('approved', 'user-a', 'case-1', 'User approved');
    entry.details = 'HACKED';
    const result = verifyAuditIntegrity(entry);
    expect(result.allowed).toBe(false);
    expect(result.code).toBe('AUDIT_TAMPER');
  });

  it('hash is deterministic', () => {
    const hash1 = computeAuditHash({
      timestamp: '2026-01-01T00:00:00Z',
      action: 'test',
      userId: 'user-a',
      caseId: 'case-1',
      details: 'test',
    });
    const hash2 = computeAuditHash({
      timestamp: '2026-01-01T00:00:00Z',
      action: 'test',
      userId: 'user-a',
      caseId: 'case-1',
      details: 'test',
    });
    expect(hash1).toBe(hash2);
  });

  it('different inputs produce different hashes', () => {
    const hash1 = computeAuditHash({
      timestamp: '2026-01-01T00:00:00Z',
      action: 'test',
      userId: 'user-a',
      caseId: 'case-1',
      details: 'test',
    });
    const hash2 = computeAuditHash({
      timestamp: '2026-01-01T00:00:00Z',
      action: 'test',
      userId: 'user-b',
      caseId: 'case-1',
      details: 'test',
    });
    expect(hash1).not.toBe(hash2);
  });
});

describe('Security: Log Sanitization', () => {
  it('redacts SSN', () => {
    const log = 'User SSN is 123-45-6789';
    expect(sanitizeForLog(log)).toBe('User SSN is [REDACTED]');
  });

  it('redacts receipt numbers', () => {
    const log = 'Receipt: MSC1234567890';
    expect(sanitizeForLog(log)).toContain('[REDACTED]');
  });

  it('redacts alien numbers', () => {
    const log = 'Alien: A123456789';
    expect(sanitizeForLog(log)).toContain('[REDACTED]');
  });

  it('does not redact non-sensitive data', () => {
    expect(sanitizeForLog('Case created for user')).toBe('Case created for user');
  });
});

describe('Security: Secure URLs', () => {
  it('generates URL with token and expiry', () => {
    const url = generateSecureDocumentUrl('doc-1', 'user-a');
    expect(url).toContain('token=');
    expect(url).toContain('expires=');
  });

  it('validates correct secure URL', () => {
    const url = generateSecureDocumentUrl('doc-1', 'user-a');
    const token = new URLSearchParams(url.split('?')[1]).get('token')!;
    const expires = parseInt(new URLSearchParams(url.split('?')[1]).get('expires')!);
    expect(validateSecureUrl(token, expires, 'doc-1', 'user-a').allowed).toBe(true);
  });

  it('rejects expired URL', () => {
    const url = generateSecureDocumentUrl('doc-1', 'user-a');
    const token = new URLSearchParams(url.split('?')[1]).get('token')!;
    const expires = parseInt(new URLSearchParams(url.split('?')[1]).get('expires')!);
    expect(validateSecureUrl(token, expires - 10000, 'doc-1', 'user-a').allowed).toBe(false);
  });

  it('rejects wrong token', () => {
    const url = generateSecureDocumentUrl('doc-1', 'user-a');
    const expires = parseInt(new URLSearchParams(url.split('?')[1]).get('expires')!);
    expect(validateSecureUrl('wrong-token', expires, 'doc-1', 'user-a').allowed).toBe(false);
  });
});

describe('Security: Cross-User Attack Scenarios', () => {
  it('user A cannot access user B case even with correct caseId format', () => {
    const attacker: AuthenticatedUser = { id: 'user-a', role: 'user' };
    const victimCase: CaseRef = { caseId: 'case-belonging-to-b', ownerUserId: 'user-b' };
    expect(authorizeCaseAccess(attacker, victimCase).allowed).toBe(false);
  });

  it('user A cannot approve user B case', () => {
    expect(authorizeApproval(USER_A, CASE_B, 'user_review').allowed).toBe(false);
  });

  it('user A cannot pay for user B case', () => {
    expect(authorizePayment(USER_A, CASE_B, 'checkout_pending').allowed).toBe(false);
  });

  it('user A cannot trigger fulfillment for user B case', () => {
    expect(authorizeFulfillment(USER_A, CASE_B, 'paid').allowed).toBe(false);
  });

  it('user A cannot access user B documents via AI context', () => {
    const context = buildIsolatedAIContext(USER_A, ['case-a'], ['doc-a']);
    expect(validateAIContextAccess(context, 'case-b').allowed).toBe(false);
  });
});
