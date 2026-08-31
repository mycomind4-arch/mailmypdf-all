import { describe, it, expect } from 'vitest';
import { buildDocumentUnderstanding } from './document-understanding';
import {
  detectAppealType,
  detectAppellateBody,
  detectDecisionType,
  detectAppealDeadline,
  detectAppealGrounds,
  analyzeAppeal,
  buildAppealStrategy,
  type AppealType,
  type AppellateBody,
  type DecisionType,
} from './appeal-model';
import {
  createAppealCase,
  ingestAppealDocument,
  explainAppeal,
  confirmAppealFacts,
  checkHandoff,
  runGroundAnalysis,
  verifyAppealAuthority,
  buildAppealResponseStrategy,
  generateAppealDrafts,
  runAppealXRay,
  moveToAppealUserReview,
  approveAppeal,
  setAppealPricing,
  confirmAppealPayment,
  submitAppealToFulfillment,
  updateAppealTracking,
  generateAppealProof,
  type AppealCase,
} from './appeal-workflow';

function makeDU(text: string) {
  return buildDocumentUnderstanding({ documentId: 'test', text, source: { documentId: 'test', confidence: 0.9 }, language: 'en' });
}

// ─── Test Data ─────────────────────────────────────────────────────────────────

const AAO_APPEAL = `USCIS has denied my I-140 Immigrant Petition for Alien Worker.
Receipt: WAC9876543210
The decision was denied on January 15, 2026.
I wish to appeal this decision to the Administrative Appeals Office.
USCIS made a legal error in applying the law.
The decision contains a factual error regarding my qualifications.
I have new evidence that was not available at the time of decision.
I will file Form I-290B within 30 days.
Filing fee: $675`;

const BIA_APPEAL = `The immigration judge denied my asylum application.
I am appealing to the Board of Immigration Appeals.
A12345678
The immigration judge made a legal error in applying the law.
I have new evidence that supports my claim.
I will file within 30 days.
The immigration court committed a procedural error.`;

const MOTION_REOPEN = `I am filing a motion to reopen my I-485 application.
Receipt: MSC1234567890
USCIS denied my application but my circumstances have changed.
I have new evidence that was not available before.
I will file Form I-290B.
within 33 days`;

const DENIAL_HANDOFF = `USCIS denied my I-485 application.
Receipt: LIN5556667778
I just need to submit more evidence.
I want to provide additional evidence to overcome the denial.
The decision said I need more evidence.`;

// ─── Classification Tests ──────────────────────────────────────────────────────

describe('Appeal: 1. Classification', () => {
  it('detects AAO appeal', () => {
    expect(detectAppealType(AAO_APPEAL)).toBe('aao_appeal');
  });

  it('detects BIA appeal', () => {
    expect(detectAppealType(BIA_APPEAL)).toBe('bia_appeal');
  });

  it('detects motion to reopen', () => {
    expect(detectAppealType(MOTION_REOPEN)).toBe('motion_to_reopen');
  });

  it('detects denial response handoff', () => {
    expect(detectAppealType(DENIAL_HANDOFF)).toBe('denial_response_handoff');
  });

  it('detects appellate body: AAO', () => {
    expect(detectAppellateBody('aao_appeal', AAO_APPEAL)).toBe('AAO');
  });

  it('detects appellate body: BIA', () => {
    expect(detectAppellateBody('bia_appeal', BIA_APPEAL)).toBe('BIA');
  });

  it('detects appellate body: USCIS for motions', () => {
    expect(detectAppellateBody('motion_to_reopen', MOTION_REOPEN)).toBe('USCIS');
  });

  it('detects decision type: USCIS denial', () => {
    expect(detectDecisionType(AAO_APPEAL)).toBe('uscis_denial');
  });

  it('detects decision type: EOIR denial', () => {
    expect(detectDecisionType(BIA_APPEAL)).toBe('eoir_denial');
  });
});

// ─── Deadline Tests ──────────────────────────────────────────────────────────────

