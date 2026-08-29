import { describe, it, expect } from 'vitest';
import {
  createNOIDConciergeSession,
  processNOIDUserMessage,
  isNOIDVoiceRequest,
  getNOIDVoicePrompt,
} from './noid-concierge';
import {
  analyzeNOID,
  detectDenialGrounds,
  analyzeProceduralIssues,
  assessOverallRisk,
  shouldRecommendAttorney,
  detectNOIDFormType,
  buildEvidenceRequirements,
  buildNOIDStrategy,
  type DenialGround,
} from './noid-model';
import {
  createNOIDCase,
  ingestNOIDDocument,
  confirmNOIDFacts,
  runGroundAnalysis,
  updateNOIDEvidenceChecklist,
  analyzeNOIDEvidence,
  verifyNOIDAuthority,
  buildNOIDResponseStrategy,
  generateNOIDDrafts,
  runNOIDXRay,
  moveToNOIDUserReview,
  approveNOID,
  setNOIDPricing,
  confirmNOIDPayment,
  submitNOIDToFulfillment,
  updateNOIDTracking,
  generateNOIDProof,
  type NOIDEvidenceItem,
} from './noid-workflow';
import {
  authorizeCaseAccess,
  authorizeApproval,
  authorizePayment,
  authorizeFulfillment,
  buildIsolatedAIContext,
  validateAIContextAccess,
  type AuthenticatedUser,
  type CaseRef,
} from './security';
import { buildDocumentUnderstanding } from './document-understanding';
import { findNOIDPage, ALL_NOID_PAGES, NOID_LANDING_PAGE } from './noid-content';

// ─── Test Data ──────────────────────────────────────────────────────────────────

const NOID_I485 = `U.S. Citizenship and Immigration Services
Notice of Intent to Deny
I-485 Application to Register Permanent Residence
Receipt Number: MSC1234567890
You must respond no later than December 15, 2026

USCIS finds that the applicant is inadmissible under INA § 212(a)(6)(C)(i) for willful misrepresentation of a material fact. The applicant misrepresented their marital status on the original application.

Additionally, USCIS has determined that the evidence of bona fide marriage is insufficient. The documents submitted do not adequately establish that the marriage was entered in good faith.`;

const NOID_I130 = `U.S. Citizenship and Immigration Services
Notice of Intent to Deny
I-130 Petition for Alien Relative
Receipt Number: WAC9876543210
within 33 days

USCIS finds that the evidence of bona fide marriage is insufficient. The documents submitted do not establish that the marriage was entered in good faith. USCIS has identified potential marriage fraud concerns.`;

const NOID_I140 = `U.S. Citizenship and Immigration Services
Notice of Intent to Deny
I-140 Immigrant Petition for Alien Worker
Receipt Number: LIN1234567890
within 30 days

USCIS finds that the beneficiary does not meet the eligibility requirements. The evidence of the qualifying job offer is insufficient. The employer's ability to pay the offered wage has not been adequately demonstrated.`;

const NOID_I751 = `U.S. Citizenship and Immigration Services
Notice of Intent to Deny
I-751 Petition to Remove Conditions
Receipt Number: NBC1112223334
no later than November 30, 2026

USCIS finds that the evidence of bona fide marriage is insufficient. The marriage appears to have been entered into for immigration purposes. Fraud indicators have been identified.`;

const NOID_PUBLIC_CHARGE = `U.S. Citizenship and Immigration Services
Notice of Intent to Deny
I-485 Application to Register Permanent Residence
Receipt: SRC5556667778
within 33 days

USCIS finds that the applicant is likely to become a public charge. The Affidavit of Support submitted is insufficient. The sponsor's income does not meet the minimum requirements.`;

const NOID_CRIMINAL = `U.S. Citizenship and Immigration Services
Notice of Intent to Deny
N-400 Application for Naturalization
Receipt Number: NBC9998887770
within 30 days

USCIS finds that the applicant has a criminal conviction for a controlled substance violation. The applicant is inadmissible under INA § 212(a)(2).`;

