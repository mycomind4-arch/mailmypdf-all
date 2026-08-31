import { describe, it, expect } from 'vitest';
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
import { buildDocumentUnderstanding } from './document-understanding';

const NOID_TEXT = `U.S. Citizenship and Immigration Services
Notice of Intent to Deny
I-485 Application to Register Permanent Residence
Receipt Number: MSC1234567890
You must respond no later than December 15, 2026

USCIS finds that the applicant is inadmissible under INA § 212(a)(6)(C)(i) for willful misrepresentation of a material fact. The applicant misrepresented their marital status on the original application.

Additionally, USCIS has determined that the evidence of bona fide marriage is insufficient. The documents submitted do not adequately establish that the marriage was entered in good faith.`;

function makeDU() {
  return buildDocumentUnderstanding({ documentId: 'doc-noid', text: NOID_TEXT, source: { documentId: 'doc-noid', confidence: 0.9 }, language: 'en' });
}

function makeRecipient() {
  return { name: 'USCIS', address1: 'P.O. Box 660867', city: 'Dallas', state: 'TX', postalCode: '75266' };
}

function runFullPipeline() {
  let c = createNOIDCase('user-1');
  const du = makeDU();
  const r1 = ingestNOIDDocument(c, du, NOID_TEXT);
  c = r1.case;
  const r2 = confirmNOIDFacts(c, [{ question: 'Is this the most recent notice?', answer: 'Yes' }]);
  c = r2.case;
  const r3 = runGroundAnalysis(c);
  c = r3.case;
  const updates = c.evidenceChecklist.map((item, idx) => ({
    itemId: item.id,
    status: (idx === 0 ? 'have_it' : 'dont_have_it') as NOIDEvidenceItem['status'],
  }));
  const r4 = updateNOIDEvidenceChecklist(c, updates);
  c = r4.case;
  const r5 = analyzeNOIDEvidence(c);
  c = r5.case;
  const r6 = verifyNOIDAuthority(c);
  c = r6.case;
  const r7 = buildNOIDResponseStrategy(c);
  c = r7.case;
  const r8 = generateNOIDDrafts(c);
  c = r8.case;
  const r9 = runNOIDXRay(c);
  c = r9.case;
  const r10 = moveToNOIDUserReview(c);
  c = r10.case;
  const r11 = approveNOID(c);
  c = r11.case;
  const r12 = setNOIDPricing(c, { servicePrice: 99, postage: 7.09, addOns: [{ name: 'Return Receipt', price: 2.85 }], tax: 0, total: 108.94, currency: 'USD', mailingMethod: 'certified' });
  c = r12.case;
  const r13 = confirmNOIDPayment(c, true);
  c = r13.case;
  const r14 = submitNOIDToFulfillment(c, makeRecipient(), 'noid-idem-key');
  c = r14.case;
  const r15 = updateNOIDTracking(c, { trackingNumber: 'NOID-TRACK-001', status: 'in_transit', lastUpdated: new Date().toISOString() });
  c = r15.case;
  const r16 = generateNOIDProof(c, [
    { filename: 'cover-letter.pdf', content: c.drafts!.coverLetter, pages: 1 },
    { filename: 'rebuttal-letter.pdf', content: c.drafts!.rebuttalLetter, pages: 3 },
  ]);
  c = r16.case;
  return c;
}

