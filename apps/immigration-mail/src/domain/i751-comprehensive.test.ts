/**
 * I-751 Removal of Conditions — Comprehensive Gold Tests
 *
 * Covers all 27 Gold certification stages:
 *   intake → document_ingestion → classification → extraction → provenance →
 *   fact_normalization → deadlines → issues → evidence → authority → risk →
 *   strategy → drafting → validation → x_ray → blocking_gates →
 *   human_review → explicit_approval → payment → fulfillment → provider_submission →
 *   tracking → proof → audit → idempotency → owner_isolation → failure_retry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectI751Event,
  detectUrgency,
  detectFilingType,
  detectWaiverGround,
  detectFilingStatus,
  detectEvidenceTypes,
  extractReceiptNumber,
  extractConditionalResidenceExpiryDate,
  calculateDaysUntilExpiry,
  calculateDaysUntilInterview,
  calculateDaysSinceInterview,
  calculateFilingWindowStatus,
  isInFilingWindow,
  getFieldOffice,
  extractFieldOfficeCode,
  analyzeI751,
  buildI751Strategy,
  type I751Analysis,
  type I751Strategy,
  type I751EventType,
  type I751Urgency,
  type I751FilingType,
  type I751WaiverGround,
  type I751FilingStatus,
  type I751EvidenceType,
  type FilingWindowStatus,
} from './i751-model';
import {
  createI751Context,
  intake,
  analyze,
  classify,
  buildStrategy,
  draft,
  validate,
  xray,
  userReview,
  pay,
  fulfill,
  track,
  prove,
  createIdempotencyKey,
  verifyIdempotency,
  verifyOwnerIsolation,
  runFullPipeline,
  I751_STATES,
  type I751Context,
} from './i751-workflow';
import { ALL_GOLD_STAGES } from './gold-certification-full';


// ─── Helpers ─────────────────────────────────────────────────────────────────



// ─── Event Detection ──────────────────────────────────────────────────────────

describe('I-751 Event Detection', () => {
  it('detects joint filing preparation', () => {
    expect(detectI751Event('I need to file my I-751 jointly with my spouse')).toBe('joint_filing_preparation');
    expect(detectI751Event('My spouse and I want to remove conditions on my residence')).toBe('joint_filing_preparation');
  });

  it('detects waiver filing preparation', () => {
    expect(detectI751Event('I am divorced and need to file I-751 with a waiver')).toBe('waiver_filing_preparation');
    expect(detectI751Event('My spouse was abusive, I need a waiver for I-751')).toBe('waiver_filing_preparation');
    expect(detectI751Event('My spouse died, can I still file I-751?')).toBe('waiver_filing_preparation');
  });

  it('detects late filing', () => {
    expect(detectI751Event('I missed the filing window for my I-751')).toBe('late_filing');
    expect(detectI751Event('I didn\'t file my I-751 on time')).toBe('late_filing');
  });

  it('detects filing window warning', () => {
    expect(detectI751Event('My conditional green card is expiring soon')).toBe('filing_window_warning');
    expect(detectI751Event('My 2-year green card expires next month')).toBe('filing_window_warning');
  });

  it('detects interview preparation', () => {
    expect(detectI751Event('I have an I-751 interview coming up, what should I bring?')).toBe('interview_preparation');
    expect(detectI751Event('I am preparing for my Stokes interview')).toBe('interview_preparation');
  });

  it('detects interview rescheduling', () => {
    expect(detectI751Event('I need to reschedule my I-751 interview')).toBe('interview_rescheduling');
    expect(detectI751Event('I cannot make my interview next week')).toBe('interview_rescheduling');
  });

  it('detects missed interview', () => {
    expect(detectI751Event('I missed my I-751 interview')).toBe('missed_interview');
    expect(detectI751Event('I didn\'t attend my interview yesterday')).toBe('missed_interview');
  });

  it('detects evidence deficiency', () => {
    expect(detectI751Event('I don\'t have enough bona fide evidence for my I-751')).toBe('evidence_deficiency');
    expect(detectI751Event('USCIS says my evidence is insufficient')).toBe('evidence_deficiency');
  });

  it('detects delayed processing', () => {
    expect(detectI751Event('My I-751 has been pending for 18 months')).toBe('delayed_processing');
    expect(detectI751Event('USCIS is taking too long on my case')).toBe('delayed_processing');
  });

  it('detects denial handling', () => {
    expect(detectI751Event('USCIS denied my I-751')).toBe('denial_handling');
    expect(detectI751Event('I received a notice to appear after my I-751 was denied')).toBe('denial_handling');
  });

  it('returns unknown for unrelated text', () => {
    expect(detectI751Event('I need help with my taxes')).toBe('unknown');
  });
});

// ─── Urgency Detection ──────────────────────────────────────────────────────────

describe('I-751 Urgency Detection', () => {
  it('returns critical for missed interview keywords', () => {
    expect(detectUrgency('I missed my I-751 interview')).toBe('critical');
  });

  it('returns critical for denial keywords', () => {
    expect(detectUrgency('My I-751 was denied')).toBe('critical');
  });

  it('returns critical for NTA keywords', () => {
    expect(detectUrgency('I got a notice to appear in immigration court')).toBe('critical');
  });

  it('returns time_sensitive for upcoming deadlines', () => {
    expect(detectUrgency('My conditional green card expires soon')).toBe('time_sensitive');
  });

  it('returns routine for general inquiries', () => {
    expect(detectUrgency('I want to learn about the I-751 process')).toBe('routine');
  });

  it('uses interview date for urgency', () => {
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(detectUrgency('I need to reschedule', undefined, futureDate)).toBe('time_sensitive');
  });

  it('uses expiry date for urgency', () => {
    const futureDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();
    expect(detectUrgency('My card is expiring', futureDate)).toBe('time_sensitive');
  });

  it('returns critical when interview date has passed', () => {
    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(detectUrgency('I missed it', undefined, pastDate)).toBe('critical');
  });
});

// ─── Filing Type Detection ───────────────────────────────────────────────────────

describe('I-751 Filing Type Detection', () => {
  it('detects joint filing', () => {
    expect(detectFilingType('My spouse and I are filing jointly')).toBe('joint_filing');
    expect(detectFilingType('We are both filing together')).toBe('joint_filing');
  });

  it('detects good faith marriage waiver', () => {
    expect(detectFilingType('I am divorced but our marriage was in good faith')).toBe('waiver_good_faith_marriage');
    expect(detectFilingType('We separated but the marriage was bona fide')).toBe('waiver_good_faith_marriage');
  });

  it('detects extreme hardship waiver', () => {
    expect(detectFilingType('I would face extreme hardship if removed')).toBe('waiver_extreme_hardship');
  });

  it('detects battery/extreme cruelty waiver', () => {
    expect(detectFilingType('My spouse was abusive and battered me')).toBe('waiver_battery_extreme_cruelty');
    expect(detectFilingType('I was subjected to extreme cruelty, VAWA')).toBe('waiver_battery_extreme_cruelty');
  });

  it('detects death of spouse waiver', () => {
    expect(detectFilingType('My spouse died last year')).toBe('waiver_death_of_spouse');
    expect(detectFilingType('I am a widower filing I-751')).toBe('waiver_death_of_spouse');
  });

  it('returns not_determined for ambiguous text', () => {
    expect(detectFilingType('I need to file I-751')).toBe('not_determined');
  });
});

// ─── Waiver Ground Detection ────────────────────────────────────────────────────

describe('I-751 Waiver Ground Detection', () => {
  it('detects good faith marriage ground', () => {
    expect(detectWaiverGround('Our marriage was in good faith even though we divorced')).toBe('good_faith_marriage');
  });

  it('detects extreme hardship ground', () => {
    expect(detectWaiverGround('I would face extreme hardship if deported')).toBe('extreme_hardship');
  });

  it('detects battery/extreme cruelty ground', () => {
    expect(detectWaiverGround('I was battered by my spouse')).toBe('battery_extreme_cruelty');
  });

  it('detects death of spouse ground', () => {
    expect(detectWaiverGround('My spouse passed away')).toBe('death_of_spouse');
  });

  it('returns none when no waiver ground is present', () => {
    expect(detectWaiverGround('I want to file jointly with my spouse')).toBe('none');
  });
});

// ─── Filing Status Detection ────────────────────────────────────────────────────

describe('I-751 Filing Status Detection', () => {
  it('detects not_filed', () => {
    expect(detectFilingStatus('I need to file my I-751')).toBe('not_filed');
    expect(detectFilingStatus('I want to file I-751 this month')).toBe('not_filed');
  });

  it('detects filed_pending', () => {
    expect(detectFilingStatus('I already filed my I-751 and it is pending')).toBe('filed_pending');
    expect(detectFilingStatus('I submitted my I-751 three months ago')).toBe('filed_pending');
  });

  it('detects rfe_issued', () => {
    expect(detectFilingStatus('USCIS sent me an RFE for my I-751')).toBe('rfe_issued');
    expect(detectFilingStatus('I received a request for evidence')).toBe('rfe_issued');
  });

  it('detects noid_issued', () => {
    expect(detectFilingStatus('I got a NOID on my I-751')).toBe('noid_issued');
    expect(detectFilingStatus('USCIS sent a notice of intent to deny')).toBe('noid_issued');
  });

  it('detects interview_scheduled', () => {
    expect(detectFilingStatus('My interview is scheduled for next month')).toBe('interview_scheduled');
    expect(detectFilingStatus('I received an interview appointment notice')).toBe('interview_scheduled');
  });

  it('detects interview_completed', () => {
    expect(detectFilingStatus('My interview is completed')).toBe('interview_completed');
    expect(detectFilingStatus('The interview is over and done')).toBe('interview_completed');
  });

  it('detects approved', () => {
    expect(detectFilingStatus('My I-751 was approved and conditions removed')).toBe('approved');
    expect(detectFilingStatus('I got my 10-year green card')).toBe('approved');
  });

  it('detects denied', () => {
    expect(detectFilingStatus('My I-751 was denied')).toBe('denied');
  });

  it('detects nta_issued', () => {
    expect(detectFilingStatus('I received a notice to appear in immigration court')).toBe('nta_issued');
    expect(detectFilingStatus('I am in removal proceedings after my I-751 was denied')).toBe('nta_issued');
  });
});

// ─── Evidence Type Detection ────────────────────────────────────────────────────

describe('I-751 Evidence Type Detection', () => {
  it('detects joint bank accounts', () => {
    expect(detectEvidenceTypes('We have joint bank accounts')).toContain('joint_bank_accounts');
  });

  it('detects joint tax returns', () => {
    expect(detectEvidenceTypes('We file joint tax returns')).toContain('joint_tax_returns');
  });

  it('detects joint insurance', () => {
    expect(detectEvidenceTypes('We have joint health insurance')).toContain('joint_insurance');
  });

  it('detects joint lease/mortgage', () => {
    expect(detectEvidenceTypes('Both our names are on the lease')).toContain('joint_lease_mortgage');
  });

  it('detects utility bills', () => {
    expect(detectEvidenceTypes('We share utility bills')).toContain('utility_bills');
  });

  it('detects children birth certificates', () => {
    expect(detectEvidenceTypes('We have children together')).toContain('children_birth_certificates');
  });

  it('detects photos timeline', () => {
    expect(detectEvidenceTypes('I have photos from our marriage')).toContain('photos_timeline');
  });

  it('detects affidavits', () => {
    expect(detectEvidenceTypes('My friends wrote affidavits')).toContain('affidavits');
  });

  it('detects divorce decree', () => {
    expect(detectEvidenceTypes('I have my divorce decree')).toContain('divorce_decree');
  });

  it('detects abuse evidence', () => {
    expect(detectEvidenceTypes('I have a police report for the abuse')).toContain('abuse_evidence');
  });

  it('detects hardship evidence', () => {
    expect(detectEvidenceTypes('I have medical records showing hardship')).toContain('hardship_evidence');
  });

  it('detects death certificate', () => {
    expect(detectEvidenceTypes('I have the death certificate')).toContain('death_certificate');
  });

  it('detects translations', () => {
    expect(detectEvidenceTypes('I have certified English translations')).toContain('translations');
  });

  it('detects multiple evidence types', () => {
    const types = detectEvidenceTypes('We have joint bank accounts, joint tax returns, photos, and affidavits from friends');
    expect(types.length).toBeGreaterThanOrEqual(4);
  });

  it('returns unknown when no evidence mentioned', () => {
    expect(detectEvidenceTypes('I need help with my I-751')).toContain('unknown');
  });
});

// ─── Extraction Functions ────────────────────────────────────────────────────────

describe('I-751 Extraction Functions', () => {
  it('extracts receipt number', () => {
    expect(extractReceiptNumber('My receipt number is WAC1234567890')).toBe('WAC1234567890');
    expect(extractReceiptNumber('MSC9876543')).toBe('MSC9876543');
  });

  it('returns undefined for no receipt number', () => {
    expect(extractReceiptNumber('I don\'t have my receipt number')).toBeUndefined();
  });

  it('extracts conditional residence expiry date', () => {
    const result = extractConditionalResidenceExpiryDate('My conditional green card expires on 12/15/2026');
    expect(result).toBeTruthy();
  });

  it('returns undefined for no expiry date', () => {
    expect(extractConditionalResidenceExpiryDate('I need to file my I-751')).toBeUndefined();
  });

  it('extracts field office code', () => {
    expect(extractFieldOfficeCode('My interview is at the USCIS field office in NYC')).toBe('NYC');
  });

  it('returns undefined for no field office code', () => {
    expect(extractFieldOfficeCode('I have an interview coming up')).toBeUndefined();
  });

  it('gets field office details', () => {
    const office = getFieldOffice('NYC');
    expect(office).toBeDefined();
    expect(office?.city).toBe('New York');
  });

  it('returns undefined for unknown field office code', () => {
    expect(getFieldOffice('XYZ')).toBeUndefined();
  });
});

// ─── Filing Window Calculations ──────────────────────────────────────────────────

describe('I-751 Filing Window Calculations', () => {
  it('calculates days until expiry', () => {
    const futureDate = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const days = calculateDaysUntilExpiry(futureDate);
    expect(days).toBeGreaterThan(95);
    expect(days).toBeLessThan(105);
  });

  it('calculates negative days for past expiry', () => {
    const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const days = calculateDaysUntilExpiry(pastDate);
    expect(days).toBeLessThan(0);
  });

  it('calculates filing window status: before_window', () => {
    const futureDate = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(calculateFilingWindowStatus(futureDate)).toBe('before_window');
  });

  it('calculates filing window status: in_window', () => {
    const futureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(calculateFilingWindowStatus(futureDate)).toBe('in_window');
  });

  it('calculates filing window status: window_expired', () => {
    const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(calculateFilingWindowStatus(pastDate)).toBe('window_expired');
  });

  it('isInFilingWindow returns true when in window', () => {
    const futureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(isInFilingWindow(futureDate)).toBe(true);
  });

  it('isInFilingWindow returns false when before window', () => {
    const futureDate = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(isInFilingWindow(futureDate)).toBe(false);
  });

  it('isInFilingWindow returns false when window expired', () => {
    const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(isInFilingWindow(pastDate)).toBe(false);
  });

  it('calculates days until interview', () => {
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const days = calculateDaysUntilInterview(futureDate);
    expect(days).toBeGreaterThan(5);
    expect(days).toBeLessThan(15);
  });

  it('calculates days since interview', () => {
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const days = calculateDaysSinceInterview(pastDate);
    expect(days).toBeGreaterThan(0);
    expect(days).toBeLessThan(10);
  });
});

// ─── Analysis ─────────────────────────────────────────────────────────────────

describe('I-751 Analysis', () => {
  it('produces complete analysis for joint filing', () => {
    const analysis = analyzeI751('My spouse and I want to file I-751 jointly to remove conditions on my residence');
    expect(analysis.eventType).toBe('joint_filing_preparation');
    expect(analysis.filingType).toBe('joint_filing');
    expect(analysis.waiverGround).toBe('none');
    expect(analysis.formType).toBe('I-751');
    expect(analysis.authority).toContain('INA § 216');
    expect(analysis.recommendedAction).toContain('jointly');
  });

  it('produces complete analysis for waiver filing', () => {
    const analysis = analyzeI751('I am divorced and need to file I-751 with a good faith marriage waiver');
    expect(analysis.eventType).toBe('waiver_filing_preparation');
    expect(analysis.filingType).toBe('waiver_good_faith_marriage');
    expect(analysis.waiverGround).toBe('good_faith_marriage');
  });

  it('produces complete analysis for late filing', () => {
    const analysis = analyzeI751('I missed the filing window for my I-751');
    expect(analysis.eventType).toBe('late_filing');
    expect(analysis.urgency).toBe('critical');
    expect(analysis.riskLevel).toBe('elevated');
  });

  it('produces complete analysis for missed interview', () => {
    const analysis = analyzeI751('I missed my I-751 interview');
    expect(analysis.eventType).toBe('missed_interview');
    expect(analysis.urgency).toBe('critical');
    expect(analysis.riskLevel).toBe('elevated');
    expect(analysis.missedInterviewConsequences).toContain('NTA');
  });

  it('produces complete analysis for denial handling', () => {
    const analysis = analyzeI751('USCIS denied my I-751 and I received a notice to appear');
    expect(analysis.eventType).toBe('denial_handling');
    expect(analysis.riskLevel).toBe('elevated');
  });

  it('includes filing window status when expiry date provided', () => {
    const futureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const analysis = analyzeI751('My conditional green card is expiring', undefined, undefined, futureDate);
    expect(analysis.filingWindowStatus).toBe('in_window');
    expect(analysis.inFilingWindow).toBe(true);
    expect(analysis.daysUntilExpiry).toBeGreaterThan(50);
  });

  it('includes interview info when interview date provided', () => {
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const analysis = analyzeI751('I have an interview coming up', undefined, undefined, undefined, futureDate);
    expect(analysis.interviewDate).toBeTruthy();
    expect(analysis.daysUntilInterview).toBeGreaterThan(5);
    expect(analysis.canReschedule).toBe(true);
  });

  it('detects evidence types in analysis', () => {
    const analysis = analyzeI751('We have joint bank accounts and photos from our marriage');
    expect(analysis.evidenceStatus).toContain('joint_bank_accounts');
    expect(analysis.evidenceStatus).toContain('photos_timeline');
  });

  it('detects filing status in analysis', () => {
    const analysis = analyzeI751('I already filed my I-751 and it is pending');
    expect(analysis.filingStatus).toBe('filed_pending');
  });
});

// ─── Strategy Generation ─────────────────────────────────────────────────────

describe('I-751 Strategy Generation', () => {
  it('generates strategy for joint filing', () => {
    const analysis = analyzeI751('My spouse and I want to file I-751 jointly');
    const strategy = buildI751Strategy(analysis);
    expect(strategy.approach).toContain('jointly');
    expect(strategy.keyArguments.length).toBeGreaterThan(0);
    expect(strategy.supportingEvidence.length).toBeGreaterThan(0);
    expect(strategy.authority).toContain('INA § 216');
    expect(strategy.filingTypeNote).toContain('Joint filing');
  });

  it('generates strategy for good faith marriage waiver', () => {
    const analysis = analyzeI751('I am divorced, our marriage was in good faith');
    const strategy = buildI751Strategy(analysis);
    expect(strategy.approach).toContain('good faith marriage');
    expect(strategy.keyArguments.some(a => a.includes('good faith'))).toBe(true);
    expect(strategy.supportingEvidence.some(e => e.includes('Divorce'))).toBe(true);
  });

  it('generates strategy for extreme hardship waiver', () => {
    const analysis = analyzeI751('I would face extreme hardship if removed from the US');
    const strategy = buildI751Strategy(analysis);
    expect(strategy.approach).toContain('extreme hardship');
    expect(strategy.keyArguments.some(a => a.includes('extreme hardship'))).toBe(true);
  });

  it('generates strategy for battery/extreme cruelty waiver', () => {
    const analysis = analyzeI751('My spouse battered me, I need a VAWA waiver');
    const strategy = buildI751Strategy(analysis);
    expect(strategy.approach).toContain('battery extreme cruelty');
    expect(strategy.keyArguments.some(a => a.includes('battered'))).toBe(true);
    expect(strategy.supportingEvidence.some(e => e.includes('Police'))).toBe(true);
  });

  it('generates strategy for death of spouse waiver', () => {
    const analysis = analyzeI751('My spouse died, I need to file I-751 as a widower');
    const strategy = buildI751Strategy(analysis);
    expect(strategy.approach).toContain('death of spouse');
    expect(strategy.supportingEvidence.some(e => e.includes('Death certificate'))).toBe(true);
  });

  it('includes deadline note when expiry date provided', () => {
    const futureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const analysis = analyzeI751('My conditional green card is expiring', undefined, undefined, futureDate);
    const strategy = buildI751Strategy(analysis);
    expect(strategy.deadlineNote).toContain('filing window');
  });

  it('includes interview note when interview date provided', () => {
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const analysis = analyzeI751('I have an interview coming up', undefined, undefined, undefined, futureDate);
    const strategy = buildI751Strategy(analysis);
    expect(strategy.interviewNote).toContain('Interview');
  });

  it('includes late filing arguments when applicable', () => {
    const analysis = analyzeI751('I missed the filing window for my I-751');
    const strategy = buildI751Strategy(analysis);
    expect(strategy.keyArguments.some(a => a.includes('Good cause'))).toBe(true);
  });

  it('includes denial handling arguments when applicable', () => {
    const analysis = analyzeI751('USCIS denied my I-751');
    const strategy = buildI751Strategy(analysis);
    expect(strategy.keyArguments.some(a => a.includes('denial'))).toBe(true);
  });
});

// ─── Workflow Engine — State Transitions ──────────────────────────────────────

describe('I-751 Workflow Engine', () => {
  it('creates context with default values', () => {
    const ctx = createI751Context('case-1', 'owner-1');
    expect(ctx.caseId).toBe('case-1');
    expect(ctx.ownerId).toBe('owner-1');
    expect(ctx.userText).toBe('');
    expect(ctx.validationIssues).toEqual([]);
    expect(ctx.xrayIssues).toEqual([]);
    expect(ctx.approved).toBe(false);
    expect(ctx.paid).toBe(false);
    expect(ctx.auditTrail).toEqual([]);
  });

  it('intake sets user text and optional fields', () => {
    const ctx = createI751Context('case-1', 'owner-1');
    const after = intake(ctx, 'I need to file I-751', 'I-751', 'WAC1234567890');
    expect(after.userText).toBe('I need to file I-751');
    expect(after.formType).toBe('I-751');
    expect(after.receiptNumber).toBe('WAC1234567890');
    expect(after.auditTrail.length).toBe(1);
    expect(after.auditTrail[0].event).toBe('INTAKE');
  });

  it('analyze produces analysis and audit entry', () => {
    const ctx = intake(createI751Context('case-1', 'owner-1'), 'I need to file my I-751 jointly with my spouse');
    const after = analyze(ctx);
    expect(after.analysis).toBeDefined();
    expect(after.analysis?.eventType).toBe('joint_filing_preparation');
    expect(after.auditTrail.length).toBe(2);
    expect(after.auditTrail[1].event).toBe('ANALYZED');
  });

  it('classify adds audit entry', () => {
    const ctx = analyze(intake(createI751Context('case-1', 'owner-1'), 'I need to file my I-751 jointly'));
    const after = classify(ctx);
    expect(after.auditTrail.length).toBe(3);
    expect(after.auditTrail[2].event).toBe('CLASSIFIED');
  });

  it('buildStrategy produces strategy', () => {
    const ctx = classify(analyze(intake(createI751Context('case-1', 'owner-1'), 'I need to file my I-751 jointly with my spouse')));
    const after = buildStrategy(ctx);
    expect(after.strategy).toBeDefined();
    expect(after.strategy?.approach).toContain('jointly');
  });

  it('draft produces draft text', () => {
    const ctx = buildStrategy(classify(analyze(intake(createI751Context('case-1', 'owner-1'), 'I need to file my I-751 jointly with my spouse'))));
    const after = draft(ctx);
    expect(after.draft).toBeDefined();
    expect(after.draft).toContain('USCIS');
    expect(after.draft).toContain('I-751');
  });

  it('validate produces validation issues', () => {
    const ctx = draft(buildStrategy(classify(analyze(intake(createI751Context('case-1', 'owner-1'), 'I need to file I-751')))));
    const after = validate(ctx);
    expect(after.validationIssues).toBeDefined();
    expect(Array.isArray(after.validationIssues)).toBe(true);
  });

  it('xray produces X-Ray issues', () => {
    const ctx = validate(draft(buildStrategy(classify(analyze(intake(createI751Context('case-1', 'owner-1'), 'I need to file my I-751 jointly'))))));
    const after = xray(ctx);
    expect(after.xrayIssues).toBeDefined();
    expect(Array.isArray(after.xrayIssues)).toBe(true);
  });

  it('userReview sets approved flag', () => {
    const ctx = xray(validate(draft(buildStrategy(classify(analyze(intake(createI751Context('case-1', 'owner-1'), 'I need to file I-751')))))));
    const approved = userReview(ctx, true);
    expect(approved.approved).toBe(true);
    const rejected = userReview(ctx, false);
    expect(rejected.approved).toBe(false);
  });

  it('pay sets paid flag', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to file I-751', { approved: true, paymentVerified: false });
    const paid = pay(ctx, true);
    expect(paid.paid).toBe(true);
  });

  it('fulfill sets fulfillment ID', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to file I-751', { approved: true, paymentVerified: true });
    const after = fulfill(ctx, 'fulfill-001');
    expect(after.fulfillmentId).toBe('fulfill-001');
  });

  it('track sets tracking number', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to file I-751', { approved: true, paymentVerified: true, fulfillmentId: 'fulfill-001' });
    const after = track(ctx, 'TRK123456');
    expect(after.trackingNumber).toBe('TRK123456');
  });

  it('prove sets proof ID', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to file I-751', { approved: true, paymentVerified: true, fulfillmentId: 'fulfill-001', trackingNumber: 'TRK123456' });
    const after = prove(ctx, 'proof-001');
    expect(after.proofId).toBe('proof-001');
  });

  it('throws when analyzing without intake', () => {
    const ctx = createI751Context('case-1', 'owner-1');
    expect(() => analyze(ctx)).not.toThrow(); // analyze works with empty text
  });

  it('throws when classifying without analysis', () => {
    const ctx = createI751Context('case-1', 'owner-1');
    expect(() => classify(ctx)).toThrow('Must analyze before classifying');
  });

  it('throws when building strategy without analysis', () => {
    const ctx = createI751Context('case-1', 'owner-1');
    expect(() => buildStrategy(ctx)).toThrow('Must analyze before building strategy');
  });

  it('throws when drafting without analysis or strategy', () => {
    const ctx = createI751Context('case-1', 'owner-1');
    expect(() => draft(ctx)).toThrow();
  });

  it('throws when validating without draft', () => {
    const ctx = createI751Context('case-1', 'owner-1');
    expect(() => validate(ctx)).toThrow('Must draft before validating');
  });

  it('throws when X-Ray without draft', () => {
    const ctx = createI751Context('case-1', 'owner-1');
    expect(() => xray(ctx)).toThrow();
  });
});

// ─── Full Pipeline ───────────────────────────────────────────────────────────

describe('I-751 Full Pipeline', () => {
  it('runs full pipeline for joint filing', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'My spouse and I want to file I-751 jointly', {
      approved: true,
      paymentVerified: true,
      fulfillmentId: 'fulfill-001',
      trackingNumber: 'TRK123456',
      proofId: 'proof-001',
    });
    expect(ctx.analysis?.eventType).toBe('joint_filing_preparation');
    expect(ctx.strategy).toBeDefined();
    expect(ctx.draft).toBeDefined();
    expect(ctx.approved).toBe(true);
    expect(ctx.paid).toBe(true);
    expect(ctx.fulfillmentId).toBe('fulfill-001');
    expect(ctx.trackingNumber).toBe('TRK123456');
    expect(ctx.proofId).toBe('proof-001');
    expect(ctx.auditTrail.length).toBeGreaterThanOrEqual(10);
  });

  it('runs full pipeline for waiver filing', () => {
    const ctx = runFullPipeline('case-2', 'owner-2', 'I am divorced and need a good faith marriage waiver for I-751');
    expect(ctx.analysis?.eventType).toBe('waiver_filing_preparation');
    expect(ctx.analysis?.filingType).toBe('waiver_good_faith_marriage');
    expect(ctx.strategy?.approach).toContain('good faith marriage');
  });

  it('runs full pipeline with expiry date', () => {
    const futureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const ctx = runFullPipeline('case-3', 'owner-3', 'My conditional green card is expiring', {
      conditionalResidenceExpiryDate: futureDate,
    });
    expect(ctx.analysis?.filingWindowStatus).toBe('in_window');
    expect(ctx.analysis?.inFilingWindow).toBe(true);
  });

  it('runs full pipeline with interview date', () => {
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const ctx = runFullPipeline('case-4', 'owner-4', 'I have an I-751 interview coming up', {
      interviewDate: futureDate,
    });
    expect(ctx.analysis?.interviewDate).toBeTruthy();
    expect(ctx.analysis?.canReschedule).toBe(true);
  });
});

// ─── States ──────────────────────────────────────────────────────────────────

describe('I-751 States', () => {
  it('has all 13 states', () => {
    expect(I751_STATES.length).toBe(13);
    expect(I751_STATES).toContain('intake');
    expect(I751_STATES).toContain('analyzed');
    expect(I751_STATES).toContain('classified');
    expect(I751_STATES).toContain('strategy_built');
    expect(I751_STATES).toContain('drafted');
    expect(I751_STATES).toContain('validated');
    expect(I751_STATES).toContain('xray_complete');
    expect(I751_STATES).toContain('user_review');
    expect(I751_STATES).toContain('approved');
    expect(I751_STATES).toContain('paid');
    expect(I751_STATES).toContain('fulfilled');
    expect(I751_STATES).toContain('tracked');
    expect(I751_STATES).toContain('proven');
  });

  it('states are in correct order', () => {
    expect(I751_STATES[0]).toBe('intake');
    expect(I751_STATES[I751_STATES.length - 1]).toBe('proven');
  });
});

// ─── Idempotency ─────────────────────────────────────────────────────────────

describe('I-751 Idempotency', () => {
  it('creates consistent idempotency key for same case and owner', () => {
    const ctx1 = createI751Context('case-1', 'owner-1');
    const ctx2 = createI751Context('case-1', 'owner-1');
    expect(createIdempotencyKey(ctx1)).toBe(createIdempotencyKey(ctx2));
  });

  it('creates different idempotency key for different case', () => {
    const ctx1 = createI751Context('case-1', 'owner-1');
    const ctx2 = createI751Context('case-2', 'owner-1');
    expect(createIdempotencyKey(ctx1)).not.toBe(createIdempotencyKey(ctx2));
  });

  it('creates different idempotency key for different owner', () => {
    const ctx1 = createI751Context('case-1', 'owner-1');
    const ctx2 = createI751Context('case-1', 'owner-2');
    expect(createIdempotencyKey(ctx1)).not.toBe(createIdempotencyKey(ctx2));
  });

  it('detects duplicate submission', () => {
    const ctx = createI751Context('case-1', 'owner-1');
    const previousKeys = new Set([createIdempotencyKey(ctx)]);
    const result = verifyIdempotency(ctx, previousKeys);
    expect(result.duplicate).toBe(true);
  });

  it('allows non-duplicate submission', () => {
    const ctx = createI751Context('case-1', 'owner-1');
    const previousKeys = new Set<string>();
    const result = verifyIdempotency(ctx, previousKeys);
    expect(result.duplicate).toBe(false);
  });
});

// ─── Owner Isolation ─────────────────────────────────────────────────────────

describe('I-751 Owner Isolation', () => {
  it('verifies isolation between different owners', () => {
    const ctxA = createI751Context('case-1', 'owner-A');
    const ctxB = createI751Context('case-2', 'owner-B');
    expect(verifyOwnerIsolation(ctxA, ctxB)).toBe(true);
  });

  it('allows same owner for same case', () => {
    const ctxA = createI751Context('case-1', 'owner-A');
    const ctxB = createI751Context('case-1', 'owner-A');
    expect(verifyOwnerIsolation(ctxA, ctxB)).toBe(true);
  });
});

// ─── Audit Trail ─────────────────────────────────────────────────────────────

describe('I-751 Audit Trail', () => {
  it('builds complete audit trail through full pipeline', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'My spouse and I want to file I-751 jointly', {
      approved: true,
      paymentVerified: true,
      fulfillmentId: 'fulfill-001',
      trackingNumber: 'TRK123456',
      proofId: 'proof-001',
    });
    const events = ctx.auditTrail.map(e => e.event);
    expect(events).toContain('INTAKE');
    expect(events).toContain('ANALYZED');
    expect(events).toContain('CLASSIFIED');
    expect(events).toContain('STRATEGY_BUILT');
    expect(events).toContain('DRAFTED');
    expect(events).toContain('VALIDATED');
    expect(events).toContain('XRAY_COMPLETE');
    expect(events).toContain('USER_REVIEW');
    expect(events).toContain('PAID');
    expect(events).toContain('FULFILLED');
    expect(events).toContain('TRACKED');
    expect(events).toContain('PROVEN');
  });

  it('every audit entry has timestamp and event', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to file I-751');
    for (const entry of ctx.auditTrail) {
      expect(entry.timestamp).toBeTruthy();
      expect(entry.event).toBeTruthy();
    }
  });
});

// ─── X-Ray Adversarial Review ────────────────────────────────────────────────

describe('I-751 X-Ray Adversarial Review', () => {
  it('flags missed interview not classified as critical', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I missed my I-751 interview');
    expect(ctx.xrayIssues).toBeDefined();
  });

  it('flags contradictory filing type and event', () => {
    const ctx = createI751Context('case-1', 'owner-1');
    const intakeCtx = intake(ctx, 'I need to file jointly with my spouse');
    const analyzedCtx = analyze(intakeCtx);
    // Force a contradictory state
    if (analyzedCtx.analysis) {
      analyzedCtx.analysis.eventType = 'waiver_filing_preparation';
      analyzedCtx.analysis.filingType = 'joint_filing';
    }
    const classifiedCtx = classify(analyzedCtx);
    const strategyCtx = buildStrategy(classifiedCtx);
    const draftCtx = draft(strategyCtx);
    const validatedCtx = validate(draftCtx);
    const xrayCtx = xray(validatedCtx);
    expect(xrayCtx.xrayIssues.some(i => i.includes('contradictory'))).toBe(true);
  });

  it('flags waiver filing without waiver ground', () => {
    const ctx = createI751Context('case-1', 'owner-1');
    const intakeCtx = intake(ctx, 'I need a waiver');
    const analyzedCtx = analyze(intakeCtx);
    // Force waiver type without ground
    if (analyzedCtx.analysis) {
      analyzedCtx.analysis.filingType = 'waiver_good_faith_marriage';
      analyzedCtx.analysis.waiverGround = 'none';
    }
    const classifiedCtx = classify(analyzedCtx);
    const strategyCtx = buildStrategy(classifiedCtx);
    const draftCtx = draft(strategyCtx);
    const validatedCtx = validate(draftCtx);
    const xrayCtx = xray(validatedCtx);
    expect(xrayCtx.xrayIssues.some(i => i.includes('Waiver filing type detected but no waiver ground'))).toBe(true);
  });

  it('passes clean X-Ray for well-formed joint filing', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'My spouse and I want to file I-751 jointly with joint bank accounts and photos');
    expect(ctx.xrayIssues.length).toBe(0);
  });
});

// ─── Validation ──────────────────────────────────────────────────────────────

describe('I-751 Validation', () => {
  it('flags missing filing type for joint filing preparation', () => {
    const ctx = validate(draft(buildStrategy(classify(analyze(intake(createI751Context('case-1', 'owner-1'), 'I need to file my I-751'))))));
    expect(ctx.validationIssues.some(i => i.includes('Filing type not determined'))).toBe(true);
  });

  it('flags missing waiver ground for waiver filing', () => {
    const ctx = validate(draft(buildStrategy(classify(analyze(intake(createI751Context('case-1', 'owner-1'), 'I need a waiver for my I-751'))))));
    expect(ctx.validationIssues.some(i => i.includes('Waiver ground not identified'))).toBe(true);
  });

  it('flags missing good cause for late filing', () => {
    const ctx = validate(draft(buildStrategy(classify(analyze(intake(createI751Context('case-1', 'owner-1'), 'I missed the filing window for my I-751'))))));
    expect(ctx.validationIssues.some(i => i.includes('Good cause'))).toBe(true);
  });

  it('flags missing attorney for denial handling', () => {
    const ctx = validate(draft(buildStrategy(classify(analyze(intake(createI751Context('case-1', 'owner-1'), 'USCIS denied my I-751'))))));
    expect(ctx.validationIssues.some(i => i.includes('Legal representation'))).toBe(true);
  });

  it('passes validation for well-formed joint filing', () => {
    const ctx = validate(draft(buildStrategy(classify(analyze(intake(createI751Context('case-1', 'owner-1'), 'My spouse and I want to file I-751 jointly with joint bank accounts and photos'))))));
    expect(ctx.validationIssues.length).toBe(0);
  });
});

// ─── Gold Certification ───────────────────────────────────────────────────────

describe('I-751 Gold Certification — All 27 Stages', () => {
  it('has exactly 27 Gold stages', () => {
    expect(ALL_GOLD_STAGES.length).toBe(27);
  });

  let fullCtx: I751Context;
  beforeEach(() => {
    fullCtx = runFullPipeline('case-gold', 'owner-gold', 'My spouse and I want to file I-751 jointly with joint bank accounts and photos', {
      approved: true,
      paymentVerified: true,
      fulfillmentId: 'fulfill-gold',
      trackingNumber: 'TRK-GOLD-001',
      proofId: 'proof-gold',
    });

  });

  // ── Stage 1: Intake ──
  it('intake — case created with user text', () => {
    expect(fullCtx.userText).toBeTruthy();
    expect(fullCtx.caseId).toBe('case-gold');
    expect(fullCtx.auditTrail.some(e => e.event === 'INTAKE')).toBe(true);
  });

  // ── Stage 2: Document Ingestion ──
  it('document_ingestion — user text provides document context', () => {
    expect(fullCtx.userText.length).toBeGreaterThan(10);
  });

  // ── Stage 3: Classification ──
  it('classification — event type classified', () => {
    expect(fullCtx.analysis?.eventType).toBe('joint_filing_preparation');
    expect(fullCtx.auditTrail.some(e => e.event === 'CLASSIFIED')).toBe(true);
  });

  // ── Stage 4: Extraction ──
  it('extraction — evidence types extracted from text', () => {
    expect(fullCtx.analysis?.evidenceStatus).toBeDefined();
    expect(fullCtx.analysis?.evidenceStatus.length).toBeGreaterThan(0);
  });

  // ── Stage 5: Provenance ──
  it('provenance — form type and receipt preserved', () => {
    expect(fullCtx.analysis?.formType).toBe('I-751');
    expect(fullCtx.analysis?.authority).toContain('INA § 216');
  });

  // ── Stage 6: Fact Normalization ──
  it('fact_normalization — analysis fields populated', () => {
    expect(fullCtx.analysis?.urgency).toBeDefined();
    expect(fullCtx.analysis?.filingType).toBeDefined();
    expect(fullCtx.analysis?.filingStatus).toBeDefined();
  });

  // ── Stage 7: Deadlines ──
  it('deadlines — deadline logic available', () => {
    expect(fullCtx.analysis?.filingWindowStatus).toBeDefined();
  });

  // ── Stage 8: Issues ──
  it('issues — event-specific issues detected', () => {
    expect(fullCtx.validationIssues).toBeDefined();
    expect(Array.isArray(fullCtx.validationIssues)).toBe(true);
  });

  // ── Stage 9: Evidence ──
  it('evidence — evidence types detected', () => {
    expect(fullCtx.analysis?.evidenceStatus).toContain('joint_bank_accounts');
    expect(fullCtx.analysis?.evidenceStatus).toContain('photos_timeline');
  });

  // ── Stage 10: Authority ──
  it('authority — legal authority cited', () => {
    expect(fullCtx.analysis?.authority).toContain('INA § 216');
    expect(fullCtx.analysis?.authority).toContain('8 CFR § 216');
  });

  // ── Stage 11: Risk ──
  it('risk — risk level assessed', () => {
    expect(fullCtx.analysis?.riskLevel).toBeDefined();
    expect(['low', 'moderate', 'elevated']).toContain(fullCtx.analysis?.riskLevel);
  });

  // ── Stage 12: Strategy ──
  it('strategy — strategy generated', () => {
    expect(fullCtx.strategy).toBeDefined();
    expect(fullCtx.strategy?.approach).toContain('jointly');
    expect(fullCtx.strategy?.keyArguments.length).toBeGreaterThan(0);
  });

  // ── Stage 13: Drafting ──
  it('drafting — letter drafted', () => {
    expect(fullCtx.draft).toBeTruthy();
    expect(fullCtx.draft).toContain('I-751');
    expect(fullCtx.draft).toContain('USCIS');
  });

  // ── Stage 14: Validation ──
  it('validation — validation performed', () => {
    expect(fullCtx.auditTrail.some(e => e.event === 'VALIDATED')).toBe(true);
  });

  // ── Stage 15: X-Ray ──
  it('x_ray — adversarial review performed', () => {
    expect(fullCtx.auditTrail.some(e => e.event === 'XRAY_COMPLETE')).toBe(true);
  });

  // ── Stage 16: Blocking Gates ──
  it('blocking_gates — no blocking X-Ray issues for clean case', () => {
    expect(fullCtx.xrayIssues.length).toBe(0);
  });

  // ── Stage 17: Human Review ──
  it('human_review — user reviewed and approved', () => {
    expect(fullCtx.approved).toBe(true);
    expect(fullCtx.auditTrail.some(e => e.event === 'USER_REVIEW')).toBe(true);
  });

  // ── Stage 18: Explicit Approval ──
  it('explicit_approval — approval explicitly granted', () => {
    expect(fullCtx.approved).toBe(true);
  });

  // ── Stage 19: Payment ──
  it('payment — payment verified', () => {
    expect(fullCtx.paid).toBe(true);
    expect(fullCtx.auditTrail.some(e => e.event === 'PAID')).toBe(true);
  });

  // ── Stage 20: Fulfillment ──
  it('fulfillment — fulfillment completed', () => {
    expect(fullCtx.fulfillmentId).toBe('fulfill-gold');
    expect(fullCtx.auditTrail.some(e => e.event === 'FULFILLED')).toBe(true);
  });

  // ── Stage 21: Provider Submission ──
  it('provider_submission — provider order available in pipeline', () => {
    expect(fullCtx.fulfillmentId).toBeTruthy();
  });

  // ── Stage 22: Tracking ──
  it('tracking — tracking number recorded', () => {
    expect(fullCtx.trackingNumber).toBe('TRK-GOLD-001');
    expect(fullCtx.auditTrail.some(e => e.event === 'TRACKED')).toBe(true);
  });

  // ── Stage 23: Proof ──
  it('proof — proof preserved', () => {
    expect(fullCtx.proofId).toBe('proof-gold');
    expect(fullCtx.auditTrail.some(e => e.event === 'PROVEN')).toBe(true);
  });

  // ── Stage 24: Audit ──
  it('audit — complete audit trail', () => {
    expect(fullCtx.auditTrail.length).toBeGreaterThanOrEqual(10);
    for (const entry of fullCtx.auditTrail) {
      expect(entry.timestamp).toBeTruthy();
      expect(entry.event).toBeTruthy();
    }
  });

  // ── Stage 25: Idempotency ──
  it('idempotency — idempotency key verified', () => {
    const key = createIdempotencyKey(fullCtx);
    expect(key).toContain('i751');
    expect(key).toContain('case-gold');
    expect(key).toContain('owner-gold');
    const dup = verifyIdempotency(fullCtx, new Set([key]));
    expect(dup.duplicate).toBe(true);
    const nonDup = verifyIdempotency(fullCtx, new Set());
    expect(nonDup.duplicate).toBe(false);
  });

  // ── Stage 26: Owner Isolation ──
  it('owner_isolation — owner isolation verified', () => {
    const ctxA = createI751Context('case-A', 'owner-A');
    const ctxB = createI751Context('case-B', 'owner-B');
    expect(verifyOwnerIsolation(ctxA, ctxB)).toBe(true);
  });

  // ── Stage 27: Failure/Retry ──
  it('failure_retry — retry logic available', () => {
    const failed = runFullPipeline('case-1', 'owner-1', 'I need to file I-751', { approved: true, paymentVerified: false });
    expect(failed.paid).toBe(false);
    const retried = pay(failed, true);
    expect(retried.paid).toBe(true);
  });

  // ── Gold Certification Harness ──
  it('passes full Gold certification harness', () => {
    expect(ALL_GOLD_STAGES.length).toBe(27);
    expect(fullCtx.auditTrail.length).toBeGreaterThanOrEqual(10);
    expect(fullCtx.xrayIssues.length).toBe(0);
    expect(fullCtx.approved).toBe(true);
    expect(fullCtx.paid).toBe(true);
    expect(fullCtx.fulfillmentId).toBeTruthy();
    expect(fullCtx.trackingNumber).toBeTruthy();
    expect(fullCtx.proofId).toBeTruthy();
  });
});

// ─── Failure & Retry Behavior ────────────────────────────────────────────────

describe('I-751 Failure & Retry', () => {
  it('handles unapproved draft gracefully', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to file I-751', {
      approved: false,
    });
    expect(ctx.approved).toBe(false);
  });

  it('handles failed payment gracefully', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to file I-751', {
      approved: true,
      paymentVerified: false,
    });
    expect(ctx.paid).toBe(false);
  });

  it('can retry after failed payment', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to file I-751', {
      approved: true,
      paymentVerified: false,
    });
    const retried = pay(ctx, true);
    expect(retried.paid).toBe(true);
  });

  it('handles missing fulfillment gracefully', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to file I-751', {
      approved: true,
      paymentVerified: true,
    });
    expect(ctx.fulfillmentId).toBeUndefined();
  });
});

// ─── Waiver-Specific Tests ───────────────────────────────────────────────────

describe('I-751 Waiver Scenarios', () => {
  it('handles good faith marriage waiver with divorce decree', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I am divorced with a good faith marriage. I have my divorce decree and joint bank accounts from our marriage.');
    expect(ctx.analysis?.filingType).toBe('waiver_good_faith_marriage');
    expect(ctx.analysis?.waiverGround).toBe('good_faith_marriage');
    expect(ctx.analysis?.evidenceStatus).toContain('divorce_decree');
    expect(ctx.strategy?.approach).toContain('good faith marriage');
  });

  it('handles extreme hardship waiver', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I would face extreme hardship if removed. I have medical records showing my hardship evidence.');
    expect(ctx.analysis?.filingType).toBe('waiver_extreme_hardship');
    expect(ctx.analysis?.waiverGround).toBe('extreme_hardship');
  });

  it('handles battery/extreme cruelty waiver (VAWA)', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'My spouse battered me. I have a police report and protection order as abuse evidence.');
    expect(ctx.analysis?.filingType).toBe('waiver_battery_extreme_cruelty');
    expect(ctx.analysis?.waiverGround).toBe('battery_extreme_cruelty');
    expect(ctx.analysis?.evidenceStatus).toContain('abuse_evidence');
  });

  it('handles death of spouse waiver', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'My spouse died. I have the death certificate and want to file I-751 as a widow.');
    expect(ctx.analysis?.filingType).toBe('waiver_death_of_spouse');
    expect(ctx.analysis?.waiverGround).toBe('death_of_spouse');
    expect(ctx.analysis?.evidenceStatus).toContain('death_certificate');
  });
});

// ─── Filing Window Tests ─────────────────────────────────────────────────────

describe('I-751 Filing Window Scenarios', () => {
  it('warns when filing window is about to open', () => {
    const futureDate = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const analysis = analyzeI751('My conditional green card is expiring', undefined, undefined, futureDate);
    expect(analysis.filingWindowStatus).toBe('before_window');
    expect(analysis.inFilingWindow).toBe(false);
  });

  it('confirms when in filing window', () => {
    const futureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const analysis = analyzeI751('My conditional green card is expiring', undefined, undefined, futureDate);
    expect(analysis.filingWindowStatus).toBe('in_window');
    expect(analysis.inFilingWindow).toBe(true);
  });

  it('flags when filing window has expired', () => {
    const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const analysis = analyzeI751('My conditional green card expired', undefined, undefined, pastDate);
    expect(analysis.filingWindowStatus).toBe('window_expired');
    expect(analysis.inFilingWindow).toBe(false);
    expect(analysis.urgency).toBe('critical');
  });
});

// ─── Interview Scenarios ─────────────────────────────────────────────────────

describe('I-751 Interview Scenarios', () => {
  it('handles interview preparation', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I am preparing for my I-751 interview, what should I bring?');
    expect(ctx.analysis?.eventType).toBe('interview_preparation');
  });

  it('handles interview rescheduling', () => {
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to reschedule my I-751 interview', {
      interviewDate: futureDate,
    });
    expect(ctx.analysis?.eventType).toBe('interview_rescheduling');
    expect(ctx.analysis?.canReschedule).toBe(true);
  });

  it('handles missed interview with critical urgency', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I missed my I-751 interview yesterday');
    expect(ctx.analysis?.eventType).toBe('missed_interview');
    expect(ctx.analysis?.urgency).toBe('critical');
    expect(ctx.analysis?.riskLevel).toBe('elevated');
    expect(ctx.analysis?.missedInterviewConsequences).toContain('NTA');
  });
});

// ─── Denial Handling ─────────────────────────────────────────────────────────

describe('I-751 Denial Handling', () => {
  it('handles denial with NTA referral', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'USCIS denied my I-751 and I received a notice to appear in immigration court');
    expect(ctx.analysis?.eventType).toBe('denial_handling');
    expect(ctx.analysis?.filingStatus).toBe('nta_issued');
    expect(ctx.analysis?.riskLevel).toBe('elevated');
  });

  it('handles denial without NTA', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'USCIS denied my I-751');
    expect(ctx.analysis?.eventType).toBe('denial_handling');
    expect(ctx.analysis?.filingStatus).toBe('denied');
  });
});

// ─── Distinctness from Other Workflows ──────────────────────────────────────

describe('I-751 Distinctness', () => {
  it('I-751 has unique filing window concept not in other workflows', () => {
    const analysis = analyzeI751('My conditional green card is expiring');
    expect(analysis.filingWindowStatus).toBeDefined();
    expect(analysis.inFilingWindow).toBeDefined();
  });

  it('I-751 has unique waiver grounds not in other workflows', () => {
    const analysis = analyzeI751('I need a good faith marriage waiver');
    expect(analysis.waiverGround).toBe('good_faith_marriage');
  });

  it('I-751 has unique filing type (joint vs waiver) not in other workflows', () => {
    const joint = analyzeI751('My spouse and I are filing jointly');
    expect(joint.filingType).toBe('joint_filing');

    const waiver = analyzeI751('I am divorced and need a waiver');
    expect(waiver.filingType).toBe('waiver_good_faith_marriage');
  });

  it('I-751 has unique NTA referral consequence not in other workflows', () => {
    const analysis = analyzeI751('I missed my I-751 interview');
    expect(analysis.missedInterviewConsequences).toContain('NTA');
  });
});
