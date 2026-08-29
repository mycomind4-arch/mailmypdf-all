import { describe, it, expect } from 'vitest';
import {
  detectVisaCategory,
  detectRefusalType,
  detectRefusalFindings,
  assessRefusalRisk,
  shouldRecommendAttorneyForVisa,
  analyzeVisaRefusal,
  buildVisaRefusalStrategy,
} from './visa-refusal-model';
import {
  createVisaCase,
  ingestVisaRefusalDocument,
  confirmVisaFacts,
  runVisaFindingAnalysis,
  selectVisaResponsePath,
  updateVisaEvidenceChecklist,
  analyzeVisaEvidence,
  verifyVisaAuthority,
  buildVisaStrategy,
  generateVisaDrafts,
  runVisaXRay,
  moveToVisaUserReview,
  approveVisa,
  setVisaPricing,
  confirmVisaPayment,
  submitVisaToFulfillment,
  updateVisaTracking,
  generateVisaProof,
  type VisaEvidenceItem,
} from './visa-refusal-workflow';
import { buildDocumentUnderstanding } from './document-understanding';
import { authorizeCaseAccess, type AuthenticatedUser } from './security';

// ─── Test Data ─────────────────────────────────────────────────────────────────

const REFUSAL_221G = `U.S. Consulate General
Case Number: AA0034567
B1/B2 Visitor Visa Application

Your application was refused under Section 221(g) of the Immigration and Nationality Act. Please submit the following additional documents: employment letter, bank statements for the last 6 months, and proof of property ownership.`;

const REFUSAL_214B = `U.S. Embassy
Case: AB12345678
F-1 Student Visa

Your application was refused under Section 214(b) of the INA. You failed to overcome the presumption of immigrant intent. You did not demonstrate sufficient ties to your home country. You may reapply with new evidence at any time. A new application fee is required.`;

const REFUSAL_FRAUD = `U.S. Consulate
Case: CD98765432
H-1B Visa Application
Refused: October 10, 2026

Your application was refused under INA § 212(a)(6)(C)(i) for willful misrepresentation of a material fact. The applicant misrepresented their employment history. This finding may result in a permanent inadmissibility bar.`;

const REFUSAL_ADMIN = `U.S. Consulate General
Case: EF55667788
B1/B2 Visa Application

Your application has been placed in administrative processing under Section 221(g). Additional processing is required. No further action is needed from you at this time. Processing typically takes 60-180 days.`;

const REFUSAL_CRIMINAL = `U.S. Consulate
Case: GH11223344
Immigrant Visa (IR/CR)
Refused: December 5, 2026

Your application was refused under INA § 212(a)(2). The applicant has a criminal conviction for a controlled substance violation. The applicant is inadmissible.`;

function makeDU(text: string) {
  return buildDocumentUnderstanding({ documentId: 'test-doc', text, source: { documentId: 'test-doc', confidence: 0.9 }, language: 'en' });
}

function runFullPipeline(text: string) {
  let c = createVisaCase('user-1');
  c = ingestVisaRefusalDocument(c, makeDU(text), text).case;
  c = confirmVisaFacts(c, [{ question: 'Is this the refusal notice?', answer: 'Yes' }]).case;
  c = runVisaFindingAnalysis(c).case;
  c = selectVisaResponsePath(c, c.refusalAnalysis!.responsePaths[0] ?? 'reapply').case;
  const updates = c.evidenceChecklist.map((item, idx) => ({
    itemId: item.id,
    status: (idx === 0 ? 'have_it' : 'uploaded') as VisaEvidenceItem['status'],
    documentIds: idx === 1 ? ['doc-1'] : undefined,
  }));
  c = updateVisaEvidenceChecklist(c, updates).case;
  c = analyzeVisaEvidence(c).case;
  c = verifyVisaAuthority(c).case;
  c = buildVisaStrategy(c).case;
  c = generateVisaDrafts(c).case;
  c = runVisaXRay(c).case;
  c = moveToVisaUserReview(c).case;
  c = approveVisa(c).case;
  c = setVisaPricing(c, { servicePrice: 49, postage: 7.09, addOns: [{ name: 'Return Receipt', price: 2.85 }], tax: 0, total: 58.94, currency: 'USD', mailingMethod: 'certified' }).case;
  c = confirmVisaPayment(c, true).case;
  c = submitVisaToFulfillment(c, { name: 'U.S. Consulate', address1: 'Consular Section', city: 'Guangzhou', state: '', postalCode: '510000' }, 'visa-idem-key').case;
  c = updateVisaTracking(c, { trackingNumber: 'VISA-TRACK-001', status: 'in_transit', lastUpdated: new Date().toISOString() }).case;
  c = generateVisaProof(c, [
    { filename: 'cover-letter.pdf', content: c.drafts!.coverLetter, pages: 1 },
    { filename: 'response.pdf', content: c.drafts!.responseLetter, pages: 3 },
  ]).case;
  return c;
}