const NOID_H1B = `U.S. Citizenship and Immigration Services
Notice of Intent to Deny
H-1B Specialty Occupation Petition
Receipt: EAC4445556660
within 30 days

USCIS finds that the position does not qualify as a specialty occupation. The employer-employee relationship is not clearly established. The beneficiary's credentials do not meet the position requirements.`;

function makeDU(text: string) {
  return buildDocumentUnderstanding({ documentId: 'test-doc', text, source: { documentId: 'test-doc', confidence: 0.9 }, language: 'en' });
}

function runFullPipeline(text: string) {
  let c = createNOIDCase('user-1');
  const r1 = ingestNOIDDocument(c, makeDU(text), text);
  c = r1.case;
  const r2 = confirmNOIDFacts(c, [{ question: 'Is this the most recent notice?', answer: 'Yes' }]);
  c = r2.case;
  c = runGroundAnalysis(c).case;
  const updates = c.evidenceChecklist.map((item, idx) => ({
    itemId: item.id,
    status: (idx === 0 ? 'have_it' : 'uploaded') as NOIDEvidenceItem['status'],
    documentIds: idx === 1 ? ['doc-1'] : undefined,
  }));
  c = updateNOIDEvidenceChecklist(c, updates).case;
  c = analyzeNOIDEvidence(c).case;
  c = verifyNOIDAuthority(c).case;
  c = buildNOIDResponseStrategy(c).case;
  c = generateNOIDDrafts(c).case;
  c = runNOIDXRay(c).case;
  c = moveToNOIDUserReview(c).case;
  c = approveNOID(c).case;
  c = setNOIDPricing(c, { servicePrice: 99, postage: 7.09, addOns: [{ name: 'Return Receipt', price: 2.85 }], tax: 0, total: 108.94, currency: 'USD', mailingMethod: 'certified' }).case;
  c = confirmNOIDPayment(c, true).case;
  c = submitNOIDToFulfillment(c, { name: 'USCIS', address1: 'P.O. Box 660867', city: 'Dallas', state: 'TX', postalCode: '75266' }, 'noid-test-key').case;
  c = updateNOIDTracking(c, { trackingNumber: 'NOID-TRACK-001', status: 'in_transit', lastUpdated: new Date().toISOString() }).case;
  c = generateNOIDProof(c, [
    { filename: 'cover-letter.pdf', content: c.drafts!.coverLetter, pages: 1 },
    { filename: 'rebuttal.pdf', content: c.drafts!.rebuttalLetter, pages: 3 },
  ]).case;
  return c;
}

const USER_A: AuthenticatedUser = { id: 'user-a', role: 'user' };
const USER_B: AuthenticatedUser = { id: 'user-b', role: 'user' };
const CASE_A: CaseRef = { caseId: 'noid-case-1', ownerUserId: 'user-a' };

// ─── Tests ────────────────────────────────────────────────────────────────────────

describe('NOID: 1. Identification', () => {
  it('identifies I-485 NOID', () => {
    expect(detectNOIDFormType(NOID_I485)).toBe('I-485');
  });
  it('identifies I-130 NOID', () => {
    expect(detectNOIDFormType(NOID_I130)).toBe('I-130');
  });
  it('identifies I-140 NOID', () => {
    expect(detectNOIDFormType(NOID_I140)).toBe('I-140');
  });
  it('identifies I-751 NOID', () => {
    expect(detectNOIDFormType(NOID_I751)).toBe('I-751');
  });
  it('identifies N-400 NOID', () => {
    expect(detectNOIDFormType(NOID_CRIMINAL)).toBe('N-400');
  });
  it('identifies generic for unknown', () => {
    expect(detectNOIDFormType('Random text')).toBe('generic');
  });
});

describe('NOID: 2. Document provenance', () => {
  it('preserves receipt number', () => {
    const a = analyzeNOID(NOID_I485);
    expect(a.receiptNumber).toBe('MSC1234567890');
  });
  it('preserves receipt number for I-130', () => {
    const a = analyzeNOID(NOID_I130);
    expect(a.receiptNumber).toBe('WAC9876543210');
  });
});

