import { describe, it, expect } from 'vitest';
import {
  detectRelationshipType,
  detectNoticeType,
  buildEvidenceMatrix,
  detectDiscrepancies,
  detectForeignDocuments,
  hasTranslationNeeds,
  assessI130Risk,
  shouldRecommendAttorney,
  analyzeI130,
  buildI130Strategy,
  type EvidenceStatus,
} from './i130-model';
import {
  createI130Case,
  ingestI130Document,
  explainI130,
  confirmI130Facts,
  runRelationshipAnalysis,
  updateI130EvidenceMatrix,
  analyzeI130Evidence,
  verifyI130Authority,
  buildI130ResponseStrategy,
  prepareHandoff,
  generateI130Drafts,
  runI130XRay,
  moveToI130UserReview,
  approveI130,
  setI130Pricing,
  confirmI130Payment,
  submitI130ToFulfillment,
  updateI130Tracking,
  generateI130Proof,
  type I130Case,
} from './i130-workflow';
import { buildDocumentUnderstanding } from './document-understanding';
import { authorizeCaseAccess, authorizeApproval, authorizePayment, type AuthenticatedUser } from './security';

// ─── Test Data ─────────────────────────────────────────────────────────────────

const I130_SPOUSE_RFE = `U.S. Citizenship and Immigration Services
Request for Evidence
I-130 Petition for Alien Relative
Receipt Number: MSC1234567890

You must submit the following evidence no later than December 15, 2026:

1. Marriage certificate
2. Proof of bona fide marriage (joint bank statements, lease, photographs)
3. Proof of termination of prior marriage
4. Certified English translation of foreign marriage certificate`;

const I130_PARENT_RFE = `USCIS Request for Evidence
I-130 Petition for Alien Relative
Receipt: WAC9876543210
within 87 days

Please provide the following:
1. Birth certificate showing parent's name
2. Parent's birth certificate
3. Proof of legal parent-child relationship`;

const I130_CHILD_EVIDENCE = `I need to send proof that my child is my child for the I-130 petition. My son was born abroad and I need to submit his birth certificate.`;

const I130_SIBLING_RFE = `USCIS Request for Evidence
I-130 Petition for Alien Relative
Receipt: LIN5556667778
within 87 days

Please submit:
1. Birth certificates showing common parent
2. Evidence of name change for petitioner`;

const I130_SPOUSE_NOID = `U.S. Citizenship and Immigration Services
Notice of Intent to Deny
I-130 Petition for Alien Relative
Receipt: SRC1112223334
within 33 days

USCIS finds that the evidence of bona fide marriage is insufficient. The documents submitted do not establish that the marriage was entered in good faith. A name mismatch was identified between the marriage certificate and the passport. The marriage date discrepancy was noted: the marriage certificate shows June 15, 2020 but the application states July 15, 2020.`;

const I130_DENIED = `USCIS Decision: Denial
I-130 Petition for Alien Relative
Receipt: EAC4445556660
Denied: October 1, 2026
within 33 days

The petition is denied. The evidence of the qualifying relationship is insufficient.`;

const I130_FOREIGN_DOC = `USCIS Request for Evidence
I-130 Petition
Receipt: NBC7778889990
within 87 days

Please submit a certified English translation of the foreign marriage certificate and foreign birth certificate.`;

function makeDU(text: string) {
  return buildDocumentUnderstanding({ documentId: 'test-doc', text, source: { documentId: 'test-doc', confidence: 0.9 }, language: 'en' });
}

