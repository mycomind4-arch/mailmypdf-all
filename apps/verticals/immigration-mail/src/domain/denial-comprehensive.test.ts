import { describe, it, expect } from 'vitest';
import {
  detectDenialFormType,
  detectDenialFindings,
  analyzeResponsePaths,
  assessDenialRisk,
  shouldRecommendAttorneyForDenial,
  analyzeDenial,
  buildDenialStrategy,
  type DenialFinding,
} from './denial-model';
import {
  createDenialCase,
  ingestDenialDocument,
  confirmDenialFacts,
  runFindingAnalysis,
  selectResponsePath,
  updateDenialEvidenceChecklist,
  analyzeDenialEvidence,
  verifyDenialAuthority,
  buildDenialResponseStrategy,
  generateDenialDrafts,
  runDenialXRay,
  moveToDenialUserReview,
  approveDenial,
  setDenialPricing,
  confirmDenialPayment,
  submitDenialToFulfillment,
  updateDenialTracking,
  generateDenialProof,
  type DenialEvidenceItem,
} from './denial-workflow';
import { buildDocumentUnderstanding } from './document-understanding';
import {
  authorizeCaseAccess,
  authorizeApproval,
  type AuthenticatedUser,
  type CaseRef,
} from './security';

const DENIAL_I485 = `U.S. Citizenship and Immigration Services
Decision: Denial
I-485 Application to Register Permanent Residence
Receipt Number: MSC1234567890
Denied: November 1, 2026

USCIS finds that the applicant is inadmissible under INA § 212(a)(6)(C)(i) for willful misrepresentation of a material fact. The application is denied.

You may file Form I-290B within 33 days of this decision.`;

const DENIAL_I130 = `U.S. Citizenship and Immigration Services
Decision: Denial
I-130 Petition for Alien Relative
Receipt: WAC9876543210
Denied: October 15, 2026

USCIS finds that the evidence of bona fide marriage is insufficient. The petition is denied.

within 30 days`;

const DENIAL_INSUFFICIENT = `USCIS Decision: Denial
I-485 Application
Receipt: LIN1112223334
Denied: September 20, 2026

The evidence submitted is insufficient to establish eligibility. The application is denied.

within 33 days`;

const DENIAL_CRIMINAL = `USCIS Decision: Denial
N-400 Application for Naturalization
Receipt: NBC9998887770
Denied: December 1, 2026

USCIS finds that the applicant has a criminal conviction for a controlled substance violation. The applicant is inadmissible under INA § 212(a)(2). The application is denied.

within 33 days`;

function makeDU(text: string) {
  return buildDocumentUnderstanding({ documentId: 'test-doc', text, source: { documentId: 'test-doc', confidence: 0.9 }, language: 'en' });
}

function runFullPipeline(text: string) {
  let c = createDenialCase('user-1');
  c = ingestDenialDocument(c, makeDU(text), text).case;
  c = confirmDenialFacts(c, [{ question: 'Is this the denial notice?', answer: 'Yes' }]).case;
  c = runFindingAnalysis(c).case;
  c = selectResponsePath(c, c.denialAnalysis!.responsePaths[0] ?? 'appeal').case;
  const updates = c.evidenceChecklist.map((item, idx) => ({
    itemId: item.id,
    status: (idx === 0 ? 'have_it' : 'uploaded') as DenialEvidenceItem['status'],
    documentIds: idx === 1 ? ['doc-1'] : undefined,
  }));
  c = updateDenialEvidenceChecklist(c, updates).case;
  c = analyzeDenialEvidence(c).case;
  c = verifyDenialAuthority(c).case;
  c = buildDenialResponseStrategy(c).case;
  c = generateDenialDrafts(c).case;
  c = runDenialXRay(c).case;
  c = moveToDenialUserReview(c).case;
  c = approveDenial(c).case;
  c = setDenialPricing(c, { servicePrice: 149, postage: 7.09, addOns: [{ name: 'Return Receipt', price: 2.85 }], tax: 0, total: 158.94, currency: 'USD', mailingMethod: 'certified' }).case;
  c = confirmDenialPayment(c, true).case;
  c = submitDenialToFulfillment(c, { name: 'AAO', address1: 'P.O. Box 836899', city: 'Dallas', state: 'TX', postalCode: '75283' }, 'denial-idem-key').case;
  c = updateDenialTracking(c, { trackingNumber: 'DENIAL-TRACK-001', status: 'in_transit', lastUpdated: new Date().toISOString() }).case;
  c = generateDenialProof(c, [
    { filename: 'cover-letter.pdf', content: c.drafts!.coverLetter, pages: 1 },
    { filename: 'appeal-brief.pdf', content: c.drafts!.appealBrief, pages: 5 },
  ]).case;
  return c;
}