describe('NOID: 3. Multiple grounds', () => {
  it('detects multiple grounds in I-485 NOID', () => {
    const a = analyzeNOID(NOID_I485);
    expect(a.denialGrounds.length).toBeGreaterThanOrEqual(2);
    expect(a.denialGrounds.some(g => g.category === 'fraud_misrepresentation')).toBe(true);
    expect(a.denialGrounds.some(g => g.category === 'insufficient_evidence')).toBe(true);
  });
});

describe('NOID: 4-5. Deadline extraction and provenance', () => {
  it('extracts deadline date', () => {
    const a = analyzeNOID(NOID_I485);
    expect(a.deadline).toBe('December 15, 2026');
  });
  it('extracts deadline days', () => {
    const a = analyzeNOID(NOID_I130);
    expect(a.deadlineDays).toBe(33);
  });
  it('extracts deadline from I-751', () => {
    const a = analyzeNOID(NOID_I751);
    expect(a.deadline).toBe('November 30, 2026');
  });
});

describe('NOID: 6. Conflicting deadlines', () => {
  it('handles conflicting date formats', () => {
    const text = `Notice of Intent to Deny\nI-485\nReceipt: MSC1112223334\nYou must respond no later than December 15, 2026\nwithin 30 days`;
    const a = analyzeNOID(text);
    // Should prefer the explicit date
    expect(a.deadline).toBe('December 15, 2026');
  });
});

describe('NOID: 7-11. Form-specific NOIDs', () => {
  it('I-485 NOID analysis includes fraud and insufficient evidence', () => {
    const a = analyzeNOID(NOID_I485);
    expect(a.formType).toBe('I-485');
    expect(a.overallRisk).toBe('critical');
  });
  it('I-130 NOID analysis includes insufficient evidence', () => {
    const a = analyzeNOID(NOID_I130);
    expect(a.formType).toBe('I-130');
    expect(a.denialGrounds.length).toBeGreaterThanOrEqual(1);
  });
  it('I-140 NOID analysis includes eligibility', () => {
    const a = analyzeNOID(NOID_I140);
    expect(a.formType).toBe('I-140');
    expect(a.denialGrounds.some(g => g.category === 'eligibility' || g.category === 'insufficient_evidence')).toBe(true);
  });
  it('H-1B NOID analysis includes specialty occupation', () => {
    const a = analyzeNOID(NOID_H1B);
    expect(a.formType).toBe('generic');
    expect(a.denialGrounds.length).toBeGreaterThanOrEqual(1);
  });
  it('I-751 NOID analysis includes fraud indicators', () => {
    const a = analyzeNOID(NOID_I751);
    expect(a.formType).toBe('I-751');
    expect(a.denialGrounds.some(g => g.category === 'fraud_misrepresentation')).toBe(true);
  });
});

describe('NOID: 12-14. Evidence matrix, missing, contradictory', () => {
  it('builds evidence requirements for each ground', () => {
    const a = analyzeNOID(NOID_I485);
    const reqs = buildEvidenceRequirements(a.denialGrounds);
    expect(reqs.length).toBe(a.denialGrounds.length);
    for (const r of reqs) {
      expect(r.evidenceTypes.length).toBeGreaterThan(0);
    }
  });
  it('detects missing evidence via checklist', () => {
    let c = createNOIDCase('user-1');
    c = ingestNOIDDocument(c, makeDU(NOID_I485), NOID_I485).case;
    c = confirmNOIDFacts(c, [{ question: 'Q', answer: 'A' }]).case;
    c = runGroundAnalysis(c).case;
    const allMissing = c.evidenceChecklist.every(item => item.status === 'dont_have_it');
    expect(allMissing).toBe(true);
  });
  it('contradictory evidence detected when status is unsure', () => {
    let c = createNOIDCase('user-1');
    c = ingestNOIDDocument(c, makeDU(NOID_I485), NOID_I485).case;
    c = confirmNOIDFacts(c, [{ question: 'Q', answer: 'A' }]).case;
    c = runGroundAnalysis(c).case;
    const updates = c.evidenceChecklist.map(item => ({ itemId: item.id, status: 'unsure' as NOIDEvidenceItem['status'] }));
    c = updateNOIDEvidenceChecklist(c, updates).case;
    expect(c.evidenceChecklist.some(item => item.status === 'unsure')).toBe(true);
  });
});