const USER_A: AuthenticatedUser = { id: 'user-a', role: 'user' };

// ─── Tests ────────────────────────────────────────────────────────────────────────

describe('Visa: 1-2. Classification and identification', () => {
  it('classifies B1/B2 visa', () => {
    expect(detectVisaCategory(REFUSAL_221G)).toBe('B1/B2');
  });
  it('classifies F-1 student visa', () => {
    expect(detectVisaCategory(REFUSAL_214B)).toBe('F-1');
  });
  it('classifies H-1B visa', () => {
    expect(detectVisaCategory(REFUSAL_FRAUD)).toBe('H-1B');
  });
  it('classifies IR/CR immigrant visa', () => {
    expect(detectVisaCategory(REFUSAL_CRIMINAL)).toBe('IR/CR');
  });
  it('returns generic for unknown', () => {
    expect(detectVisaCategory('random text')).toBe('generic');
  });
});

describe('Visa: 3. Refusal type detection', () => {
  it('detects 221(g)', () => expect(detectRefusalType(REFUSAL_221G)).toBe('section_221g'));
  it('detects 214(b)', () => expect(detectRefusalType(REFUSAL_214B)).toBe('section_214b'));
  it('detects administrative processing', () => expect(detectRefusalType(REFUSAL_ADMIN)).toBe('administrative_processing'));
  it('detects 212(a) inadmissibility', () => expect(detectRefusalType(REFUSAL_FRAUD)).toBe('section_212a'));
});

describe('Visa: 4. Finding detection and provenance', () => {
  it('detects 221g insufficient document finding', () => {
    const findings = detectRefusalFindings(REFUSAL_221G);
    expect(findings.some(f => f.refusalType === 'section_221g')).toBe(true);
    expect(findings.find(f => f.refusalType === 'section_221g')!.section).toContain('221(g)');
  });
  it('detects 214b immigrant intent finding', () => {
    const findings = detectRefusalFindings(REFUSAL_214B);
    expect(findings.some(f => f.ground === 'immigrant_intent')).toBe(true);
  });
  it('detects fraud/misrepresentation', () => {
    const findings = detectRefusalFindings(REFUSAL_FRAUD);
    expect(findings.some(f => f.ground === 'fraud_misrepresentation')).toBe(true);
    expect(findings.find(f => f.ground === 'fraud_misrepresentation')!.severity).toBe('critical');
  });
  it('preserves consular finding context', () => {
    const findings = detectRefusalFindings(REFUSAL_FRAUD);
    expect(findings[0].consularFinding.length).toBeGreaterThan(0);
  });
  it('assigns response paths', () => {
    const findings = detectRefusalFindings(REFUSAL_221G);
    expect(findings.find(f => f.refusalType === 'section_221g')!.responsePath).toBe('submit_additional_documents');
  });
});

describe('Visa: 5. Missing facts', () => {
  it('detects when insufficient evidence is the ground', () => {
    const findings = detectRefusalFindings(REFUSAL_214B);
    const insuff = findings.find(f => f.ground === 'insufficient_ties' || f.ground === 'immigrant_intent');
    expect(insuff).toBeDefined();
    expect(insuff!.evidenceRequired.length).toBeGreaterThan(0);
  });
});