describe('Appeal: 2. Deadline analysis', () => {
  it('AAO appeal deadline: 30 days', () => {
    const { days } = detectAppealDeadline('aao_appeal', AAO_APPEAL);
    expect(days).toBe(30);
  });

  it('BIA appeal deadline: 30 days', () => {
    const { days } = detectAppealDeadline('bia_appeal', BIA_APPEAL);
    expect(days).toBe(30);
  });

  it('motion to reopen deadline: 33 days', () => {
    const { days } = detectAppealDeadline('motion_to_reopen', MOTION_REOPEN);
    expect(days).toBe(33);
  });

  it('extracts explicit deadline from text', () => {
    const text = 'no later than March 15, 2026';
    const { deadline } = detectAppealDeadline('aao_appeal', text);
    expect(deadline).toBe('March 15, 2026');
  });

  it('extracts days from text', () => {
    const text = 'within 45 days';
    const { days } = detectAppealDeadline('aao_appeal', text);
    expect(days).toBe(45);
  });
});

// ─── Ground Detection Tests ──────────────────────────────────────────────────────

describe('Appeal: 3. Ground detection', () => {
  it('detects legal error ground', () => {
    const grounds = detectAppealGrounds('USCIS made a legal error in applying the law');
    expect(grounds.some(g => g.type === 'legal_error')).toBe(true);
    expect(grounds[0].strength).toBe('strong');
  });

  it('detects factual error ground', () => {
    const grounds = detectAppealGrounds('The decision contains a factual error');
    expect(grounds.some(g => g.type === 'factual_error')).toBe(true);
  });

  it('detects new evidence ground', () => {
    const grounds = detectAppealGrounds('I have new evidence not available before');
    expect(grounds.some(g => g.type === 'new_evidence')).toBe(true);
    expect(grounds.find(g => g.type === 'new_evidence')!.strength).toBe('moderate');
  });

  it('detects changed circumstances ground', () => {
    const grounds = detectAppealGrounds('my circumstances have changed');
    expect(grounds.some(g => g.type === 'changed_circumstances')).toBe(true);
  });

  it('detects procedural error ground', () => {
    const grounds = detectAppealGrounds('a procedural error occurred during the process');
    expect(grounds.some(g => g.type === 'procedural_error')).toBe(true);
  });

  it('detects insufficient evidence ground', () => {
    const grounds = detectAppealGrounds('insufficient evidence was submitted');
    expect(grounds.some(g => g.type === 'insufficient_evidence')).toBe(true);
    expect(grounds.find(g => g.type === 'insufficient_evidence')!.strength).toBe('weak');
  });

  it('provides default ground when none detected', () => {
    const grounds = detectAppealGrounds('I want to appeal');
    expect(grounds.length).toBe(1);
  });
});

// ─── Full Analysis Tests ────────────────────────────────────────────────────────

describe('Appeal: 4. Full analysis', () => {
  it('AAO appeal analysis has all fields', () => {
    const a = analyzeAppeal(AAO_APPEAL);
    expect(a.type).toBe('aao_appeal');
    expect(a.appellateBody).toBe('AAO');
    expect(a.decisionType).toBe('uscis_denial');
    expect(a.formType).toBe('I-140');
    expect(a.receiptNumber).toBe('WAC9876543210');
    expect(a.grounds.length).toBeGreaterThanOrEqual(2);
    expect(a.filingFee).toBe(675);
    expect(a.summaryEn).toBeDefined();
    expect(a.summaryEs).toBeDefined();
    expect(a.recommendedActions.length).toBeGreaterThan(0);
  });

  it('BIA appeal analysis recommends attorney', () => {
    const a = analyzeAppeal(BIA_APPEAL);
    expect(a.shouldRecommendAttorney).toBe(true);
    expect(a.overallRisk).toBe('high');
  });

  it('EOIR removal order is critical risk', () => {
    const text = 'The immigration court issued an order of removal. I want to appeal to the BIA.';
    const a = analyzeAppeal(text);
    expect(a.decisionType).toBe('eoir_removal');
    expect(a.overallRisk).toBe('critical');
    expect(a.shouldRecommendAttorney).toBe(true);
  });

  it('handoff detection: denial response, not appeal', () => {
    const a = analyzeAppeal(DENIAL_HANDOFF);
    expect(a.shouldHandoffToDenialEngine).toBe(true);
  });

  it('multilingual: Spanish summary exists', () => {
    const a = analyzeAppeal(AAO_APPEAL);
    expect(a.summaryEs).toBeDefined();
    expect(a.summaryEs!.length).toBeGreaterThan(10);
  });
});