const USER_A: AuthenticatedUser = { id: 'user-a', role: 'user' };

describe('Denial: Form Type Detection', () => {
  it('detects I-485', () => expect(detectDenialFormType(DENIAL_I485)).toBe('I-485'));
  it('detects I-130', () => expect(detectDenialFormType(DENIAL_I130)).toBe('I-130'));
  it('detects N-400', () => expect(detectDenialFormType(DENIAL_CRIMINAL)).toBe('N-400'));
  it('returns generic for unknown', () => expect(detectDenialFormType('Random text')).toBe('generic'));
});

describe('Denial: Finding Detection', () => {
  it('detects fraud/misrepresentation in I-485 denial', () => {
    const findings = detectDenialFindings(DENIAL_I485);
    expect(findings.some(f => f.category === 'fraud_misrepresentation')).toBe(true);
    expect(findings.find(f => f.category === 'fraud_misrepresentation')!.severity).toBe('critical');
  });
  it('detects insufficient evidence in I-130 denial', () => {
    const findings = detectDenialFindings(DENIAL_I130);
    expect(findings.some(f => f.category === 'insufficient_evidence')).toBe(true);
  });
  it('detects criminal grounds', () => {
    const findings = detectDenialFindings(DENIAL_CRIMINAL);
    expect(findings.some(f => f.category === 'criminal_ground')).toBe(true);
  });
  it('assigns response paths', () => {
    const findings = detectDenialFindings(DENIAL_I485);
    expect(findings.find(f => f.category === 'fraud_misrepresentation')!.responsePath).toBe('appeal');
  });
  it('marks fraud as requiring attorney', () => {
    const findings = detectDenialFindings(DENIAL_I485);
    expect(findings.find(f => f.category === 'fraud_misrepresentation')!.recommendation).toBe('attorney_required');
  });
});

describe('Denial: Response Path Analysis', () => {
  it('analyzes response paths from findings', () => {
    const findings = detectDenialFindings(DENIAL_I485);
    const paths = analyzeResponsePaths(findings);
    expect(paths.length).toBeGreaterThan(0);
  });
  it('returns no_remedy_available when no findings', () => {
    const paths = analyzeResponsePaths([]);
    expect(paths).toContain('no_remedy_available');
  });
});

describe('Denial: Risk Assessment', () => {
  it('critical risk for fraud', () => {
    expect(assessDenialRisk(detectDenialFindings(DENIAL_I485))).toBe('critical');
  });
  it('low risk for insufficient evidence only', () => {
    expect(assessDenialRisk(detectDenialFindings(DENIAL_INSUFFICIENT))).toBe('low');
  });
  it('critical risk for criminal grounds', () => {
    expect(assessDenialRisk(detectDenialFindings(DENIAL_CRIMINAL))).toBe('critical');
  });
  it('recommends attorney for high risk', () => {
    expect(shouldRecommendAttorneyForDenial(detectDenialFindings(DENIAL_I485), 'critical')).toBe(true);
  });
});

describe('Denial: Full Analysis', () => {
  it('analyzes I-485 denial', () => {
    const a = analyzeDenial(DENIAL_I485);
    expect(a.formType).toBe('I-485');
    expect(a.receiptNumber).toBe('MSC1234567890');
    expect(a.denialFindings.length).toBeGreaterThan(0);
    expect(a.overallRisk).toBe('critical');
    expect(a.hasAttorneyRecommendation).toBe(true);
    expect(a.summaryEn).toContain('I-485');
    expect(a.summaryEs).toBeDefined();
  });
  it('extracts denial date', () => {
    const a = analyzeDenial(DENIAL_I485);
    expect(a.denialDate).toBe('November 1, 2026');
  });
  it('extracts appeal deadline days', () => {
    const a = analyzeDenial(DENIAL_I485);
    expect(a.appealDeadlineDays).toBe(33);
  });
  it('includes I-290B in recommended actions', () => {
    const a = analyzeDenial(DENIAL_I485);
    expect(a.recommendedActions.some(r => r.includes('I-290B'))).toBe(true);
  });
});

describe('Denial: Strategy', () => {
  it('builds appeal strategy for fraud finding', () => {
    const a = analyzeDenial(DENIAL_I485);
    const s = buildDenialStrategy(a);
    expect(['appeal', 'concurrent'].includes(s.type)).toBe(true);
    expect(s.steps.length).toBeGreaterThan(0);
    expect(s.formRequired).toBe('I-290B');
    expect(s.filingFee).toBeGreaterThan(0);
  });
  it('low success likelihood for critical risk', () => {
    const s = buildDenialStrategy(analyzeDenial(DENIAL_I485));
    expect(s.successLikelihood).toBe('low');
  });
});