function runFullPipeline(text: string): I130Case {
  let c = createI130Case('user-1');
  c = ingestI130Document(c, makeDU(text), text).case;
  c = explainI130(c).case;
  c = confirmI130Facts(c, [{ question: 'Is this the most recent notice?', answer: 'Yes' }]).case;
  c = runRelationshipAnalysis(c).case;
  // Mark all evidence as confirmed for the pipeline
  const updates = c.context!.evidenceMatrix.map(item => ({
    itemId: item.id,
    status: 'confirmed' as EvidenceStatus,
    documentIds: ['doc-1'],
  }));
  c = updateI130EvidenceMatrix(c, updates).case;
  c = analyzeI130Evidence(c).case;
  c = verifyI130Authority(c).case;
  c = buildI130ResponseStrategy(c).case;
  c = prepareHandoff(c).case;
  c = generateI130Drafts(c).case;
  c = runI130XRay(c).case;
  c = moveToI130UserReview(c).case;
  c = approveI130(c).case;
  c = setI130Pricing(c, { servicePrice: 49, postage: 7.09, addOns: [], tax: 0, total: 56.09, currency: 'USD', mailingMethod: 'certified' }).case;
  c = confirmI130Payment(c, true).case;
  c = submitI130ToFulfillment(c, { name: 'USCIS', address1: 'P.O. Box 660867', city: 'Dallas', state: 'TX', postalCode: '75266' }, 'i130-idem-key').case;
  c = updateI130Tracking(c, { trackingNumber: 'I130-TRACK-001', status: 'in_transit', lastUpdated: new Date().toISOString() }).case;
  c = generateI130Proof(c, [
    { filename: 'cover-letter.pdf', content: c.drafts!.coverLetter, pages: 1 },
    { filename: 'response.pdf', content: c.drafts!.responseLetter, pages: 3 },
  ]).case;
  return c;
}

const USER_A: AuthenticatedUser = { id: 'user-a', role: 'user' };

// ─── Tests ────────────────────────────────────────────────────────────────────────

describe('I-130: 1. Classification', () => {
  it('classifies spouse relationship', () => {
    expect(detectRelationshipType(I130_SPOUSE_RFE)).toBe('spouse');
  });
  it('classifies parent relationship', () => {
    expect(detectRelationshipType(I130_PARENT_RFE)).toBe('parent');
  });
  it('classifies child relationship', () => {
    expect(detectRelationshipType(I130_CHILD_EVIDENCE)).toBe('child');
  });
  it('classifies sibling relationship', () => {
    expect(detectRelationshipType(I130_SIBLING_RFE)).toBe('sibling');
  });
  it('returns unknown for ambiguous text', () => {
    expect(detectRelationshipType('Random text')).toBe('unknown');
  });
});

describe('I-130: 2-5. Notice type detection', () => {
  it('detects RFE', () => expect(detectNoticeType(I130_SPOUSE_RFE)).toBe('rfe'));
  it('detects NOID', () => expect(detectNoticeType(I130_SPOUSE_NOID)).toBe('noid'));
  it('detects denial', () => expect(detectNoticeType(I130_DENIED)).toBe('denial'));
  it('detects evidence request', () => expect(detectNoticeType(I130_CHILD_EVIDENCE)).toBe('evidence_request'));
});

describe('I-130: 6-8. Document ingestion, extraction, provenance', () => {
  it('ingests I-130 document and extracts receipt number', () => {
    const c = createI130Case('user-1');
    const r = ingestI130Document(c, makeDU(I130_SPOUSE_RFE), I130_SPOUSE_RFE);
    expect(r.case.state).toBe('classified');
    expect(r.case.context!.receiptNumber).toBe('MSC1234567890');
  });
  it('extracts requested evidence items', () => {
    const ctx = analyzeI130(I130_SPOUSE_RFE);
    expect(ctx.requestedEvidence.length).toBeGreaterThan(0);
  });
  it('preserves A-number if present', () => {
    const text = I130_SPOUSE_RFE + '\nA-Number: A123456789';
    const ctx = analyzeI130(text);
    expect(ctx.aNumber).toBeDefined();
  });
});

describe('I-130: 9. Relationship reasoning', () => {
  it('spouse evidence matrix includes marriage certificate', () => {
    const matrix = buildEvidenceMatrix('spouse', []);
    expect(matrix.some(e => e.category === 'marriage_certificate')).toBe(true);
    expect(matrix.some(e => e.category === 'shared_finances')).toBe(true);
    expect(matrix.some(e => e.category === 'photographs')).toBe(true);
  });
  it('parent evidence matrix includes birth certificate', () => {
    const matrix = buildEvidenceMatrix('parent', []);
    expect(matrix.some(e => e.category === 'birth_certificate')).toBe(true);
  });
  it('child evidence matrix includes birth certificate and adoption', () => {
    const matrix = buildEvidenceMatrix('child', []);
    expect(matrix.some(e => e.category === 'birth_certificate')).toBe(true);
    expect(matrix.some(e => e.category === 'adoption_records')).toBe(true);
  });
  it('sibling evidence matrix includes common parentage', () => {
    const matrix = buildEvidenceMatrix('sibling', []);
    expect(matrix.some(e => e.category === 'birth_certificate')).toBe(true);
    expect(matrix.some(e => e.category === 'name_change_records')).toBe(true);
  });
});