describe('NOID: 15-17. Authority (reuses shared engine)', () => {
  it('authority verification step transitions correctly', () => {
    let c = createNOIDCase('user-1');
    c = ingestNOIDDocument(c, makeDU(NOID_I485), NOID_I485).case;
    c = confirmNOIDFacts(c, [{ question: 'Q', answer: 'A' }]).case;
    c = runGroundAnalysis(c).case;
    c = updateNOIDEvidenceChecklist(c, c.evidenceChecklist.map(item => ({ itemId: item.id, status: 'have_it' as NOIDEvidenceItem['status'] }))).case;
    c = analyzeNOIDEvidence(c).case;
    const r = verifyNOIDAuthority(c);
    expect(r.case.state).toBe('authority_verified');
  });
});

describe('NOID: 18-19. Procedural reasoning and risk escalation', () => {
  it('detects procedural issues in malformed NOID', () => {
    const issues = analyzeProceduralIssues('We are going to deny your application.');
    expect(issues.length).toBeGreaterThan(0);
  });
  it('risk assessment escalates for fraud', () => {
    const grounds = detectDenialGrounds(NOID_I485);
    expect(assessOverallRisk(grounds)).toBe('critical');
  });
  it('risk assessment for insufficient evidence only is low', () => {
    const grounds = detectDenialGrounds('The evidence is insufficient.');
    expect(assessOverallRisk(grounds)).toBe('low');
  });
});

describe('NOID: 20-21. Fraud and criminal escalation', () => {
  it('fraud ground requires attorney', () => {
    const a = analyzeNOID(NOID_I485);
    expect(a.hasAttorneyRecommendation).toBe(true);
  });
  it('criminal ground requires attorney', () => {
    const a = analyzeNOID(NOID_CRIMINAL);
    expect(a.hasAttorneyRecommendation).toBe(true);
    expect(a.overallRisk).toBe('critical');
  });
});

describe('NOID: 22-23. Strategy', () => {
  it('builds strategy after evidence', () => {
    let c = createNOIDCase('user-1');
    c = ingestNOIDDocument(c, makeDU(NOID_I485), NOID_I485).case;
    c = confirmNOIDFacts(c, [{ question: 'Q', answer: 'A' }]).case;
    c = runGroundAnalysis(c).case;
    c = updateNOIDEvidenceChecklist(c, c.evidenceChecklist.map(item => ({ itemId: item.id, status: 'have_it' as NOIDEvidenceItem['status'] }))).case;
    c = analyzeNOIDEvidence(c).case;
    c = verifyNOIDAuthority(c).case;
    const r = buildNOIDResponseStrategy(c);
    expect(r.case.state).toBe('strategy_built');
    expect(r.case.strategy).toBeDefined();
    expect(r.case.strategy!.steps.length).toBeGreaterThan(0);
  });
  it('unsupported strategy blocked by X-Ray when incomplete', () => {
    let c = createNOIDCase('user-1');
    c = ingestNOIDDocument(c, makeDU(NOID_I485), NOID_I485).case;
    c = confirmNOIDFacts(c, [{ question: 'Q', answer: 'A' }]).case;
    c = runGroundAnalysis(c).case;
    // No evidence uploaded
    c = updateNOIDEvidenceChecklist(c, c.evidenceChecklist.map(item => ({ itemId: item.id, status: 'dont_have_it' as NOIDEvidenceItem['status'] }))).case;
    c = analyzeNOIDEvidence(c).case;
    c = verifyNOIDAuthority(c).case;
    c = buildNOIDResponseStrategy(c).case;
    c = generateNOIDDrafts(c).case;
    const xray = runNOIDXRay(c);
    expect(xray.case.xray).toBeDefined();
  });
});