describe('Denial: Workflow Engine E2E', () => {
  it('full pipeline reaches complete', () => {
    const c = runFullPipeline(DENIAL_I485);
    expect(c.state).toBe('complete');
    expect(c.denialAnalysis).toBeDefined();
    expect(c.evidenceChecklist.length).toBeGreaterThan(0);
    expect(c.strategy).toBeDefined();
    expect(c.drafts).toBeDefined();
    expect(c.xray).toBeDefined();
    expect(c.approved).toBe(true);
    expect(c.pricing).toBeDefined();
    expect(c.fulfillment).toBeDefined();
    expect(c.tracking).toBeDefined();
    expect(c.proof).toBeDefined();
    expect(c.proof!.packetHash).toMatch(/^[0-9a-f]+$/);
  });
  it('I-130 denial E2E', () => {
    const c = runFullPipeline(DENIAL_I130);
    expect(c.state).toBe('complete');
  });
  it('insufficient evidence denial E2E', () => {
    const c = runFullPipeline(DENIAL_INSUFFICIENT);
    expect(c.state).toBe('complete');
  });
  it('criminal denial E2E with attorney recommendation', () => {
    const c = runFullPipeline(DENIAL_CRIMINAL);
    expect(c.state).toBe('complete');
    expect(c.denialAnalysis!.hasAttorneyRecommendation).toBe(true);
  });
});

describe('Denial: Gate Separation', () => {
  it('cannot approve before user_review', () => {
    let c = createDenialCase('user-1');
    c = ingestDenialDocument(c, makeDU(DENIAL_I485), DENIAL_I485).case;
    expect(approveDenial(c).result.success).toBe(false);
  });
  it('cannot set pricing before approval', () => {
    let c = createDenialCase('user-1');
    c = ingestDenialDocument(c, makeDU(DENIAL_I485), DENIAL_I485).case;
    expect(setDenialPricing(c, {} as any).result.success).toBe(false);
  });
  it('cannot fulfill before payment', () => {
    let c = createDenialCase('user-1');
    c = ingestDenialDocument(c, makeDU(DENIAL_I485), DENIAL_I485).case;
    expect(submitDenialToFulfillment(c, { name: 'AAO', address1: 'Box 1', city: 'D', state: 'TX', postalCode: '75283' }, 'key').result.success).toBe(false);
  });
});

describe('Denial: Idempotency', () => {
  it('duplicate fulfillment blocked', () => {
    const c = runFullPipeline(DENIAL_I485);
    const originalOrderId = c.fulfillment!.providerOrderId;
    const r = submitDenialToFulfillment(c, { name: 'AAO', address1: 'Box 1', city: 'D', state: 'TX', postalCode: '75283' }, 'denial-idem-key');
    expect(r.case.fulfillment!.providerOrderId).toBe(originalOrderId);
  });
});

describe('Denial: Audit Trail', () => {
  it('audit trail is complete', () => {
    const c = runFullPipeline(DENIAL_I485);
    const actions = c.auditLog.map(e => e.action);
    expect(actions).toContain('case_created');
    expect(actions).toContain('document_ingested');
    expect(actions).toContain('approved');
    expect(actions).toContain('fulfillment_submitted');
    expect(actions).toContain('proof_generated');
  });
});

describe('Denial: Security Regression', () => {
  it('owner isolation enforced', () => {
    expect(authorizeCaseAccess(USER_A, { caseId: 'denial-1', ownerUserId: 'user-b' }).allowed).toBe(false);
  });
  it('approval authorization enforced', () => {
    expect(authorizeApproval(USER_A, { caseId: 'denial-1', ownerUserId: 'user-b' }, 'user_review').allowed).toBe(false);
  });
});

describe('Denial: Spanish Support', () => {
  it('Spanish UI with English document', () => {
    const c = createDenialCase('user-1', { ui: 'es', document: 'en', output: 'es' });
    const r = ingestDenialDocument(c, makeDU(DENIAL_I485), DENIAL_I485);
    expect(r.case.language.ui).toBe('es');
    expect(r.result.userMessageEs).toBeDefined();
  });
});

describe('Denial: Drafts', () => {
  it('drafts include cover letter, appeal brief, and evidence index', () => {
    const c = runFullPipeline(DENIAL_I485);
    expect(c.drafts!.coverLetter).toContain('Appeals Office');
    expect(c.drafts!.appealBrief).toContain('Finding');
    expect(c.drafts!.evidenceIndex).toContain('Exhibit');
  });
});