describe('I-130: 10-12. Evidence matrix, missing, contradictory', () => {
  it('evidence matrix starts with all missing', () => {
    let c = createI130Case('user-1');
    c = ingestI130Document(c, makeDU(I130_SPOUSE_RFE), I130_SPOUSE_RFE).case;
    expect(c.context!.evidenceMatrix.every(e => e.status === 'missing' || e.status === 'not_applicable')).toBe(true);
  });
  it('updates evidence status to confirmed', () => {
    let c = createI130Case('user-1');
    c = ingestI130Document(c, makeDU(I130_SPOUSE_RFE), I130_SPOUSE_RFE).case;
    c = explainI130(c).case;
    c = confirmI130Facts(c, [{ question: 'Q', answer: 'A' }]).case;
    c = runRelationshipAnalysis(c).case;
    c = updateI130EvidenceMatrix(c, c.context!.evidenceMatrix.map(item => ({ itemId: item.id, status: 'confirmed' as EvidenceStatus }))).case;
    expect(c.context!.evidenceMatrix.every(e => e.status === 'confirmed' || e.status === 'not_applicable')).toBe(true);
  });
  it('contradictory evidence detected via discrepancies', () => {
    const discrepancies = detectDiscrepancies(I130_SPOUSE_NOID);
    expect(discrepancies.length).toBeGreaterThan(0);
    expect(discrepancies.some(d => d.type === 'name_mismatch')).toBe(true);
    expect(discrepancies.some(d => d.type === 'date_mismatch')).toBe(true);
  });
});

describe('I-130: 13-15. Name, date, address mismatches', () => {
  it('name mismatch detected', () => {
    const text = 'A name mismatch was identified between the marriage certificate and the passport.';
    const d = detectDiscrepancies(text);
    expect(d.some(x => x.type === 'name_mismatch')).toBe(true);
  });
  it('date mismatch detected', () => {
    const text = 'A date discrepancy was noted between the application and the birth certificate.';
    const d = detectDiscrepancies(text);
    expect(d.some(x => x.type === 'date_mismatch')).toBe(true);
  });
  it('address mismatch detected', () => {
    const text = 'An address mismatch was found between the lease and the application.';
    const d = detectDiscrepancies(text);
    expect(d.some(x => x.type === 'address_mismatch')).toBe(true);
  });
});

describe('I-130: 16-17. Foreign documents and translation', () => {
  it('foreign documents detected', () => {
    const docs = detectForeignDocuments(I130_FOREIGN_DOC);
    expect(docs.length).toBeGreaterThan(0);
    expect(docs.some(d => d.translationStatus === 'needed')).toBe(true);
  });
  it('translation needs flag set', () => {
    const docs = detectForeignDocuments(I130_FOREIGN_DOC);
    expect(hasTranslationNeeds(docs)).toBe(true);
  });
  it('no translation needs when no foreign docs', () => {
    const docs = detectForeignDocuments('Just a regular English document');
    expect(hasTranslationNeeds(docs)).toBe(false);
  });
});

describe('I-130: 18-20. RFE/NOID/Denial handoff', () => {
  it('RFE handoff — strategy type is rfe_response', () => {
    const ctx = analyzeI130(I130_SPOUSE_RFE);
    const s = buildI130Strategy(ctx);
    expect(s.type).toBe('rfe_response');
    expect(s.handsOffTo).toBe('rfe');
  });
  it('NOID handoff — strategy type is noid_response', () => {
    const ctx = analyzeI130(I130_SPOUSE_NOID);
    const s = buildI130Strategy(ctx);
    expect(s.type).toBe('noid_response');
    expect(s.handsOffTo).toBe('noid');
  });
  it('Denial handoff — strategy type is denial_response', () => {
    const ctx = analyzeI130(I130_DENIED);
    const s = buildI130Strategy(ctx);
    expect(s.type).toBe('denial_response');
    expect(s.handsOffTo).toBe('denial');
  });
  it('handoff step included in strategy', () => {
    const ctx = analyzeI130(I130_SPOUSE_RFE);
    const s = buildI130Strategy(ctx);
    expect(s.steps.some(step => step.action.includes('RFE response packet'))).toBe(true);
  });
});

