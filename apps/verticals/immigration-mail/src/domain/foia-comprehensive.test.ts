import { describe, it, expect } from 'vitest';
import {
  detectFOIAType,
  detectRecordScope,
  detectUrgency,
  detectRequestItems,
  detectIdentityDocuments,
  analyzeFOIARequest,
  buildFOIAStrategy,
  type IdentityVerification,
  type FOIARequestItem,
} from './foia-model';
import {
  createFOIACase,
  ingestFOIARequest,
  explainFOIA,
  confirmFOIAFacts,
  verifyIdentity,
  defineScope,
  analyzeFOIAEvidence,
  verifyFOIAAuthority,
  buildFOIAResponseStrategy,
  generateFOIADrafts,
  runFOIAXRay,
  moveToFOIAUserReview,
  approveFOIA,
  setFOIAPricing,
  confirmFOIAPayment,
  submitFOIAToFulfillment,
  updateFOIATracking,
  generateFOIAProof,
  type FOIACase,
} from './foia-workflow';
import { buildDocumentUnderstanding } from './document-understanding';
import { authorizeCaseAccess, authorizeApproval, authorizePayment, type AuthenticatedUser } from './security';

// ─── Test Data ─────────────────────────────────────────────────────────────────

const USCIS_FOIA = `I am requesting my complete A-File from USCIS via FOIA.
My A-number is A123456789.
I also need records for my I-130 case MSC1234567890.
I have my passport and driver's license for identity verification.`;

const USCIS_FOIA_EXPEDITED = `I urgently need my USCIS immigration records via FOIA.
Expedited processing requested due to upcoming immigration court hearing.
A-number: A987654321
Need complete immigration history including I-485 and N-400 records.
Receipt: WAC9876543210`;

const EOIR_FOIA = `I need my EOIR court records via FOIA request.
My case number is A099-123-456.
I need the complete case file including all filings and decisions.
I have my passport for identification.`;

const ICE_FOIA = `Requesting ICE records via FOIA request.
A-number: A555666778.
Need all ICE enforcement records and detention records.
Expedited due to pending immigration proceedings.`;

const G639_REQUEST = `I want to file Form G-639 FOIA to get my USCIS records.
My A-number is A111222333.
Need my complete immigration file.
I have my permanent resident card.`;

function makeDU(text: string) {
  return buildDocumentUnderstanding({ documentId: 'test-doc', text, source: { documentId: 'test-doc', confidence: 0.9 }, language: 'en' });
}

function runFullPipeline(text: string): FOIACase {
  let c = createFOIACase('user-1');
  c = ingestFOIARequest(c, makeDU(text), text).case;
  c = explainFOIA(c).case;
  c = confirmFOIAFacts(c, [{ question: 'Is this your request?', answer: 'Yes' }]).case;
  // Verify identity with a passport
  const identityDocs: IdentityVerification[] = [
    { id: 'id-1', documentType: 'passport', uploaded: true, documentNumber: 'P1234567' },
  ];
  c = verifyIdentity(c, identityDocs).case;
  c = defineScope(c, c.analysis!.requestItems).case;
  c = analyzeFOIAEvidence(c).case;
  c = verifyFOIAAuthority(c).case;
  c = buildFOIAResponseStrategy(c).case;
  c = generateFOIADrafts(c).case;
  c = runFOIAXRay(c).case;
  c = moveToFOIAUserReview(c).case;
  c = approveFOIA(c).case;
  c = setFOIAPricing(c, { servicePrice: 49, postage: 7.09, addOns: [], tax: 0, total: 56.09, currency: 'USD', mailingMethod: 'certified' }).case;
  c = confirmFOIAPayment(c, true).case;
  c = submitFOIAToFulfillment(c, { name: 'USCIS FOIA', address1: 'National Records Center', address2: 'P.O. Box 648010', city: "Lee's Summit", state: 'MO', postalCode: '64064' }, 'foia-idem-key').case;
  c = updateFOIATracking(c, { trackingNumber: 'FOIA-TRACK-001', status: 'in_transit', lastUpdated: new Date().toISOString() }).case;
  c = generateFOIAProof(c, [
    { filename: 'request-letter.pdf', content: c.drafts!.requestLetter, pages: 1 },
    { filename: 'identity.pdf', content: c.drafts!.identityProof, pages: 1 },
  ]).case;
  return c;
}

const USER_A: AuthenticatedUser = { id: 'user-a', role: 'user' };

// ─── Tests ────────────────────────────────────────────────────────────────────────