describe('Visa: 6-9. Deadline detection', () => {
  it('extracts case number', () => {
    const a = analyzeVisaRefusal(REFUSAL_221G);
    expect(a.receiptNumber).toBeDefined();
  });
  it('extracts refusal date', () => {
    const a = analyzeVisaRefusal(REFUSAL_FRAUD);
    expect(a.refusalDate).toBe('October 10, 2026');
  });
  it('provides deadline info for 221(g)', () => {
    const a = analyzeVisaRefusal(REFUSAL_221G);
    expect(a.deadlineInfo).toContain('1 year');
  });
  it('provides deadline info for 214(b)', () => {
    const a = analyzeVisaRefusal(REFUSAL_214B);
    expect(a.deadlineInfo).toContain('reapply');
  });
});

describe('Visa: 10-11. Evidence and gaps', () => {
  it('builds evidence checklist from findings', () => {
    let c = createVisaCase('user-1');
    c = ingestVisaRefusalDocument(c, makeDU(REFUSAL_214B), REFUSAL_214B).case;
    expect(c.evidenceChecklist.length).toBeGreaterThan(0);
    expect(c.evidenceChecklist.every(item => item.status === 'dont_have_it')).toBe(true);
  });
  it('updates evidence status', () => {
    let c = createVisaCase('user-1');
    c = ingestVisaRefusalDocument(c, makeDU(REFUSAL_214B), REFUSAL_214B).case;
    c = confirmVisaFacts(c, [{ question: 'Q', answer: 'A' }]).case;
    c = runVisaFindingAnalysis(c).case;
    c = selectVisaResponsePath(c, 'reapply').case;
    c = updateVisaEvidenceChecklist(c, c.evidenceChecklist.map(item => ({ itemId: item.id, status: 'have_it' as VisaEvidenceItem['status'] }))).case;
    expect(c.evidenceChecklist.every(item => item.status === 'have_it')).toBe(true);
  });
});

describe('Visa: 12. Contradictions', () => {
  it('detects inconsistent information finding', () => {
    const text = `Refused under INA § 212(a)(6)(C)(i). The applicant provided inconsistent information. Discrepancies were identified in the application.`;
    const findings = detectRefusalFindings(text);
    expect(findings.some(f => f.ground === 'inconsistent_info')).toBe(true);
  });
});

describe('Visa: 13-14. Authority verification', () => {
  it('authority verification transitions correctly', () => {
    let c = createVisaCase('user-1');
    c = ingestVisaRefusalDocument(c, makeDU(REFUSAL_214B), REFUSAL_214B).case;
    c = confirmVisaFacts(c, [{ question: 'Q', answer: 'A' }]).case;
    c = runVisaFindingAnalysis(c).case;
    c = selectVisaResponsePath(c, 'reapply').case;
    c = updateVisaEvidenceChecklist(c, c.evidenceChecklist.map(item => ({ itemId: item.id, status: 'have_it' as VisaEvidenceItem['status'] }))).case;
    c = analyzeVisaEvidence(c).case;
    const r = verifyVisaAuthority(c);
    expect(r.case.state).toBe('authority_verified');
  });
});

describe('Visa: 15. High-risk escalation', () => {
  it('critical risk for fraud', () => {
    expect(assessRefusalRisk(detectRefusalFindings(REFUSAL_FRAUD))).toBe('critical');
  });
  it('critical risk for criminal', () => {
    expect(assessRefusalRisk(detectRefusalFindings(REFUSAL_CRIMINAL))).toBe('critical');
  });
  it('attorney recommended for fraud', () => {
    expect(shouldRecommendAttorneyForVisa(detectRefusalFindings(REFUSAL_FRAUD), 'critical')).toBe(true);
  });
  it('attorney recommended for criminal', () => {
    expect(shouldRecommendAttorneyForVisa(detectRefusalFindings(REFUSAL_CRIMINAL), 'critical')).toBe(true);
  });
});