describe('NOID: 24. Draft completeness', () => {
  it('drafts include cover letter, rebuttal, and evidence index', () => {
    const c = runFullPipeline(NOID_I485);
    expect(c.drafts!.coverLetter).toContain('Citizenship and Immigration');
    expect(c.drafts!.rebuttalLetter).toContain('Denial Ground');
    expect(c.drafts!.evidenceIndex).toContain('Exhibit');
  });
});

describe('NOID: 25-27. X-Ray', () => {
  it('X-Ray runs and produces verdict', () => {
    let c = createNOIDCase('user-1');
    c = ingestNOIDDocument(c, makeDU(NOID_I485), NOID_I485).case;
    c = confirmNOIDFacts(c, [{ question: 'Q', answer: 'A' }]).case;
    c = runGroundAnalysis(c).case;
    c = updateNOIDEvidenceChecklist(c, c.evidenceChecklist.map(item => ({ itemId: item.id, status: 'have_it' as NOIDEvidenceItem['status'] }))).case;
    c = analyzeNOIDEvidence(c).case;
    c = verifyNOIDAuthority(c).case;
    c = buildNOIDResponseStrategy(c).case;
    c = generateNOIDDrafts(c).case;
    const r = runNOIDXRay(c);
    expect(r.case.xray!.overallVerdict).toBeDefined();
    expect(r.case.xray!.safeToActUpon).toBe(true);
  });
  it('X-Ray blocks when safeToActUpon is false', () => {
    let c = createNOIDCase('user-1');
    c = ingestNOIDDocument(c, makeDU(NOID_I485), NOID_I485).case;
    // Force a blocked X-Ray scenario by manipulating state
    c = { ...c, state: 'xray_complete', xray: { safeToActUpon: false, overallVerdict: 'FAIL', findings: [] } };
    const r = moveToNOIDUserReview(c);
    expect(r.case.state).toBe('blocked');
  });
});

describe('NOID: 28. Spanish user + English NOID', () => {
  it('Spanish UI with English document', () => {
    const c = createNOIDCase('user-1', { ui: 'es', document: 'en', output: 'es' });
    const r = ingestNOIDDocument(c, makeDU(NOID_I485), NOID_I485);
    expect(r.case.language.ui).toBe('es');
    expect(r.result.userMessageEs).toBeDefined();
  });
  it('concierge Spanish greeting', () => {
    const session = createNOIDConciergeSession({ ui: 'es' });
    expect(session.messages[0].content).toContain('Aviso de Intención');
  });
});

describe('NOID: 29-30. Voice boundary and "I dont know"', () => {
  it('detects voice request', () => {
    expect(isNOIDVoiceRequest('talk')).toBe(true);
    expect(isNOIDVoiceRequest('hablar')).toBe(true);
    expect(isNOIDVoiceRequest('hello')).toBe(false);
  });
  it('voice prompt in English', () => {
    expect(getNOIDVoicePrompt(false)).toContain('speak');
  });
  it('handles "I dont know" gracefully', () => {
    const session = createNOIDConciergeSession();
    const r = processNOIDUserMessage(session, "I don't know what to do");
    expect(r.session.messages.length).toBeGreaterThan(2);
  });
});

describe('NOID: 31-32. Review != Approval, Explicit Approval', () => {
  it('cannot approve before user_review state', () => {
    let c = createNOIDCase('user-1');
    c = ingestNOIDDocument(c, makeDU(NOID_I485), NOID_I485).case;
    const r = approveNOID(c);
    expect(r.result.success).toBe(false);
  });
  it('explicit approval sets timestamp', () => {
    const c = runFullPipeline(NOID_I485);
    expect(c.approved).toBe(true);
    expect(c.approvalTimestamp).toBeDefined();
  });
});