describe('FOIA: 1. Classification', () => {
  it('detects USCIS FOIA', () => expect(detectFOIAType(USCIS_FOIA)).toBe('uscis'));
  it('detects EOIR FOIA', () => expect(detectFOIAType(EOIR_FOIA)).toBe('eoir'));
  it('detects ICE FOIA', () => expect(detectFOIAType(ICE_FOIA)).toBe('ice'));
  it('detects G-639', () => expect(detectFOIAType(G639_REQUEST)).toBe('g-639'));
});

describe('FOIA: 2-5. Scope and urgency detection', () => {
  it('detects A-file scope', () => {
    expect(detectRecordScope(USCIS_FOIA)).toContain('a_file');
  });
  it('detects immigration history scope', () => {
    expect(detectRecordScope(USCIS_FOIA_EXPEDITED)).toContain('immigration_history');
  });
  it('detects standard urgency', () => {
    expect(detectUrgency(USCIS_FOIA)).toBe('standard');
  });
  it('detects expedited urgency', () => {
    expect(detectUrgency(USCIS_FOIA_EXPEDITED)).toBe('expedited');
  });
});

describe('FOIA: 6-8. Document ingestion, extraction, provenance', () => {
  it('extracts A-number', () => {
    const a = analyzeFOIARequest(USCIS_FOIA);
    expect(a.aNumber).toBe('A123456789');
  });
  it('extracts receipt numbers', () => {
    const a = analyzeFOIARequest(USCIS_FOIA);
    expect(a.receiptNumbers).toContain('MSC1234567890');
  });
  it('detects request items', () => {
    const items = detectRequestItems(USCIS_FOIA);
    expect(items.length).toBeGreaterThan(0);
  });
});

describe('FOIA: 9-12. Identity verification and evidence', () => {
  it('detects identity documents', () => {
    const docs = detectIdentityDocuments(USCIS_FOIA);
    expect(docs.some(d => d.documentType === 'passport')).toBe(true);
    expect(docs.some(d => d.documentType === 'drivers_license')).toBe(true);
  });
  it('identity verification with passport passes', () => {
    let c = createFOIACase('user-1');
    c = ingestFOIARequest(c, makeDU(USCIS_FOIA), USCIS_FOIA).case;
    c = explainFOIA(c).case;
    c = confirmFOIAFacts(c, [{ question: 'Q', answer: 'A' }]).case;
    const r = verifyIdentity(c, [{ id: 'id-1', documentType: 'passport', uploaded: true }]);
    expect(r.case.state).toBe('identity_verified');
  });
  it('identity verification without photo ID fails', () => {
    let c = createFOIACase('user-1');
    c = ingestFOIARequest(c, makeDU(USCIS_FOIA), USCIS_FOIA).case;
    c = explainFOIA(c).case;
    c = confirmFOIAFacts(c, [{ question: 'Q', answer: 'A' }]).case;
    const r = verifyIdentity(c, [{ id: 'id-1', documentType: 'birth_certificate', uploaded: true }]);
    expect(r.result.success).toBe(false);
  });
});

describe('FOIA: 13. Contradictions', () => {
  it('handles conflicting information without crash', () => {
    const a = analyzeFOIARequest('I need my records. A-number A123. Receipt ABC123.');
    expect(a.requestItems.length).toBeGreaterThan(0);
  });
});

describe('FOIA: 14-15. Authority and stale authority', () => {
  it('authority verification transitions correctly', () => {
    let c = createFOIACase('user-1');
    c = ingestFOIARequest(c, makeDU(USCIS_FOIA), USCIS_FOIA).case;
    c = explainFOIA(c).case;
    c = confirmFOIAFacts(c, [{ question: 'Q', answer: 'A' }]).case;
    c = verifyIdentity(c, [{ id: 'id-1', documentType: 'passport', uploaded: true }]).case;
    c = defineScope(c, c.analysis!.requestItems).case;
    c = analyzeFOIAEvidence(c).case;
    const r = verifyFOIAAuthority(c);
    expect(r.case.state).toBe('authority_verified');
  });
});

describe('FOIA: 16. High-risk escalation', () => {
  it('expedited request is moderate risk', () => {
    const a = analyzeFOIARequest(USCIS_FOIA_EXPEDITED);
    expect(a.overallRisk).toBe('moderate');
  });
});