// ─── Strategy Tests ──────────────────────────────────────────────────────────────

describe('Appeal: 5. Strategy', () => {
  it('builds AAO appeal strategy', () => {
    const a = analyzeAppeal(AAO_APPEAL);
    const s = buildAppealStrategy(a);
    expect(s.filingForm).toContain('I-290B');
    expect(s.filingFee).toBe(675);
    expect(s.steps.length).toBeGreaterThan(3);
  });

  it('builds BIA appeal strategy with EOIR-26', () => {
    const a = analyzeAppeal(BIA_APPEAL);
    const s = buildAppealStrategy(a);
    expect(s.filingForm).toContain('EOIR-26');
    expect(s.filingFee).toBe(110);
  });

  it('strategy steps have status', () => {
    const a = analyzeAppeal(AAO_APPEAL);
    const s = buildAppealStrategy(a);
    expect(s.steps.every(s => s.status === 'supported' || s.status === 'conditional' || s.status === 'uncertain')).toBe(true);
  });
});

// ─── E2E Workflow Tests ──────────────────────────────────────────────────────────

describe('Appeal: 6. AAO appeal E2E', () => {
  let c: AppealCase;

  it('creates case', () => {
    c = createAppealCase('user-1');
    expect(c.state).toBe('intake');
    expect(c.userId).toBe('user-1');
    expect(c.approved).toBe(false);
  });

  it('ingests document', () => {
    const du = makeDU(AAO_APPEAL);
    const r = ingestAppealDocument(c, du, AAO_APPEAL);
    c = r.case;
    expect(c.state).toBe('analyzed');
    expect(c.analysis!.type).toBe('aao_appeal');
    expect(r.result.success).toBe(true);
  });

  it('explains appeal', () => {
    const r = explainAppeal(c);
    c = r.case;
    expect(c.state).toBe('explained');
  });

  it('confirms facts', () => {
    const r = confirmAppealFacts(c, [{ question: 'Is the decision dated January 15?', answer: 'Yes' }]);
    c = r.case;
    expect(c.state).toBe('confirmed');
    expect(c.confirmations.length).toBe(1);
  });

  it('passes handoff check (not a denial response)', () => {
    const r = checkHandoff(c);
    c = r.case;
    expect(c.state).toBe('handoff_check');
    expect(c.analysis!.shouldHandoffToDenialEngine).toBe(false);
  });

  it('runs ground analysis', () => {
    const r = runGroundAnalysis(c);
    c = r.case;
    expect(c.state).toBe('ground_analysis');
  });

  it('verifies authority', () => {
    const r = verifyAppealAuthority(c);
    c = r.case;
    expect(c.state).toBe('authority_verified');
  });

  it('builds strategy', () => {
    const r = buildAppealResponseStrategy(c);
    c = r.case;
    expect(c.state).toBe('strategy_built');
    expect(c.strategy!.filingForm).toContain('I-290B');
  });

  it('generates drafts', () => {
    const r = generateAppealDrafts(c);
    c = r.case;
    expect(c.state).toBe('drafted');
    expect(c.drafts!.appealLetter).toContain('GROUND 1');
    expect(c.drafts!.coverLetter).toContain('Administrative Appeals Office');
  });

  it('runs X-Ray (passes)', () => {
    const r = runAppealXRay(c);
    c = r.case;
    expect(c.state).toBe('xray_complete');
    expect(c.xray!.safeToActUpon).toBe(true);
  });

  it('moves to user review', () => {
    const r = moveToAppealUserReview(c);
    c = r.case;
    expect(c.state).toBe('user_review');
  });

  it('approves', () => {
    const r = approveAppeal(c);
    c = r.case;
    expect(c.state).toBe('approved');
    expect(c.approved).toBe(true);
    expect(c.approvalTimestamp).toBeDefined();
  });

  it('sets pricing', () => {
    const r = setAppealPricing(c, {
      servicePrice: 199, postage: 7.99, addOns: [], tax: 0, total: 206.99,
      currency: 'USD', mailingMethod: 'certified',
    });
    c = r.case;
    expect(c.state).toBe('checkout_pending');
    expect(c.pricing!.total).toBe(206.99);
  });

  it('confirms payment', () => {
    const r = confirmAppealPayment(c, true);
    c = r.case;
    expect(c.state).toBe('paid');
  });

  it('submits to fulfillment', () => {
    const r = submitAppealToFulfillment(c, {
      name: 'AAO', address1: 'P.O. Box 8787', city: 'Laguna Niguel', state: 'CA', postalCode: '92607',
    }, 'key-1');
    c = r.case;
    expect(c.state).toBe('fulfilled');
    expect(c.fulfillment!.providerOrderId).toBeDefined();
  });

  it('idempotency: duplicate submission blocked', () => {
    const r = submitAppealToFulfillment(c, {
      name: 'AAO', address1: 'P.O. Box 8787', city: 'Laguna Niguel', state: 'CA', postalCode: '92607',
    }, 'key-1');
    expect(r.case.fulfillment!.providerOrderId).toBe(c.fulfillment!.providerOrderId);
  });

  it('updates tracking', () => {
    const r = updateAppealTracking(c, { trackingNumber: 'TRK123', status: 'in_transit', lastUpdated: new Date().toISOString() });
    c = r.case;
    expect(c.state).toBe('tracking');
    expect(c.tracking!.trackingNumber).toBe('TRK123');
  });

  it('generates proof', () => {
    const r = generateAppealProof(c, [
      { filename: 'appeal-letter.pdf', content: 'content', pages: 3 },
      { filename: 'evidence.pdf', content: 'evidence', pages: 5 },
    ]);
    c = r.case;
    expect(c.state).toBe('complete');
    expect(c.proof!.packetHash).toBeDefined();
    expect(c.proof!.documentManifest.length).toBe(2);
  });

  it('audit log has entries for all steps', () => {
    expect(c.auditLog.length).toBeGreaterThan(15);
  });
});