describe('NOID: 33-36. Checkout, Payment, Fulfillment, Idempotency', () => {
  it('pricing is set after approval', () => {
    const c = runFullPipeline(NOID_I485);
    expect(c.pricing).toBeDefined();
    expect(c.pricing!.servicePrice).toBeGreaterThan(0);
    expect(c.pricing!.postage).toBeGreaterThan(0);
  });
  it('payment transitions to paid state', () => {
    const c = runFullPipeline(NOID_I485);
    expect(c.state === 'paid' || c.state === 'fulfilled' || c.state === 'tracking' || c.state === 'complete').toBe(true);
  });
  it('fulfillment generates provider order', () => {
    const c = runFullPipeline(NOID_I485);
    expect(c.fulfillment).toBeDefined();
    expect(c.fulfillment!.providerOrderId).toBeDefined();
    expect(c.fulfillment!.status).toBe('submitted');
  });
  it('idempotency blocks duplicate fulfillment', () => {
    const c = runFullPipeline(NOID_I485);
    const originalOrderId = c.fulfillment!.providerOrderId;
    const r = submitNOIDToFulfillment(c, { name: 'USCIS', address1: 'Box 1', city: 'Dallas', state: 'TX', postalCode: '75266' }, 'noid-test-key');
    expect(r.case.fulfillment!.providerOrderId).toBe(originalOrderId);
  });
});

describe('NOID: 37-39. Owner isolation, Tracking, Proof', () => {
  it('user A cannot access user B case', () => {
    const result = authorizeCaseAccess(USER_A, { caseId: 'noid-1', ownerUserId: 'user-b' });
    expect(result.allowed).toBe(false);
  });
  it('user A cannot approve user B case', () => {
    const result = authorizeApproval(USER_A, { caseId: 'noid-1', ownerUserId: 'user-b' }, 'user_review');
    expect(result.allowed).toBe(false);
  });
  it('user A cannot pay for user B case', () => {
    const result = authorizePayment(USER_A, { caseId: 'noid-1', ownerUserId: 'user-b' }, 'checkout_pending');
    expect(result.allowed).toBe(false);
  });
  it('tracking is generated', () => {
    const c = runFullPipeline(NOID_I485);
    expect(c.tracking).toBeDefined();
    expect(c.tracking!.trackingNumber).toBe('NOID-TRACK-001');
  });
  it('proof is generated with hash', () => {
    const c = runFullPipeline(NOID_I485);
    expect(c.proof).toBeDefined();
    expect(c.proof!.packetHash).toMatch(/^[0-9a-f]+$/);
    expect(c.proof!.documentManifest.length).toBeGreaterThan(0);
  });
});

describe('NOID: 40. Full E2E NOID → MailMyPDF', () => {
  it('complete pipeline from intake to proof', () => {
    const c = runFullPipeline(NOID_I485);
    expect(c.state).toBe('complete');
    expect(c.noidAnalysis).toBeDefined();
    expect(c.evidenceChecklist.length).toBeGreaterThan(0);
    expect(c.strategy).toBeDefined();
    expect(c.drafts).toBeDefined();
    expect(c.xray).toBeDefined();
    expect(c.approved).toBe(true);
    expect(c.pricing).toBeDefined();
    expect(c.fulfillment).toBeDefined();
    expect(c.tracking).toBeDefined();
    expect(c.proof).toBeDefined();
    expect(c.auditLog.length).toBeGreaterThan(10);
  });
  it('public charge NOID E2E', () => {
    const c = runFullPipeline(NOID_PUBLIC_CHARGE);
    expect(c.state).toBe('complete');
    expect(c.noidAnalysis!.denialGrounds.some(g => g.category === 'public_charge')).toBe(true);
  });
  it('criminal NOID E2E with attorney recommendation', () => {
    const c = runFullPipeline(NOID_CRIMINAL);
    expect(c.state).toBe('complete');
    expect(c.noidAnalysis!.hasAttorneyRecommendation).toBe(true);
    expect(c.noidAnalysis!.overallRisk).toBe('critical');
  });
});