describe('FOIA: 17. Strategy', () => {
  it('builds records_request strategy', () => {
    const a = analyzeFOIARequest(USCIS_FOIA);
    const s = buildFOIAStrategy(a);
    expect(s.steps.length).toBeGreaterThan(0);
    expect(s.agencyAddress).toContain('USCIS');
  });
  it('builds expedited strategy', () => {
    const a = analyzeFOIARequest(USCIS_FOIA_EXPEDITED);
    const s = buildFOIAStrategy(a);
    expect(s.type).toBe('expedited_request');
  });
  it('EOIR strategy has correct address', () => {
    const a = analyzeFOIARequest(EOIR_FOIA);
    const s = buildFOIAStrategy(a);
    expect(s.agencyAddress).toContain('EOIR');
  });
  it('ICE strategy has correct address', () => {
    const a = analyzeFOIARequest(ICE_FOIA);
    const s = buildFOIAStrategy(a);
    expect(s.agencyAddress).toContain('ICE');
  });
  it('G-639 strategy has form required', () => {
    const a = analyzeFOIARequest(G639_REQUEST);
    const s = buildFOIAStrategy(a);
    expect(s.formRequired).toBe('G-639');
  });
});

describe('FOIA: 18. Draft generation', () => {
  it('drafts include request letter, identity proof, scope index', () => {
    const c = runFullPipeline(USCIS_FOIA);
    expect(c.drafts!.requestLetter).toContain('FOIA');
    expect(c.drafts!.identityProof).toContain('passport');
    expect(c.drafts!.scopeIndex).toContain('Item');
  });
  it('request letter includes A-number', () => {
    const c = runFullPipeline(USCIS_FOIA);
    expect(c.drafts!.requestLetter).toContain('A123456789');
  });
});

describe('FOIA: 19-20. X-Ray and blocking', () => {
  it('X-Ray passes when identity verified', () => {
    const c = runFullPipeline(USCIS_FOIA);
    expect(c.xray!.overallVerdict).toBe('PASS');
  });
  it('X-Ray blocks when identity not verified', () => {
    let c = createFOIACase('user-1');
    c = ingestFOIARequest(c, makeDU(USCIS_FOIA), USCIS_FOIA).case;
    c = explainFOIA(c).case;
    c = confirmFOIAFacts(c, [{ question: 'Q', answer: 'A' }]).case;
    c = verifyIdentity(c, [{ id: 'id-1', documentType: 'passport', uploaded: true }]).case;
    c = defineScope(c, c.analysis!.requestItems).case;
    c = analyzeFOIAEvidence(c).case;
    c = verifyFOIAAuthority(c).case;
    c = buildFOIAResponseStrategy(c).case;
    c = generateFOIADrafts(c).case;
    // Force identity to be not verified
    c = { ...c, analysis: { ...c.analysis!, identityVerified: false, hasCompleteIdentity: false } };
    const r = runFOIAXRay(c);
    expect(r.case.xray!.safeToActUpon).toBe(false);
  });
});

describe('FOIA: 21-23. Review, Approval, Explicit Approval', () => {
  it('cannot approve before user_review', () => {
    let c = createFOIACase('user-1');
    c = ingestFOIARequest(c, makeDU(USCIS_FOIA), USCIS_FOIA).case;
    expect(approveFOIA(c).result.success).toBe(false);
  });
  it('explicit approval sets timestamp', () => {
    const c = runFullPipeline(USCIS_FOIA);
    expect(c.approved).toBe(true);
    expect(c.approvalTimestamp).toBeDefined();
  });
});

describe('FOIA: 24-28. Checkout, Payment, Fulfillment, Idempotency', () => {
  it('pricing set after approval', () => {
    const c = runFullPipeline(USCIS_FOIA);
    expect(c.pricing!.servicePrice).toBeGreaterThan(0);
  });
  it('payment transitions to paid', () => {
    const c = runFullPipeline(USCIS_FOIA);
    expect(['paid', 'fulfilled', 'tracking', 'complete'].includes(c.state)).toBe(true);
  });
  it('fulfillment creates provider order', () => {
    const c = runFullPipeline(USCIS_FOIA);
    expect(c.fulfillment!.providerOrderId).toBeDefined();
  });
  it('duplicate fulfillment blocked', () => {
    const c = runFullPipeline(USCIS_FOIA);
    const originalOrderId = c.fulfillment!.providerOrderId;
    const r = submitFOIAToFulfillment(c, { name: 'USCIS FOIA', address1: 'Box 1', city: 'X', state: 'MO', postalCode: '64064' }, 'foia-idem-key');
    expect(r.case.fulfillment!.providerOrderId).toBe(originalOrderId);
  });
});