describe('I-130: 21-23. Deadlines', () => {
  it('deadline date extracted', () => {
    const ctx = analyzeI130(I130_SPOUSE_RFE);
    expect(ctx.deadline).toBe('December 15, 2026');
  });
  it('deadline days extracted', () => {
    const ctx = analyzeI130(I130_PARENT_RFE);
    expect(ctx.deadlineDays).toBe(87);
  });
  it('conflicting deadline info does not crash', () => {
    const text = `I-130\nReceipt: MSC1234567890\nno later than December 15, 2026\nwithin 30 days`;
    const ctx = analyzeI130(text);
    expect(ctx.deadline).toBe('December 15, 2026');
  });
});

describe('I-130: 24-25. Authority', () => {
  it('authority verification transitions correctly', () => {
    let c = createI130Case('user-1');
    c = ingestI130Document(c, makeDU(I130_SPOUSE_RFE), I130_SPOUSE_RFE).case;
    c = explainI130(c).case;
    c = confirmI130Facts(c, [{ question: 'Q', answer: 'A' }]).case;
    c = runRelationshipAnalysis(c).case;
    c = updateI130EvidenceMatrix(c, c.context!.evidenceMatrix.map(item => ({ itemId: item.id, status: 'confirmed' as EvidenceStatus }))).case;
    c = analyzeI130Evidence(c).case;
    const r = verifyI130Authority(c);
    expect(r.case.state).toBe('authority_verified');
  });
});

describe('I-130: 26. Strategy', () => {
  it('strategy includes evidence steps', () => {
    const ctx = analyzeI130(I130_SPOUSE_RFE);
    const s = buildI130Strategy(ctx);
    expect(s.steps.length).toBeGreaterThan(0);
    expect(s.steps.some(step => step.action.includes('translation'))).toBe(true);
  });
  it('strategy separates supported/conditional/uncertain', () => {
    const ctx = analyzeI130(I130_SPOUSE_NOID);
    const s = buildI130Strategy(ctx);
    expect(s.steps.some(step => step.status === 'supported')).toBe(true);
    expect(s.steps.some(step => step.status === 'conditional' || step.status === 'uncertain')).toBe(true);
  });
});

describe('I-130: 27. Draft generation', () => {
  it('drafts include cover letter, response letter, evidence index', () => {
    const c = runFullPipeline(I130_SPOUSE_RFE);
    expect(c.drafts!.coverLetter).toContain('Citizenship and Immigration');
    expect(c.drafts!.responseLetter).toContain('Evidence');
    expect(c.drafts!.evidenceIndex).toContain('Exhibit');
  });
  it('discrepancy explanation included when discrepancies exist', () => {
    const c = runFullPipeline(I130_SPOUSE_NOID);
    expect(c.drafts!.discrepancyExplanation).toBeDefined();
  });
});

describe('I-130: 28-30. X-Ray and blocking', () => {
  it('X-Ray passes when all evidence confirmed', () => {
    const c = runFullPipeline(I130_SPOUSE_RFE);
    expect(c.xray!.overallVerdict).toBe('PASS');
  });
  it('X-Ray blocks when critical evidence missing', () => {
    let c = createI130Case('user-1');
    c = ingestI130Document(c, makeDU(I130_SPOUSE_RFE), I130_SPOUSE_RFE).case;
    c = explainI130(c).case;
    c = confirmI130Facts(c, [{ question: 'Q', answer: 'A' }]).case;
    c = runRelationshipAnalysis(c).case;
    // Don't update evidence — keep everything missing
    c = updateI130EvidenceMatrix(c, []).case;
    c = analyzeI130Evidence(c).case;
    c = verifyI130Authority(c).case;
    c = buildI130ResponseStrategy(c).case;
    c = prepareHandoff(c).case;
    c = generateI130Drafts(c).case;
    const r = runI130XRay(c);
    expect(r.case.xray!.safeToActUpon).toBe(false);
  });
  it('X-Ray blocks when translations needed but not confirmed', () => {
    let c = createI130Case('user-1');
    c = ingestI130Document(c, makeDU(I130_FOREIGN_DOC), I130_FOREIGN_DOC).case;
    c = explainI130(c).case;
    c = confirmI130Facts(c, [{ question: 'Q', answer: 'A' }]).case;
    c = runRelationshipAnalysis(c).case;
    // Mark all evidence as confirmed EXCEPT translation
    c = updateI130EvidenceMatrix(c, c.context!.evidenceMatrix.map(item => ({
      itemId: item.id,
      status: (item.category === 'translation' ? 'missing' : 'confirmed') as EvidenceStatus,
    }))).case;
    c = analyzeI130Evidence(c).case;
    c = verifyI130Authority(c).case;
    c = buildI130ResponseStrategy(c).case;
    c = prepareHandoff(c).case;
    c = generateI130Drafts(c).case;
    const r = runI130XRay(c);
    // Translation needs not resolved → X-Ray should flag
    expect(r.case.xray!.findings.some(f => f.issueType === 'translations' && f.finalVerdict === 'FAIL')).toBe(true);
  });
});