describe('NOID Workflow Engine', () => {
  it('creates case in intake state', () => {
    const c = createNOIDCase('user-1');
    expect(c.state).toBe('intake');
    expect(c.id).toContain('noid-case');
    expect(c.userId).toBe('user-1');
  });

  it('ingests NOID document and extracts analysis', () => {
    const c = createNOIDCase('user-1');
    const r = ingestNOIDDocument(c, makeDU(), NOID_TEXT);
    expect(r.result.success).toBe(true);
    expect(r.case.state).toBe('explained');
    expect(r.case.noidAnalysis).toBeDefined();
    expect(r.case.noidAnalysis!.denialGrounds.length).toBeGreaterThan(0);
    expect(r.case.evidenceChecklist.length).toBeGreaterThan(0);
  });

  it('includes attorney recommendation in user message', () => {
    const c = createNOIDCase('user-1');
    const r = ingestNOIDDocument(c, makeDU(), NOID_TEXT);
    expect(r.result.userMessage).toContain('attorney');
  });

  it('confirms facts and transitions to confirmed', () => {
    let c = createNOIDCase('user-1');
    c = ingestNOIDDocument(c, makeDU(), NOID_TEXT).case;
    const r = confirmNOIDFacts(c, [{ question: 'Is this correct?', answer: 'Yes' }]);
    expect(r.case.state).toBe('confirmed');
    expect(r.case.confirmations.length).toBe(1);
  });

  it('runs ground analysis', () => {
    let c = createNOIDCase('user-1');
    c = ingestNOIDDocument(c, makeDU(), NOID_TEXT).case;
    c = confirmNOIDFacts(c, [{ question: 'Q', answer: 'A' }]).case;
    const r = runGroundAnalysis(c);
    expect(r.case.state).toBe('ground_analysis');
  });

  it('updates evidence checklist', () => {
    let c = createNOIDCase('user-1');
    c = ingestNOIDDocument(c, makeDU(), NOID_TEXT).case;
    c = confirmNOIDFacts(c, [{ question: 'Q', answer: 'A' }]).case;
    c = runGroundAnalysis(c).case;
    const updates = c.evidenceChecklist.map((item, idx) => ({ itemId: item.id, status: (idx === 0 ? 'have_it' : 'uploaded') as NOIDEvidenceItem['status'], documentIds: idx === 1 ? ['doc-1'] : undefined }));
    const r = updateNOIDEvidenceChecklist(c, updates);
    expect(r.case.evidenceChecklist[0].status).toBe('have_it');
    expect(r.case.evidenceChecklist[1].status).toBe('uploaded');
  });

  it('builds response strategy', () => {
    let c = createNOIDCase('user-1');
    c = ingestNOIDDocument(c, makeDU(), NOID_TEXT).case;
    c = confirmNOIDFacts(c, [{ question: 'Q', answer: 'A' }]).case;
    c = runGroundAnalysis(c).case;
    c = updateNOIDEvidenceChecklist(c, c.evidenceChecklist.map(item => ({ itemId: item.id, status: 'have_it' as NOIDEvidenceItem['status'] }))).case;
    c = analyzeNOIDEvidence(c).case;
    c = verifyNOIDAuthority(c).case;
    const r = buildNOIDResponseStrategy(c);
    expect(r.case.state).toBe('strategy_built');
    expect(r.case.strategy).toBeDefined();
  });

  it('generates drafts', () => {
    let c = createNOIDCase('user-1');
    c = ingestNOIDDocument(c, makeDU(), NOID_TEXT).case;
    c = confirmNOIDFacts(c, [{ question: 'Q', answer: 'A' }]).case;
    c = runGroundAnalysis(c).case;
    c = updateNOIDEvidenceChecklist(c, c.evidenceChecklist.map(item => ({ itemId: item.id, status: 'have_it' as NOIDEvidenceItem['status'] }))).case;
    c = analyzeNOIDEvidence(c).case;
    c = verifyNOIDAuthority(c).case;
    c = buildNOIDResponseStrategy(c).case;
    const r = generateNOIDDrafts(c);
    expect(r.case.state).toBe('drafted');
    expect(r.case.drafts!.coverLetter.length).toBeGreaterThan(50);
    expect(r.case.drafts!.rebuttalLetter.length).toBeGreaterThan(50);
    expect(r.case.drafts!.evidenceIndex).toContain('Exhibit');
  });

  it('runs X-Ray and transitions to xray_complete', () => {
    let c = createNOIDCase('user-1');
    c = ingestNOIDDocument(c, makeDU(), NOID_TEXT).case;
    c = confirmNOIDFacts(c, [{ question: 'Q', answer: 'A' }]).case;
    c = runGroundAnalysis(c).case;
    c = updateNOIDEvidenceChecklist(c, c.evidenceChecklist.map(item => ({ itemId: item.id, status: 'have_it' as NOIDEvidenceItem['status'] }))).case;
    c = analyzeNOIDEvidence(c).case;
    c = verifyNOIDAuthority(c).case;
    c = buildNOIDResponseStrategy(c).case;
    c = generateNOIDDrafts(c).case;
    const r = runNOIDXRay(c);
    expect(r.case.state).toBe('xray_complete');
    expect(r.case.xray!.safeToActUpon).toBe(true);
  });

  it('moves to user review after X-Ray passes', () => {
    let c = createNOIDCase('user-1');
    c = ingestNOIDDocument(c, makeDU(), NOID_TEXT).case;
    c = confirmNOIDFacts(c, [{ question: 'Q', answer: 'A' }]).case;
    c = runGroundAnalysis(c).case;
    c = updateNOIDEvidenceChecklist(c, c.evidenceChecklist.map(item => ({ itemId: item.id, status: 'have_it' as NOIDEvidenceItem['status'] }))).case;
    c = analyzeNOIDEvidence(c).case;
    c = verifyNOIDAuthority(c).case;
    c = buildNOIDResponseStrategy(c).case;
    c = generateNOIDDrafts(c).case;
    c = runNOIDXRay(c).case;
    const r = moveToNOIDUserReview(c);
    expect(r.case.state).toBe('user_review');
  });

  it('full E2E pipeline reaches complete', () => {
    const c = runFullPipeline();
    expect(c.state).toBe('complete');
    expect(c.approved).toBe(true);
    expect(c.pricing).toBeDefined();
    expect(c.fulfillment).toBeDefined();
    expect(c.tracking).toBeDefined();
    expect(c.proof).toBeDefined();
    expect(c.proof!.packetHash).toMatch(/^[0-9a-f]+$/);
  });

  it('gate separation: cannot approve before user_review', () => {
    let c = createNOIDCase('user-1');
    c = ingestNOIDDocument(c, makeDU(), NOID_TEXT).case;
    const r = approveNOID(c);
    expect(r.result.success).toBe(false);
  });

  it('gate separation: cannot pay before approval', () => {
    let c = createNOIDCase('user-1');
    c = ingestNOIDDocument(c, makeDU(), NOID_TEXT).case;
    const r = setNOIDPricing(c, {} as any);
    expect(r.result.success).toBe(false);
  });

  it('gate separation: cannot fulfill before payment', () => {
    let c = createNOIDCase('user-1');
    c = ingestNOIDDocument(c, makeDU(), NOID_TEXT).case;
    const r = submitNOIDToFulfillment(c, makeRecipient(), 'key');
    expect(r.result.success).toBe(false);
  });

  it('idempotency: duplicate fulfillment blocked', () => {
    const c = runFullPipeline();
    const originalOrderId = c.fulfillment!.providerOrderId;
    const r = submitNOIDToFulfillment(c, makeRecipient(), 'noid-idem-key');
    expect(r.case.fulfillment?.providerOrderId).toBe(originalOrderId);
  });

  it('audit trail is complete', () => {
    const c = runFullPipeline();
    const actions = c.auditLog.map(e => e.action);
    expect(actions).toContain('case_created');
    expect(actions).toContain('document_ingested');
    expect(actions).toContain('approved');
    expect(actions).toContain('fulfillment_submitted');
    expect(actions).toContain('proof_generated');
  });

  it('Spanish language preserved through pipeline', () => {
    const c = createNOIDCase('user-1', { ui: 'es', assistant: 'es', output: 'es' });
    const r = ingestNOIDDocument(c, makeDU(), NOID_TEXT);
    expect(r.case.language.ui).toBe('es');
    expect(r.result.userMessageEs).toBeDefined();
  });
});