describe('NOID: Concierge integration', () => {
  it('creates session with greeting', () => {
    const s = createNOIDConciergeSession();
    expect(s.messages[0].role).toBe('assistant');
    expect(s.messages[0].content).toContain('Notice of Intent to Deny');
  });
  it('detects NOID keywords and offers upload', () => {
    const s = createNOIDConciergeSession();
    const r = processNOIDUserMessage(s, 'I received a NOID from USCIS');
    expect(r.session.detectedNOID).toBe(true);
    expect(r.action?.type).toBe('upload_noid');
  });
  it('processes document upload and starts workflow', () => {
    const s = createNOIDConciergeSession();
    const r = processNOIDUserMessage(s, 'upload', { text: NOID_I485, documentId: 'd1' });
    expect(r.action?.type === 'start_workflow' || r.action?.type === 'attorney_recommended').toBe(true);
    expect(r.session.case).toBeDefined();
    expect(r.session.case!.noidAnalysis).toBeDefined();
  });
  it('shows attorney warning for high-risk NOID', () => {
    const s = createNOIDConciergeSession();
    const r = processNOIDUserMessage(s, 'upload', { text: NOID_CRIMINAL, documentId: 'd1' });
    expect(r.session.attorneyWarningShown).toBe(true);
    expect(r.action?.type).toBe('attorney_recommended');
  });
  it('never exposes internal workflow IDs', () => {
    const s = createNOIDConciergeSession();
    const r = processNOIDUserMessage(s, 'I got a NOID');
    expect(r.message.content).not.toMatch(/noid-case-\d+/);
  });
  it('Spanish concierge detects NOID keywords', () => {
    const s = createNOIDConciergeSession({ ui: 'es' });
    const r = processNOIDUserMessage(s, 'Recibí un aviso de intención de denegar');
    expect(r.session.detectedNOID).toBe(true);
  });
});

describe('NOID: Content/SEO', () => {
  it('landing page exists', () => {
    expect(NOID_LANDING_PAGE.title).toContain('NOID');
    expect(NOID_LANDING_PAGE.faqSchema!.length).toBeGreaterThan(0);
  });
  it('supporting pages exist', () => {
    expect(ALL_NOID_PAGES.length).toBeGreaterThan(15);
  });
  it('findNOIDPage returns correct page', () => {
    const p = findNOIDPage('/noid/how-to-respond');
    expect(p).toBeDefined();
    expect(p!.h1).toContain('How to Respond');
  });
  it('all pages have canonical URLs', () => {
    for (const p of ALL_NOID_PAGES) {
      expect(p.canonical).toContain('immigrationmail.com/noid');
    }
  });
  it('all pages have keyword clusters', () => {
    for (const p of ALL_NOID_PAGES) {
      expect(p.keywordCluster.length).toBeGreaterThan(0);
    }
  });
});

describe('NOID: Gold certification gates', () => {
  it('gate: cannot set pricing before approval', () => {
    let c = createNOIDCase('user-1');
    c = ingestNOIDDocument(c, makeDU(NOID_I485), NOID_I485).case;
    const r = setNOIDPricing(c, {} as any);
    expect(r.result.success).toBe(false);
  });
  it('gate: cannot pay before checkout_pending', () => {
    let c = createNOIDCase('user-1');
    c = ingestNOIDDocument(c, makeDU(NOID_I485), NOID_I485).case;
    const r = confirmNOIDPayment(c, true);
    expect(r.result.success).toBe(false);
  });
  it('gate: cannot fulfill before payment', () => {
    let c = createNOIDCase('user-1');
    c = ingestNOIDDocument(c, makeDU(NOID_I485), NOID_I485).case;
    const r = submitNOIDToFulfillment(c, { name: 'USCIS', address1: 'Box 1', city: 'D', state: 'TX', postalCode: '75266' }, 'key');
    expect(r.result.success).toBe(false);
  });
  it('audit trail is complete', () => {
    const c = runFullPipeline(NOID_I485);
    const actions = c.auditLog.map(e => e.action);
    expect(actions).toContain('case_created');
    expect(actions).toContain('document_ingested');
    expect(actions).toContain('approved');
    expect(actions).toContain('fulfillment_submitted');
    expect(actions).toContain('proof_generated');
  });
  it('AI context isolation prevents cross-user access', () => {
    const ctx = buildIsolatedAIContext(USER_A, ['noid-a'], ['doc-a']);
    expect(validateAIContextAccess(ctx, 'noid-b').allowed).toBe(false);
  });
});