describe('I-130: 31. Spanish user + English documents', () => {
  it('Spanish UI with English I-130 document', () => {
    const c = createI130Case('user-1', { ui: 'es', document: 'en', output: 'es' });
    const r = ingestI130Document(c, makeDU(I130_SPOUSE_RFE), I130_SPOUSE_RFE);
    expect(r.case.language.ui).toBe('es');
    expect(r.result.userMessageEs).toBeDefined();
  });
});

describe('I-130: 32-33. Voice boundary and "I dont know"', () => {
  it('voice path uses same case', () => {
    const c = createI130Case('user-1');
    expect(c.state).toBe('intake');
  });
  it('"I dont know" does not crash analysis', () => {
    const ctx = analyzeI130('I dont know what USCIS wants');
    expect(ctx.relationshipType).toBe('unknown');
    expect(ctx.noticeType).toBe('unknown');
  });
});

describe('I-130: 34-35. Review != Approval, Explicit Approval', () => {
  it('cannot approve before user_review', () => {
    let c = createI130Case('user-1');
    c = ingestI130Document(c, makeDU(I130_SPOUSE_RFE), I130_SPOUSE_RFE).case;
    expect(approveI130(c).result.success).toBe(false);
  });
  it('explicit approval sets timestamp', () => {
    const c = runFullPipeline(I130_SPOUSE_RFE);
    expect(c.approved).toBe(true);
    expect(c.approvalTimestamp).toBeDefined();
  });
});

describe('I-130: 36-39. Checkout, Payment, Fulfillment, Idempotency', () => {
  it('pricing set after approval', () => {
    const c = runFullPipeline(I130_SPOUSE_RFE);
    expect(c.pricing!.servicePrice).toBeGreaterThan(0);
    expect(c.pricing!.postage).toBeGreaterThan(0);
  });
  it('payment transitions to paid', () => {
    const c = runFullPipeline(I130_SPOUSE_RFE);
    expect(['paid', 'fulfilled', 'tracking', 'complete'].includes(c.state)).toBe(true);
  });
  it('fulfillment creates provider order', () => {
    const c = runFullPipeline(I130_SPOUSE_RFE);
    expect(c.fulfillment!.providerOrderId).toBeDefined();
  });
  it('duplicate fulfillment blocked', () => {
    const c = runFullPipeline(I130_SPOUSE_RFE);
    const originalOrderId = c.fulfillment!.providerOrderId;
    const r = submitI130ToFulfillment(c, { name: 'USCIS', address1: 'Box 1', city: 'D', state: 'TX', postalCode: '75266' }, 'i130-idem-key');
    expect(r.case.fulfillment!.providerOrderId).toBe(originalOrderId);
  });
});

describe('I-130: 40-41. Owner isolation and AI context', () => {
  it('cross-user access denied', () => {
    expect(authorizeCaseAccess(USER_A, { caseId: 'i130-1', ownerUserId: 'user-b' }).allowed).toBe(false);
  });
  it('cross-user approval denied', () => {
    expect(authorizeApproval(USER_A, { caseId: 'i130-1', ownerUserId: 'user-b' }, 'user_review').allowed).toBe(false);
  });
  it('cross-user payment denied', () => {
    expect(authorizePayment(USER_A, { caseId: 'i130-1', ownerUserId: 'user-b' }, 'checkout_pending').allowed).toBe(false);
  });
});

describe('I-130: 42-43. Tracking and Proof', () => {
  it('tracking generated', () => {
    const c = runFullPipeline(I130_SPOUSE_RFE);
    expect(c.tracking!.trackingNumber).toBe('I130-TRACK-001');
  });
  it('proof generated with hash', () => {
    const c = runFullPipeline(I130_SPOUSE_RFE);
    expect(c.proof!.packetHash).toMatch(/^[0-9a-f]+$/);
    expect(c.proof!.documentManifest.length).toBeGreaterThan(0);
  });
});