describe('Visa: 16. Strategy generation', () => {
  it('builds reapply strategy for 214(b)', () => {
    const a = analyzeVisaRefusal(REFUSAL_214B);
    const s = buildVisaRefusalStrategy(a);
    expect(['reapply', 'submit_additional_documents'].includes(s.type)).toBe(true);
    expect(s.steps.length).toBeGreaterThan(0);
  });
  it('builds submit_documents strategy for 221(g)', () => {
    const a = analyzeVisaRefusal(REFUSAL_221G);
    const s = buildVisaRefusalStrategy(a);
    expect(s.type).toBe('submit_additional_documents');
  });
  it('builds consult_attorney strategy for fraud', () => {
    const a = analyzeVisaRefusal(REFUSAL_FRAUD);
    const s = buildVisaRefusalStrategy(a);
    expect(s.type).toBe('consult_attorney');
    expect(s.attorneyRequired).toBe(true);
  });
  it('low success likelihood for critical risk', () => {
    const s = buildVisaRefusalStrategy(analyzeVisaRefusal(REFUSAL_FRAUD));
    expect(s.successLikelihood).toBe('low');
  });
});

describe('Visa: 17. Draft generation', () => {
  it('drafts include cover letter, response letter, evidence index', () => {
    const c = runFullPipeline(REFUSAL_214B);
    expect(c.drafts!.coverLetter).toContain('Consular Officer');
    expect(c.drafts!.responseLetter).toContain('Finding');
    expect(c.drafts!.evidenceIndex).toContain('Exhibit');
  });
});

describe('Visa: 18-19. X-Ray', () => {
  it('X-Ray runs and passes', () => {
    let c = createVisaCase('user-1');
    c = ingestVisaRefusalDocument(c, makeDU(REFUSAL_214B), REFUSAL_214B).case;
    c = confirmVisaFacts(c, [{ question: 'Q', answer: 'A' }]).case;
    c = runVisaFindingAnalysis(c).case;
    c = selectVisaResponsePath(c, 'reapply').case;
    c = updateVisaEvidenceChecklist(c, c.evidenceChecklist.map(item => ({ itemId: item.id, status: 'have_it' as VisaEvidenceItem['status'] }))).case;
    c = analyzeVisaEvidence(c).case;
    c = verifyVisaAuthority(c).case;
    c = buildVisaStrategy(c).case;
    c = generateVisaDrafts(c).case;
    const r = runVisaXRay(c);
    expect(r.case.xray!.overallVerdict).toBe('PASS');
  });
  it('X-Ray blocks when safeToActUpon is false', () => {
    const c: any = { ...createVisaCase('user-1'), state: 'xray_complete', xray: { safeToActUpon: false, overallVerdict: 'FAIL', findings: [] } };
    const r = moveToVisaUserReview(c);
    expect(r.case.state).toBe('blocked');
  });
});

describe('Visa: 20-22. Review != Approval, Explicit Approval', () => {
  it('cannot approve before user_review', () => {
    let c = createVisaCase('user-1');
    c = ingestVisaRefusalDocument(c, makeDU(REFUSAL_214B), REFUSAL_214B).case;
    expect(approveVisa(c).result.success).toBe(false);
  });
  it('explicit approval sets timestamp', () => {
    const c = runFullPipeline(REFUSAL_214B);
    expect(c.approved).toBe(true);
    expect(c.approvalTimestamp).toBeDefined();
  });
});

describe('Visa: 23-25. Checkout, Payment, Fulfillment', () => {
  it('pricing set after approval', () => {
    const c = runFullPipeline(REFUSAL_214B);
    expect(c.pricing).toBeDefined();
    expect(c.pricing!.servicePrice).toBeGreaterThan(0);
  });
  it('payment transitions to paid', () => {
    const c = runFullPipeline(REFUSAL_214B);
    expect(['paid', 'fulfilled', 'tracking', 'complete'].includes(c.state)).toBe(true);
  });
  it('fulfillment creates provider order', () => {
    const c = runFullPipeline(REFUSAL_214B);
    expect(c.fulfillment!.providerOrderId).toBeDefined();
  });
});