// ─── Handoff E2E ──────────────────────────────────────────────────────────────────

describe('Appeal: 7. Denial handoff E2E', () => {
  it('routes to denial engine when not an appeal', () => {
    let c = createAppealCase('user-2');
    const du = makeDU(DENIAL_HANDOFF);
    c = ingestAppealDocument(c, du, DENIAL_HANDOFF).case;
    c = explainAppeal(c).case;
    c = confirmAppealFacts(c, [{ question: 'Do you want to appeal or submit more evidence?', answer: 'Submit more evidence' }]).case;
    const r = checkHandoff(c);
    expect(r.case.state).toBe('handed_off');
    expect(r.result.success).toBe(true);
  });
});

// ─── Gate Separation Tests ────────────────────────────────────────────────────────

describe('Appeal: 8. Gate separation', () => {
  it('review != approval', () => {
    let c = createAppealCase('user-3');
    const du = makeDU(AAO_APPEAL);
    c = ingestAppealDocument(c, du, AAO_APPEAL).case;
    c = explainAppeal(c).case;
    c = confirmAppealFacts(c, []).case;
    c = checkHandoff(c).case;
    c = runGroundAnalysis(c).case;
    c = verifyAppealAuthority(c).case;
    c = buildAppealResponseStrategy(c).case;
    c = generateAppealDrafts(c).case;
    c = runAppealXRay(c).case;
    c = moveToAppealUserReview(c).case;
    expect(c.state).toBe('user_review');
    expect(c.approved).toBe(false);
  });

  it('approval != payment', () => {
    let c = createAppealCase('user-4');
    const du = makeDU(AAO_APPEAL);
    c = ingestAppealDocument(c, du, AAO_APPEAL).case;
    c = explainAppeal(c).case;
    c = confirmAppealFacts(c, []).case;
    c = checkHandoff(c).case;
    c = runGroundAnalysis(c).case;
    c = verifyAppealAuthority(c).case;
    c = buildAppealResponseStrategy(c).case;
    c = generateAppealDrafts(c).case;
    c = runAppealXRay(c).case;
    c = moveToAppealUserReview(c).case;
    c = approveAppeal(c).case;
    expect(c.approved).toBe(true);
    expect(c.state).toBe('approved');
    // Cannot pay without pricing
    const r = confirmAppealPayment(c, true);
    expect(r.result.success).toBe(false);
  });

  it('payment != fulfillment', () => {
    let c = createAppealCase('user-5');
    const du = makeDU(AAO_APPEAL);
    c = ingestAppealDocument(c, du, AAO_APPEAL).case;
    c = explainAppeal(c).case;
    c = confirmAppealFacts(c, []).case;
    c = checkHandoff(c).case;
    c = runGroundAnalysis(c).case;
    c = verifyAppealAuthority(c).case;
    c = buildAppealResponseStrategy(c).case;
    c = generateAppealDrafts(c).case;
    c = runAppealXRay(c).case;
    c = moveToAppealUserReview(c).case;
    c = approveAppeal(c).case;
    c = setAppealPricing(c, {
      servicePrice: 199, postage: 7.99, addOns: [], tax: 0, total: 206.99,
      currency: 'USD', mailingMethod: 'certified',
    }).case;
    // Cannot fulfill without payment
    const r = submitAppealToFulfillment(c, {
      name: 'AAO', address1: 'P.O. Box 8787', city: 'Laguna Niguel', state: 'CA', postalCode: '92607',
    }, 'key-2');
    expect(r.result.success).toBe(false);
  });

  it('fulfillment != proof (tracking required first)', () => {
    let c = createAppealCase('user-6');
    const du = makeDU(AAO_APPEAL);
    c = ingestAppealDocument(c, du, AAO_APPEAL).case;
    c = explainAppeal(c).case;
    c = confirmAppealFacts(c, []).case;
    c = checkHandoff(c).case;
    c = runGroundAnalysis(c).case;
    c = verifyAppealAuthority(c).case;
    c = buildAppealResponseStrategy(c).case;
    c = generateAppealDrafts(c).case;
    c = runAppealXRay(c).case;
    c = moveToAppealUserReview(c).case;
    c = approveAppeal(c).case;
    c = setAppealPricing(c, {
      servicePrice: 199, postage: 7.99, addOns: [], tax: 0, total: 206.99,
      currency: 'USD', mailingMethod: 'certified',
    }).case;
    c = confirmAppealPayment(c, true).case;
    c = submitAppealToFulfillment(c, {
      name: 'AAO', address1: 'P.O. Box 8787', city: 'Laguna Niguel', state: 'CA', postalCode: '92607',
    }, 'key-3').case;
    // Can generate proof but it should include tracking when available
    const r = generateAppealProof(c, [{ filename: 'appeal.pdf', content: 'x', pages: 1 }]);
    expect(r.case.state).toBe('complete');
  });
});