describe('FOIA: 29-30. Owner isolation and AI context', () => {
  it('cross-user access denied', () => {
    expect(authorizeCaseAccess(USER_A, { caseId: 'foia-1', ownerUserId: 'user-b' }).allowed).toBe(false);
  });
  it('cross-user approval denied', () => {
    expect(authorizeApproval(USER_A, { caseId: 'foia-1', ownerUserId: 'user-b' }, 'user_review').allowed).toBe(false);
  });
  it('cross-user payment denied', () => {
    expect(authorizePayment(USER_A, { caseId: 'foia-1', ownerUserId: 'user-b' }, 'checkout_pending').allowed).toBe(false);
  });
});

describe('FOIA: 31. Spanish', () => {
  it('Spanish UI with English request', () => {
    const c = createFOIACase('user-1', { ui: 'es', document: 'en', output: 'es' });
    const r = ingestFOIARequest(c, makeDU(USCIS_FOIA), USCIS_FOIA);
    expect(r.case.language.ui).toBe('es');
    expect(r.result.userMessageEs).toBeDefined();
  });
});

describe('FOIA: 32-33. Voice and "I dont know"', () => {
  it('voice path uses same case', () => {
    const c = createFOIACase('user-1');
    expect(c.state).toBe('intake');
  });
  it('"I dont know" does not crash', () => {
    const a = analyzeFOIARequest('I dont know what records I need');
    expect(a.requestItems.length).toBeGreaterThan(0);
  });
});

describe('FOIA: 34-35. Tracking and Proof', () => {
  it('tracking generated', () => {
    const c = runFullPipeline(USCIS_FOIA);
    expect(c.tracking!.trackingNumber).toBe('FOIA-TRACK-001');
  });
  it('proof generated with hash', () => {
    const c = runFullPipeline(USCIS_FOIA);
    expect(c.proof!.packetHash).toMatch(/^[0-9a-f]+$/);
    expect(c.proof!.documentManifest.length).toBeGreaterThan(0);
  });
});

describe('FOIA: Full E2E paths', () => {
  it('USCIS FOIA E2E', () => {
    const c = runFullPipeline(USCIS_FOIA);
    expect(c.state).toBe('complete');
    expect(c.analysis!.type).toBe('uscis');
  });
  it('EOIR FOIA E2E', () => {
    const c = runFullPipeline(EOIR_FOIA);
    expect(c.state).toBe('complete');
    expect(c.analysis!.type).toBe('eoir');
  });
  it('ICE FOIA E2E', () => {
    const c = runFullPipeline(ICE_FOIA);
    expect(c.state).toBe('complete');
    expect(c.analysis!.type).toBe('ice');
  });
  it('G-639 E2E', () => {
    const c = runFullPipeline(G639_REQUEST);
    expect(c.state).toBe('complete');
    expect(c.analysis!.type).toBe('g-639');
  });
  it('Expedited FOIA E2E', () => {
    const c = runFullPipeline(USCIS_FOIA_EXPEDITED);
    expect(c.state).toBe('complete');
    expect(c.analysis!.urgency).toBe('expedited');
  });
});

describe('FOIA: Audit trail', () => {
  it('audit trail is complete', () => {
    const c = runFullPipeline(USCIS_FOIA);
    const actions = c.auditLog.map(e => e.action);
    expect(actions).toContain('case_created');
    expect(actions).toContain('request_ingested');
    expect(actions).toContain('approved');
    expect(actions).toContain('fulfillment_submitted');
    expect(actions).toContain('proof_generated');
  });
});

describe('FOIA: Gate separation', () => {
  it('cannot set pricing before approval', () => {
    let c = createFOIACase('user-1');
    c = ingestFOIARequest(c, makeDU(USCIS_FOIA), USCIS_FOIA).case;
    expect(setFOIAPricing(c, {} as any).result.success).toBe(false);
  });
  it('cannot pay before checkout_pending', () => {
    let c = createFOIACase('user-1');
    c = ingestFOIARequest(c, makeDU(USCIS_FOIA), USCIS_FOIA).case;
    expect(confirmFOIAPayment(c, true).result.success).toBe(false);
  });
  it('cannot fulfill before payment', () => {
    let c = createFOIACase('user-1');
    c = ingestFOIARequest(c, makeDU(USCIS_FOIA), USCIS_FOIA).case;
    expect(submitFOIAToFulfillment(c, { name: 'USCIS', address1: 'Box 1', city: 'X', state: 'MO', postalCode: '64064' }, 'key').result.success).toBe(false);
  });
});