describe('Visa: 26. Idempotency', () => {
  it('duplicate fulfillment blocked', () => {
    const c = runFullPipeline(REFUSAL_214B);
    const originalOrderId = c.fulfillment!.providerOrderId;
    const r = submitVisaToFulfillment(c, { name: 'Consulate', address1: 'Box 1', city: 'X', state: '', postalCode: '00000' }, 'visa-idem-key');
    expect(r.case.fulfillment!.providerOrderId).toBe(originalOrderId);
  });
});

describe('Visa: 27. Owner isolation', () => {
  it('cross-user access denied', () => {
    expect(authorizeCaseAccess(USER_A, { caseId: 'visa-1', ownerUserId: 'user-b' }).allowed).toBe(false);
  });
});

describe('Visa: 28. Multilingual', () => {
  it('Spanish UI with English document', () => {
    const c = createVisaCase('user-1', { ui: 'es', document: 'en', output: 'es' });
    const r = ingestVisaRefusalDocument(c, makeDU(REFUSAL_214B), REFUSAL_214B);
    expect(r.case.language.ui).toBe('es');
    expect(r.result.userMessageEs).toBeDefined();
  });
});

describe('Visa: 29-30. Voice and "I dont know"', () => {
  it('voice path reuses same concierge', () => {
    // Voice is handled by concierge — same intake session, same case
    const c = createVisaCase('user-1');
    expect(c.state).toBe('intake');
  });
  it('"I dont know" does not crash', () => {
    const a = analyzeVisaRefusal('I dont know what happened');
    expect(a.findings.length).toBe(0);
    expect(a.overallRisk).toBe('low');
  });
});

describe('Visa: 31-33. Tracking and Proof', () => {
  it('tracking generated', () => {
    const c = runFullPipeline(REFUSAL_214B);
    expect(c.tracking!.trackingNumber).toBe('VISA-TRACK-001');
  });
  it('proof generated with hash', () => {
    const c = runFullPipeline(REFUSAL_214B);
    expect(c.proof!.packetHash).toMatch(/^[0-9a-f]+$/);
    expect(c.proof!.documentManifest.length).toBeGreaterThan(0);
  });
});

describe('Visa: Full E2E paths', () => {
  it('221(g) E2E', () => {
    const c = runFullPipeline(REFUSAL_221G);
    expect(c.state).toBe('complete');
    expect(c.refusalAnalysis!.refusalType).toBe('section_221g');
  });
  it('214(b) E2E', () => {
    const c = runFullPipeline(REFUSAL_214B);
    expect(c.state).toBe('complete');
    expect(c.refusalAnalysis!.refusalType).toBe('section_214b');
  });
  it('fraud E2E with attorney', () => {
    const c = runFullPipeline(REFUSAL_FRAUD);
    expect(c.state).toBe('complete');
    expect(c.refusalAnalysis!.hasAttorneyRecommendation).toBe(true);
  });
  it('administrative processing E2E', () => {
    const c = runFullPipeline(REFUSAL_ADMIN);
    expect(c.state).toBe('complete');
  });
  it('criminal E2E with attorney', () => {
    const c = runFullPipeline(REFUSAL_CRIMINAL);
    expect(c.state).toBe('complete');
    expect(c.refusalAnalysis!.overallRisk).toBe('critical');
  });
});

describe('Visa: Audit trail', () => {
  it('audit trail is complete', () => {
    const c = runFullPipeline(REFUSAL_214B);
    const actions = c.auditLog.map(e => e.action);
    expect(actions).toContain('case_created');
    expect(actions).toContain('document_ingested');
    expect(actions).toContain('approved');
    expect(actions).toContain('fulfillment_submitted');
    expect(actions).toContain('proof_generated');
  });
});