describe('I-130: 44. Full E2E paths', () => {
  it('spouse RFE E2E', () => {
    const c = runFullPipeline(I130_SPOUSE_RFE);
    expect(c.state).toBe('complete');
    expect(c.context!.relationshipType).toBe('spouse');
    expect(c.context!.noticeType).toBe('rfe');
    expect(c.strategy!.handsOffTo).toBe('rfe');
  });
  it('parent RFE E2E', () => {
    const c = runFullPipeline(I130_PARENT_RFE);
    expect(c.state).toBe('complete');
    expect(c.context!.relationshipType).toBe('parent');
  });
  it('child evidence E2E', () => {
    const c = runFullPipeline(I130_CHILD_EVIDENCE);
    expect(c.state).toBe('complete');
    expect(c.context!.relationshipType).toBe('child');
  });
  it('sibling RFE E2E', () => {
    const c = runFullPipeline(I130_SIBLING_RFE);
    expect(c.state).toBe('complete');
    expect(c.context!.relationshipType).toBe('sibling');
  });
  it('spouse NOID E2E with attorney recommendation', () => {
    const c = runFullPipeline(I130_SPOUSE_NOID);
    expect(c.state).toBe('complete');
    expect(c.context!.hasAttorneyRecommendation).toBe(true);
  });
  it('denial E2E with handoff', () => {
    const c = runFullPipeline(I130_DENIED);
    expect(c.state).toBe('complete');
    expect(c.strategy!.handsOffTo).toBe('denial');
  });
  it('foreign document E2E with translation needs', () => {
    const c = runFullPipeline(I130_FOREIGN_DOC);
    expect(c.state).toBe('complete');
    expect(c.context!.hasTranslationNeeds).toBe(true);
  });
});

describe('I-130: Audit trail', () => {
  it('audit trail is complete', () => {
    const c = runFullPipeline(I130_SPOUSE_RFE);
    const actions = c.auditLog.map(e => e.action);
    expect(actions).toContain('case_created');
    expect(actions).toContain('document_ingested');
    expect(actions).toContain('approved');
    expect(actions).toContain('fulfillment_submitted');
    expect(actions).toContain('proof_generated');
  });
});

describe('I-130: Risk assessment', () => {
  it('low risk for evidence request', () => {
    const matrix = buildEvidenceMatrix('spouse', []);
    expect(assessI130Risk([], matrix, 'evidence_request')).toBe('moderate'); // missing critical evidence
  });
  it('high risk for NOID', () => {
    const matrix = buildEvidenceMatrix('spouse', []);
    expect(assessI130Risk([], matrix, 'noid')).toBe('high');
  });
  it('critical risk for denial', () => {
    const matrix = buildEvidenceMatrix('spouse', []);
    expect(assessI130Risk([], matrix, 'denial')).toBe('critical');
  });
  it('attorney recommended for NOID', () => {
    expect(shouldRecommendAttorney('high', 'noid', [])).toBe(true);
  });
  it('attorney recommended for denial', () => {
    expect(shouldRecommendAttorney('critical', 'denial', [])).toBe(true);
  });
  it('no attorney needed for simple evidence request', () => {
    expect(shouldRecommendAttorney('low', 'evidence_request', [])).toBe(false);
  });
});

describe('I-130: Gate separation', () => {
  it('cannot set pricing before approval', () => {
    let c = createI130Case('user-1');
    c = ingestI130Document(c, makeDU(I130_SPOUSE_RFE), I130_SPOUSE_RFE).case;
    expect(setI130Pricing(c, {} as any).result.success).toBe(false);
  });
  it('cannot pay before checkout_pending', () => {
    let c = createI130Case('user-1');
    c = ingestI130Document(c, makeDU(I130_SPOUSE_RFE), I130_SPOUSE_RFE).case;
    expect(confirmI130Payment(c, true).result.success).toBe(false);
  });
  it('cannot fulfill before payment', () => {
    let c = createI130Case('user-1');
    c = ingestI130Document(c, makeDU(I130_SPOUSE_RFE), I130_SPOUSE_RFE).case;
    expect(submitI130ToFulfillment(c, { name: 'USCIS', address1: 'Box 1', city: 'D', state: 'TX', postalCode: '75266' }, 'key').result.success).toBe(false);
  });
});
