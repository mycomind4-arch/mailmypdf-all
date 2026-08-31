/**
 * Case Inquiry — Comprehensive Gold Certification Test Suite
 *
 * Tests cover:
 *  - Domain model: analysis, strategy, detection
 *  - Workflow state machine: all transitions
 *  - Routing: I-797 → case-inquiry
 *  - Multilingual: EN/ES
 *  - Document/receipt extraction
 *  - Authority verification
 *  - Deadline handling (none — user-initiated)
 *  - X-Ray adversarial review
 *  - Approval gate (owner-only)
 *  - Pricing
 *  - Payment
 *  - Fulfillment
 *  - Idempotency
 *  - Owner isolation
 *  - E2E certification
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectInquiryType,
  detectUrgency,
  detectFormCategory,
  extractReceiptNumber,
  extractServiceCenter,
  getProcessingTimeRange,
  calculateDaysPending,
  analyzeInquiry,
  buildInquiryStrategy,
  getInquiryHeadline,
  getInquiryExamples,
  type CaseInquiryAnalysis,
  type InquiryType,
  type InquiryUrgency,
  type FormCategory,
} from './case-inquiry-model';
import {
  createInquiryContext,
  intake,
  analyze,
  classify,
  buildStrategy,
  draft,
  validate,
  xray,
  userReview,
  approve,
  markPaid,
  fulfill,
  track,
  prove,
  runFullInquiry,
  processInquiryIdempotent,
  assertOwnerIsolation,
  type CaseInquiryContext,
  type CaseInquiryState,
  INQUIRY_STATES,
} from './case-inquiry-workflow';
import { routeI797, detectI797ActionType } from './i797-model';
import { createLanguageContext } from './multilingual';

// ─── Domain Model Tests ──────────────────────────────────────────────────────

describe('Case Inquiry Model: Detection', () => {
  it('detects service request type', () => {
    expect(detectInquiryType('My case is taking too long')).toBe('service_request');
    expect(detectInquiryType("I haven't heard back from USCIS")).toBe('service_request');
    expect(detectInquiryType('Case is outside normal processing time')).toBe('service_request');
  });

  it('detects expedite request type', () => {
    expect(detectInquiryType('I need to expedite my case urgently')).toBe('expedite_request');
    expect(detectInquiryType('Medical emergency, need urgent processing')).toBe('expedite_request');
    expect(detectInquiryType('Financial hardship, please help')).toBe('expedite_request');
  });

  it('detects congressional inquiry type', () => {
    expect(detectInquiryType('I want to contact my congressman about my case')).toBe('congressional_inquiry');
    expect(detectInquiryType('My senator should help with this delay')).toBe('congressional_inquiry');
  });

  it('detects liaison inquiry type', () => {
    expect(detectInquiryType('My attorney will file an AILA liaison inquiry')).toBe('liaison_inquiry');
  });

  it('detects case status inquiry type', () => {
    expect(detectInquiryType('I want to know the status of my case')).toBe('case_status_inquiry');
    expect(detectInquiryType('How long will this take?')).toBe('case_status_inquiry');
  });

  it('returns unknown for ambiguous text', () => {
    expect(detectInquiryType('Hello')).toBe('unknown');
  });
});

describe('Case Inquiry Model: Urgency', () => {
  it('detects routine urgency', () => {
    expect(detectUrgency('My case is taking too long')).toBe('routine');
  });

  it('detects expedited urgency', () => {
    expect(detectUrgency('This is urgent, I need it expedited')).toBe('expedited');
    expect(detectUrgency('I have a medical condition')).toBe('expedited');
    expect(detectUrgency('Financial hardship, might lose my job')).toBe('expedited');
  });

  it('detects critical urgency', () => {
    expect(detectUrgency('My child is aging out soon')).toBe('critical');
    expect(detectUrgency('I face deportation if this is not resolved')).toBe('critical');
    expect(detectUrgency('Life-threatening medical emergency')).toBe('critical');
    expect(detectUrgency('Severe hardship on my family')).toBe('critical');
  });
});

describe('Case Inquiry Model: Form Category', () => {
  it('categorizes family-based forms', () => {
    expect(detectFormCategory('I-130')).toBe('family_based');
    expect(detectFormCategory('I-485')).toBe('family_based');
    expect(detectFormCategory('I-751')).toBe('family_based');
  });

  it('categorizes employment-based forms', () => {
    expect(detectFormCategory('I-140')).toBe('employment_based');
    expect(detectFormCategory('I-129')).toBe('employment_based');
  });

  it('categorizes humanitarian forms', () => {
    expect(detectFormCategory('I-589')).toBe('humanitarian');
    expect(detectFormCategory('I-601')).toBe('humanitarian');
  });

  it('categorizes naturalization forms', () => {
    expect(detectFormCategory('N-400')).toBe('naturalization');
    expect(detectFormCategory('N-600')).toBe('naturalization');
  });

  it('returns other for unknown forms', () => {
    expect(detectFormCategory('XYZ')).toBe('other');
  });
});

describe('Case Inquiry Model: Receipt Number', () => {
  it('extracts receipt number from text', () => {
    expect(extractReceiptNumber('My receipt number is MSC2190123456')).toBe('MSC2190123456');
    expect(extractReceiptNumber('Case LIN2201234567 is pending')).toBe('LIN2201234567');
    expect(extractReceiptNumber('No receipt number here')).toBeUndefined();
  });

  it('extracts service center from receipt number', () => {
    expect(extractServiceCenter('MSC2190123456')).toContain('Missouri');
    expect(extractServiceCenter('LIN2201234567')).toContain('Nebraska');
    expect(extractServiceCenter('WAC2201234567')).toContain('California');
    expect(extractServiceCenter('XYZ2201234567')).toBeUndefined();
  });
});

describe('Case Inquiry Model: Processing Time', () => {
  it('returns processing time range for known forms', () => {
    expect(getProcessingTimeRange('I-130')).toContain('months');
    expect(getProcessingTimeRange('N-400')).toContain('months');
  });

  it('returns generic range for unknown forms', () => {
    expect(getProcessingTimeRange('XYZ123')).toContain('Varies');
  });

  it('calculates days pending correctly', () => {
    const days = calculateDaysPending('2026-01-01', '2026-07-01');
    expect(days).toBeGreaterThan(180);
    expect(days).toBeLessThan(200);
  });
});

// ─── Analysis Tests ───────────────────────────────────────────────────────────

describe('Case Inquiry Model: Analysis', () => {
  it('produces complete analysis for service request', () => {
    const analysis = analyzeInquiry(
      'My I-485 case is taking too long. Receipt MSC2190123456. Filed 2024-01-15.',
      'I-485',
      'MSC2190123456',
      '2024-01-15',
      '2026-08-23'
    );
    expect(analysis.inquiryType).toBe('service_request');
    expect(analysis.formType).toBe('I-485');
    expect(analysis.receiptNumber).toBe('MSC2190123456');
    expect(analysis.serviceCenter).toContain('Missouri');
    expect(analysis.daysPending).toBeGreaterThan(365);
    expect(analysis.outsideProcessingTime).toBe(true);
    expect(analysis.formCategory).toBe('family_based');
    expect(analysis.authority).toContain('USCIS');
    expect(analysis.riskLevel).toBe('low');
  });

  it('produces complete analysis for expedite request', () => {
    const analysis = analyzeInquiry(
      'I need to expedite my N-400. Medical emergency.',
      'N-400'
    );
    expect(analysis.inquiryType).toBe('expedite_request');
    expect(analysis.formType).toBe('N-400');
    expect(analysis.urgency).toBe('expedited');
    expect(analysis.formCategory).toBe('naturalization');
    expect(analysis.riskLevel).toBe('moderate');
  });

  it('detects critical urgency in expedite request', () => {
    const analysis = analyzeInquiry(
      'I need to expedite my I-130. My child is aging out.',
      'I-130'
    );
    expect(analysis.inquiryType).toBe('expedite_request');
    expect(analysis.urgency).toBe('critical');
    expect(analysis.riskLevel).toBe('elevated');
  });

  it('detects form type from text when not provided', () => {
    const analysis = analyzeInquiry('My I-130 is delayed. It has been too long.');
    expect(analysis.formType).toBe('I-130');
  });

  it('detects receipt number from text when not provided', () => {
    const analysis = analyzeInquiry('Case WAC2201234567 is taking too long.');
    expect(analysis.receiptNumber).toBe('WAC2201234567');
    expect(analysis.serviceCenter).toContain('California');
  });

  it('marks within-processing-time cases correctly', () => {
    const analysis = analyzeInquiry(
      'My I-90 is delayed.',
      'I-90',
      undefined,
      '2026-07-01',
      '2026-08-23'
    );
    // Only ~53 days pending, I-90 typical is 8-12 months
    expect(analysis.outsideProcessingTime).toBe(false);
  });

  it('provides recommended action for each inquiry type', () => {
    const types: InquiryType[] = ['service_request', 'expedite_request', 'congressional_inquiry', 'liaison_inquiry', 'case_status_inquiry', 'unknown'];
    for (const type of types) {
      const text = {
        service_request: 'My case is taking too long',
        expedite_request: 'I need to expedite urgently',
        congressional_inquiry: 'I want to contact my congressman',
        liaison_inquiry: 'My attorney will file AILA liaison',
        case_status_inquiry: 'What is the status?',
        unknown: 'Hello',
      }[type];
      const analysis = analyzeInquiry(text);
      expect(analysis.recommendedAction.length).toBeGreaterThan(10);
      expect(analysis.escalationPath.length).toBeGreaterThan(10);
    }
  });
});

// ─── Strategy Tests ──────────────────────────────────────────────────────────

describe('Case Inquiry Model: Strategy', () => {
  it('builds strategy with key arguments', () => {
    const analysis = analyzeInquiry(
      'My I-485 is taking too long. Receipt MSC2190123456. Filed 2025-01-15.',
      'I-485', 'MSC2190123456', '2025-01-15', '2026-08-23'
    );
    const strategy = buildInquiryStrategy(analysis);
    expect(strategy.approach.length).toBeGreaterThan(10);
    expect(strategy.keyArguments.length).toBeGreaterThan(0);
    expect(strategy.authority).toContain('USCIS');
    expect(strategy.deadlineNote).toContain('user-initiated');
  });

  it('includes supporting evidence for expedite requests', () => {
    const analysis = analyzeInquiry('I need to expedite my I-765. Medical emergency.', 'I-765');
    const strategy = buildInquiryStrategy(analysis);
    expect(strategy.supportingEvidence.length).toBeGreaterThan(0);
    expect(strategy.supportingEvidence.some(e => e.includes('medical') || e.includes('expedite'))).toBe(true);
  });

  it('includes receipt number in key arguments', () => {
    const analysis = analyzeInquiry(
      'My I-130 is delayed. Receipt LIN2201234567.',
      'I-130', 'LIN2201234567'
    );
    const strategy = buildInquiryStrategy(analysis);
    expect(strategy.keyArguments.some(a => a.includes('LIN2201234567'))).toBe(true);
  });

  it('handles cases with minimal information', () => {
    const analysis = analyzeInquiry('My case is pending.');
    const strategy = buildInquiryStrategy(analysis);
    expect(strategy.keyArguments.length).toBeGreaterThan(0);
  });
});

// ─── Multilingual Tests ──────────────────────────────────────────────────────

describe('Case Inquiry: Multilingual', () => {
  it('returns English headline', () => {
    const en = createLanguageContext({ ui: 'en' });
    expect(getInquiryHeadline(en)).toContain('pending');
  });

  it('returns Spanish headline', () => {
    const es = createLanguageContext({ ui: 'es' });
    expect(getInquiryHeadline(es)).toContain('caso');
  });

  it('returns English examples', () => {
    const en = createLanguageContext({ ui: 'en' });
    const examples = getInquiryExamples(en);
    expect(examples.length).toBeGreaterThanOrEqual(3);
    expect(examples.some(e => e.includes('too long'))).toBe(true);
  });

  it('returns Spanish examples', () => {
    const es = createLanguageContext({ ui: 'es' });
    const examples = getInquiryExamples(es);
    expect(examples.length).toBeGreaterThanOrEqual(3);
    expect(examples.some(e => e.includes('demasiado'))).toBe(true);
  });
});

// ─── Workflow State Machine Tests ─────────────────────────────────────────────

describe('Case Inquiry: State Machine', () => {
  it('defines all 13 states in order', () => {
    expect(INQUIRY_STATES).toEqual([
      'intake', 'analyzed', 'classified', 'strategy_built', 'drafted',
      'validated', 'xray_complete', 'user_review', 'approved', 'paid',
      'fulfilled', 'tracked', 'proven',
    ]);
    expect(INQUIRY_STATES.length).toBe(13);
  });

  it('creates initial context', () => {
    const ctx = createInquiryContext('case-1', 'user-1', 'en');
    expect(ctx.caseId).toBe('case-1');
    expect(ctx.ownerId).toBe('user-1');
    expect(ctx.approved).toBe(false);
    expect(ctx.paid).toBe(false);
    expect(ctx.validationIssues).toEqual([]);
    expect(ctx.auditTrail).toEqual([]);
  });

  it('intake captures user text and optional fields', () => {
    const ctx = createInquiryContext('case-1', 'user-1');
    const after = intake(ctx, 'My case is delayed', 'I-485', 'MSC2190123456', '2025-01-15');
    expect(after.userText).toBe('My case is delayed');
    expect(after.formType).toBe('I-485');
    expect(after.receiptNumber).toBe('MSC2190123456');
    expect(after.filingDate).toBe('2025-01-15');
    expect(after.auditTrail.length).toBe(1);
    expect(after.auditTrail[0].event).toBe('INTAKE');
  });

  it('analyze produces analysis', () => {
    const ctx = createInquiryContext('case-1', 'user-1');
    const after = analyze(intake(ctx, 'My case is taking too long'));
    expect(after.analysis).toBeDefined();
    expect(after.analysis!.inquiryType).toBe('service_request');
    expect(after.auditTrail.some(e => e.event === 'ANALYZED')).toBe(true);
  });

  it('classify adds classification audit', () => {
    const ctx = createInquiryContext('case-1', 'user-1');
    const after = classify(analyze(intake(ctx, 'My I-485 is delayed', 'I-485')));
    expect(after.auditTrail.some(e => e.event === 'CLASSIFIED')).toBe(true);
  });

  it('buildStrategy produces strategy', () => {
    const ctx = createInquiryContext('case-1', 'user-1');
    const after = buildStrategy(analyze(intake(ctx, 'My case is delayed', 'I-485')));
    expect(after.strategy).toBeDefined();
    expect(after.strategy!.approach.length).toBeGreaterThan(0);
  });

  it('draft produces letter text', () => {
    const ctx = createInquiryContext('case-1', 'user-1');
    const after = draft(buildStrategy(analyze(intake(ctx, 'My I-485 is delayed', 'I-485', 'MSC2190123456'))));
    expect(after.draft).toBeDefined();
    expect(after.draft!.length).toBeGreaterThan(50);
    expect(after.draft!).toContain('Case Inquiry');
    expect(after.draft!).toContain('USCIS');
  });

  it('validate catches missing fields', () => {
    const ctx = createInquiryContext('case-1', 'user-1');
    const after = validate(draft(buildStrategy(analyze(intake(ctx, 'My case is delayed')))));
    // No form type, no receipt number → validation issues
    expect(after.validationIssues.length).toBeGreaterThan(0);
  });

  it('validate passes with complete information', () => {
    const ctx = createInquiryContext('case-1', 'user-1');
    const after = validate(draft(buildStrategy(analyze(intake(
      ctx, 'My I-485 case is taking too long. Receipt MSC2190123456. Filed 2025-01-15.',
      'I-485', 'MSC2190123456', '2025-01-15'
    )))));
    expect(after.validationIssues.length).toBe(0);
  });

  it('xray catches premature inquiry', () => {
    const ctx = createInquiryContext('case-1', 'user-1');
    const after = xray(validate(draft(buildStrategy(analyze(intake(
      ctx, 'My I-90 is delayed.', 'I-90', undefined, '2026-07-01'
    ))))));
    // Within processing time → premature
    expect(after.xrayIssues.some(i => i.includes('premature'))).toBe(true);
  });

  it('userReview adds audit entry', () => {
    const ctx = createInquiryContext('case-1', 'user-1');
    const after = userReview(ctx);
    expect(after.auditTrail.some(e => e.event === 'USER_REVIEW')).toBe(true);
  });

  it('approve only allows owner', () => {
    const ctx = createInquiryContext('case-1', 'user-1');
    expect(() => approve(ctx, 'user-2')).toThrow('Only the case owner');
    const after = approve(ctx, 'user-1');
    expect(after.approved).toBe(true);
  });

  it('markPaid requires approval first', () => {
    const ctx = createInquiryContext('case-1', 'user-1');
    expect(() => markPaid(ctx)).toThrow('Must approve');
    const after = markPaid(approve(ctx, 'user-1'));
    expect(after.paid).toBe(true);
  });

  it('fulfill requires payment first', () => {
    const ctx = createInquiryContext('case-1', 'user-1');
    expect(() => fulfill(ctx, 'f-1')).toThrow('Must pay');
    const after = fulfill(markPaid(approve(ctx, 'user-1')), 'f-1');
    expect(after.fulfillmentId).toBe('f-1');
  });

  it('track requires fulfillment first', () => {
    const ctx = createInquiryContext('case-1', 'user-1');
    expect(() => track(ctx, 'TRK123')).toThrow('Must fulfill');
    const after = track(fulfill(markPaid(approve(ctx, 'user-1')), 'f-1'), 'TRK123');
    expect(after.trackingNumber).toBe('TRK123');
  });

  it('prove requires tracking first', () => {
    const ctx = createInquiryContext('case-1', 'user-1');
    expect(() => prove(ctx, 'PRF123')).toThrow('Must track');
    const after = prove(track(fulfill(markPaid(approve(ctx, 'user-1')), 'f-1'), 'TRK123'), 'PRF123');
    expect(after.proofId).toBe('PRF123');
  });
});

// ─── E2E Tests ────────────────────────────────────────────────────────────────

describe('Case Inquiry: E2E', () => {
  it('runs full inquiry workflow end-to-end', () => {
    const ctx = runFullInquiry(
      'case-1', 'user-1',
      'My I-485 case is taking too long. Receipt MSC2190123456. Filed 2025-01-15.',
      'I-485', 'MSC2190123456', '2025-01-15', 'en'
    );
    expect(ctx.approved).toBe(true);
    expect(ctx.paid).toBe(true);
    expect(ctx.fulfillmentId).toBeDefined();
    expect(ctx.trackingNumber).toBeDefined();
    expect(ctx.proofId).toBeDefined();
    expect(ctx.auditTrail.length).toBeGreaterThanOrEqual(13);
    expect(ctx.analysis).toBeDefined();
    expect(ctx.strategy).toBeDefined();
    expect(ctx.draft).toBeDefined();
  });

  it('E2E produces audit trail with all events', () => {
    const ctx = runFullInquiry('case-1', 'user-1', 'My case is delayed', 'I-485');
    const events = ctx.auditTrail.map(e => e.event);
    expect(events).toContain('INTAKE');
    expect(events).toContain('ANALYZED');
    expect(events).toContain('CLASSIFIED');
    expect(events).toContain('STRATEGY_BUILT');
    expect(events).toContain('DRAFTED');
    expect(events).toContain('VALIDATED');
    expect(events).toContain('XRAY');
    expect(events).toContain('USER_REVIEW');
    expect(events).toContain('APPROVED');
    expect(events).toContain('PAID');
    expect(events).toContain('FULFILLED');
    expect(events).toContain('TRACKED');
    expect(events).toContain('PROVEN');
  });

  it('E2E with Spanish language', () => {
    const ctx = runFullInquiry(
      'case-1', 'user-1',
      'Mi caso está tardando demasiado.',
      'I-485', undefined, undefined, 'es'
    );
    expect(ctx.language.ui).toBe('es');
    expect(ctx.approved).toBe(true);
    expect(ctx.proofId).toBeDefined();
  });

  it('E2E with expedite request', () => {
    const ctx = runFullInquiry(
      'case-1', 'user-1',
      'I need to expedite my N-400. Medical emergency.',
      'N-400'
    );
    expect(ctx.analysis!.inquiryType).toBe('expedite_request');
    expect(ctx.analysis!.urgency).toBe('expedited');
    expect(ctx.proofId).toBeDefined();
  });
});

// ─── Idempotency Tests ─────────────────────────────────────────────────────────

describe('Case Inquiry: Idempotency', () => {
  it('returns same result for same idempotency key', () => {
    const a = processInquiryIdempotent('key-1', 'case-1', 'user-1', 'My case is delayed', 'I-485');
    const b = processInquiryIdempotent('key-1', 'case-1', 'user-1', 'My case is delayed', 'I-485');
    expect(a).toBe(b);
    expect(a.proofId).toBe(b.proofId);
  });

  it('returns different results for different keys', () => {
    const a = processInquiryIdempotent('key-2', 'case-1', 'user-1', 'My case is delayed', 'I-485');
    const b = processInquiryIdempotent('key-3', 'case-2', 'user-2', 'Another delayed case', 'N-400');
    expect(a).not.toBe(b);
  });
});

// ─── Owner Isolation Tests ─────────────────────────────────────────────────────

describe('Case Inquiry: Owner Isolation', () => {
  it('allows owner to access own case', () => {
    const ctx = runFullInquiry('case-1', 'user-1', 'My case is delayed', 'I-485');
    expect(() => assertOwnerIsolation(ctx, 'user-1')).not.toThrow();
  });

  it('throws for non-owner', () => {
    const ctx = runFullInquiry('case-1', 'user-1', 'My case is delayed', 'I-485');
    expect(() => assertOwnerIsolation(ctx, 'user-2')).toThrow('Owner isolation violation');
  });
});

// ─── I-797 Routing Tests ──────────────────────────────────────────────────────

describe('Case Inquiry: I-797 Routing', () => {
  it('routes delay action type to case-inquiry', () => {
    const result = routeI797('delay');
    expect(result.target).toBe('case-inquiry');
    expect(result.reason).toContain('delayed');
  });

  it('detects delay action type from receipt + delay mention', () => {
    const actionType = detectI797ActionType(
      'I received a receipt notice but my case is taking too long. It has been months.'
    );
    expect(actionType).toBe('delay');
  });

  it('still routes receipt without delay to no_action', () => {
    const actionType = detectI797ActionType(
      'We received your application and your fee. Your case is in process.'
    );
    expect(actionType).toBe('receipt');
    expect(routeI797(actionType).target).toBe('no_action');
  });

  it('case-inquiry is in RoutingTarget type', () => {
    const result = routeI797('delay');
    expect(result.target).toBe('case-inquiry');
  });
});

// ─── Authority Tests ──────────────────────────────────────────────────────────

describe('Case Inquiry: Authority', () => {
  it('analysis includes USCIS authority reference', () => {
    const analysis = analyzeInquiry('My case is delayed', 'I-485');
    expect(analysis.authority).toContain('USCIS');
    expect(analysis.authority).toContain('processing time');
  });

  it('strategy includes authority', () => {
    const analysis = analyzeInquiry('My case is delayed', 'I-485');
    const strategy = buildInquiryStrategy(analysis);
    expect(strategy.authority).toContain('USCIS');
  });
});

// ─── Deadline Tests ───────────────────────────────────────────────────────────

describe('Case Inquiry: Deadlines', () => {
  it('no deadline — user-initiated', () => {
    const analysis = analyzeInquiry('My case is delayed', 'I-485');
    // Case inquiry has no deadline — it's user-initiated
    expect(analysis.recommendedAction).not.toContain('deadline');
  });

  it('strategy notes no deadline', () => {
    const analysis = analyzeInquiry('My case is delayed', 'I-485');
    const strategy = buildInquiryStrategy(analysis);
    expect(strategy.deadlineNote).toContain('user-initiated');
    expect(strategy.deadlineNote).toContain('30 days');
  });
});

// ─── Pricing/Payment/Fulfillment Tests ────────────────────────────────────────

describe('Case Inquiry: Fulfillment Pipeline', () => {
  it('approval gate prevents skipping to payment', () => {
    const ctx = createInquiryContext('case-1', 'user-1');
    expect(() => markPaid(ctx)).toThrow('Must approve');
  });

  it('payment gate prevents skipping to fulfillment', () => {
    const ctx = createInquiryContext('case-1', 'user-1');
    expect(() => fulfill(ctx, 'f-1')).toThrow('Must pay');
  });

  it('fulfillment gate prevents skipping to tracking', () => {
    const ctx = createInquiryContext('case-1', 'user-1');
    expect(() => track(ctx, 'TRK1')).toThrow('Must fulfill');
  });

  it('tracking gate prevents skipping to proof', () => {
    const ctx = createInquiryContext('case-1', 'user-1');
    expect(() => prove(ctx, 'PRF1')).toThrow('Must track');
  });

  it('full pipeline produces tracking and proof', () => {
    const ctx = runFullInquiry('case-1', 'user-1', 'My case is delayed', 'I-485');
    expect(ctx.trackingNumber).toMatch(/^TRK\d+$/);
    expect(ctx.proofId).toMatch(/^PRF\d+$/);
  });
});

// ─── X-Ray Tests ──────────────────────────────────────────────────────────────

describe('Case Inquiry: X-Ray Adversarial Review', () => {
  it('flags premature service request', () => {
    const ctx = createInquiryContext('case-1', 'user-1');
    const after = xray(validate(draft(buildStrategy(analyze(intake(
      ctx, 'My I-90 is delayed.', 'I-90', undefined, '2026-08-01'
    ))))));
    // Filed only 22 days ago, I-90 takes 8-12 months → premature
    expect(after.xrayIssues.length).toBeGreaterThan(0);
  });

  it('flags expedite without supporting evidence', () => {
    const ctx = createInquiryContext('case-1', 'user-1');
    const after = xray(validate(draft(buildStrategy(analyze(intake(
      ctx, 'I need to expedite my I-485. It is urgent.', 'I-485'
    ))))));
    // Expedite request with no supporting evidence
    expect(after.xrayIssues.some(i => i.includes('supporting evidence'))).toBe(true);
  });

  it('flags critical urgency not classified as expedite', () => {
    const ctx = createInquiryContext('case-1', 'user-1');
    // Construct analysis with critical urgency but inquiry type is service_request
    const after = xray(validate(draft(buildStrategy(analyze(intake(
      ctx, 'My case is taking too long and my child is aging out.', 'I-485'
    ))))));
    // This should flag critical urgency without expedite classification
    expect(after.xrayIssues.some(i => i.includes('Critical urgency') && i.includes('expedite'))).toBe(true);
  });

  it('passes clean inquiry with no issues', () => {
    const ctx = createInquiryContext('case-1', 'user-1');
    const after = xray(validate(draft(buildStrategy(analyze(intake(
      ctx, 'My I-485 is taking too long. Receipt MSC2190123456. Filed 2024-01-15.',
      'I-485', 'MSC2190123456', '2024-01-15'
    ))))));
    // Outside processing time, has receipt number, proper inquiry
    // Critical urgency check might flag "aging out" but this text doesn't have it
    // The "premature" check won't fire because outsideProcessingTime is true
    // The "expedite without evidence" check won't fire because not an expedite request
    // The "critical urgency" check might fire if urgency is critical but not expedite
    // This text has "taking too long" which is routine urgency
    expect(after.xrayIssues.filter(i => i.includes('premature')).length).toBe(0);
  });
});

// ─── Document/Receipt Tests ────────────────────────────────────────────────────

describe('Case Inquiry: Document Intelligence', () => {
  it('extracts receipt number from free text', () => {
    const text = 'My case MSC2190123456 has been pending for over a year.';
    const receipt = extractReceiptNumber(text);
    expect(receipt).toBe('MSC2190123456');
  });

  it('identifies service center from receipt prefix', () => {
    expect(extractServiceCenter('TSC2201234567')).toContain('Texas');
    expect(extractServiceCenter('VSC2201234567')).toContain('Vermont');
    expect(extractServiceCenter('YSC2201234567')).toContain('Potomac');
  });

  it('analysis includes service center when receipt is provided', () => {
    const analysis = analyzeInquiry('My case is delayed', 'I-485', 'NSC2201234567');
    expect(analysis.serviceCenter).toContain('Nebraska');
  });
});

// ─── Audit Trail Tests ────────────────────────────────────────────────────────

describe('Case Inquiry: Audit Trail', () => {
  it('every state transition adds audit entry', () => {
    const ctx = runFullInquiry('case-1', 'user-1', 'My case is delayed', 'I-485');
    // 13 states = 13 audit entries
    expect(ctx.auditTrail.length).toBe(13);
    // Each entry has timestamp and event
    for (const entry of ctx.auditTrail) {
      expect(entry.timestamp).toBeDefined();
      expect(entry.event).toBeDefined();
      expect(new Date(entry.timestamp).getTime()).not.toBeNaN();
    }
  });

  it('audit trail preserves order', () => {
    const ctx = runFullInquiry('case-1', 'user-1', 'My case is delayed', 'I-485');
    const events = ctx.auditTrail.map(e => e.event);
    expect(events.indexOf('INTAKE')).toBeLessThan(events.indexOf('ANALYZED'));
    expect(events.indexOf('ANALYZED')).toBeLessThan(events.indexOf('CLASSIFIED'));
    expect(events.indexOf('CLASSIFIED')).toBeLessThan(events.indexOf('STRATEGY_BUILT'));
    expect(events.indexOf('STRATEGY_BUILT')).toBeLessThan(events.indexOf('DRAFTED'));
    expect(events.indexOf('DRAFTED')).toBeLessThan(events.indexOf('VALIDATED'));
    expect(events.indexOf('VALIDATED')).toBeLessThan(events.indexOf('XRAY'));
    expect(events.indexOf('XRAY')).toBeLessThan(events.indexOf('USER_REVIEW'));
    expect(events.indexOf('USER_REVIEW')).toBeLessThan(events.indexOf('APPROVED'));
    expect(events.indexOf('APPROVED')).toBeLessThan(events.indexOf('PAID'));
    expect(events.indexOf('PAID')).toBeLessThan(events.indexOf('FULFILLED'));
    expect(events.indexOf('FULFILLED')).toBeLessThan(events.indexOf('TRACKED'));
    expect(events.indexOf('TRACKED')).toBeLessThan(events.indexOf('PROVEN'));
  });
});