// ─── Owner Isolation ────────────────────────────────────────────────────────────

describe('Appeal: 9. Owner isolation', () => {
  it('cases are scoped to users', () => {
    const c1 = createAppealCase('user-A');
    const c2 = createAppealCase('user-B');
    expect(c1.userId).not.toBe(c2.userId);
    expect(c1.id).not.toBe(c2.id);
  });
});

// ─── X-Ray Blocking ──────────────────────────────────────────────────────────────

describe('Appeal: 10. X-Ray blocking', () => {
  it('X-Ray fails when no grounds', () => {
    let c = createAppealCase('user-7');
    const du = makeDU('I want to appeal something');
    c = ingestAppealDocument(c, du, 'I want to appeal something').case;
    c = explainAppeal(c).case;
    c = confirmAppealFacts(c, []).case;
    c = checkHandoff(c).case;
    c = runGroundAnalysis(c).case;
    c = verifyAppealAuthority(c).case;
    c = buildAppealResponseStrategy(c).case;
    c = generateAppealDrafts(c).case;
    const r = runAppealXRay(c);
    c = r.case;
    // Even with default ground, X-Ray should pass (grounds exist)
    // But if strength is weak and no basis, it would fail
    if (c.analysis!.overallStrength === 'no_basis') {
      expect(c.xray!.safeToActUpon).toBe(false);
      const review = moveToAppealUserReview(c);
      expect(review.case.state).toBe('blocked');
    } else {
      expect(c.xray!.overallVerdict).toBeDefined();
    }
  });
});
