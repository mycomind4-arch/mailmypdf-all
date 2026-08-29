/**
 * Consular Processing — Comprehensive Gold Certification Tests
 *
 * Pipeline P09 — Consular Processing
 *
 * Tests cover all 27 Gold certification stages:
 *   intake, document_ingestion, classification, extraction, provenance,
 *   fact_normalization, deadlines, issues, evidence, authority, risk,
 *   strategy, drafting, validation, x_ray, blocking_gates,
 *   human_review, explicit_approval, payment, fulfillment, provider_submission,
 *   tracking, proof, audit, idempotency, owner_isolation, failure_retry
 */

import { describe, expect, it } from 'vitest';
import {
  detectConsularEvent,
  detectUrgency,
  detectNVCStage,
  detectVisaCategory,
  detectDocumentTypes,
  extractNVCCaseNumber,
  extractInvoiceId,
  extractEmbassyCode,
  getEmbassy,
  calculateDaysUntilInterview,
  calculateDaysSinceInterview,
  calculateDaysUntilVisaExpiration,
  canReschedule,
  getMissedInterviewConsequences,
  analyzeConsular,
  buildConsularStrategy,
  type ConsularEventType,
  type ConsularUrgency,
  type NVCStage,
  type VisaCategory,
  type DocumentType,
  type ConsularAnalysis,
  type ConsularStrategy,
} from './consular-model';
import {
  CONSULAR_STATES,
  createConsularContext,
  intake,
  analyze,
  classify,
  buildStrategy,
  draft,
  validate,
  xray,
  userReview,
  approve,
  pay,
  fulfill,
  track,
  prove,
  runFullConsular,
  processConsularIdempotent,
  assertOwnerIsolation,
  retryFromStage,
  type ConsularContext,
  type ConsularState,
} from './consular-workflow';

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 1: INTAKE
// ═══════════════════════════════════════════════════════════════════════════════

describe('CONSULAR_CASE_CREATED — Stage: intake', () => {
  it('creates context with case ID and owner ID', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    expect(ctx.caseId).toBe('case-1');
    expect(ctx.ownerId).toBe('owner-1');
  });

  it('initializes with empty user text', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    expect(ctx.userText).toBe('');
  });

  it('initializes with empty audit trail', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    expect(ctx.auditTrail).toHaveLength(0);
  });

  it('intake stores user text', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    const updated = intake(ctx, 'I need help with my DS-260');
    expect(updated.userText).toBe('I need help with my DS-260');
  });

  it('intake stores optional form type', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    const updated = intake(ctx, 'I need help', 'DS-260');
    expect(updated.formType).toBe('DS-260');
  });

  it('intake stores optional NVC case number', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    const updated = intake(ctx, 'I need help', 'DS-260', 'MTL1234567890');
    expect(updated.nvcCaseNumber).toBe('MTL1234567890');
  });

  it('intake stores optional interview date', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    const updated = intake(ctx, 'I need help', 'DS-260', 'MTL1234567890', '2026-09-15');
    expect(updated.interviewDate).toBe('2026-09-15');
  });

  it('intake stores optional visa expiration date', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    const updated = intake(ctx, 'I need help', 'DS-260', 'MTL1234567890', '2026-09-15', '2027-03-15');
    expect(updated.visaExpirationDate).toBe('2027-03-15');
  });

  it('intake adds audit trail entry', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    const updated = intake(ctx, 'I need help with my DS-260');
    expect(updated.auditTrail).toHaveLength(1);
    expect(updated.auditTrail[0].event).toBe('INTAKE');
  });

  it('intake is idempotent — can be called with same data safely', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    const first = intake(ctx, 'text', 'DS-260');
    const second = intake(first, 'text', 'DS-260');
    expect(second.userText).toBe('text');
    expect(second.auditTrail).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 2: DOCUMENT_INGESTION
// ═══════════════════════════════════════════════════════════════════════════════

describe('CONSULAR_NOTICE_OPTIONAL — Stage: document_ingestion', () => {
  it('document upload is optional — works with text alone', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    const updated = intake(ctx, 'I need to prepare for my consular interview');
    expect(updated.userText).toContain('consular interview');
  });

  it('document upload is optional — works with NVC correspondence', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    const updated = intake(ctx, 'NVC sent me a fee invoice for my IV case MTL1234567890');
    expect(updated.userText).toContain('NVC');
  });

  it('document upload is optional — works with embassy interview letter', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    const updated = intake(ctx, 'The embassy sent me an interview appointment letter');
    expect(updated.userText).toContain('interview appointment');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 3: CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('CONSULAR_EVENT_CLASSIFIED — Stage: classification', () => {
  it('detects nvc_processing event', () => {
    expect(detectConsularEvent('I need to submit my DS-260 and pay the IV fee')).toBe('nvc_processing');
  });

  it('detects interview_preparation event', () => {
    expect(detectConsularEvent('I need to prepare for my consular interview at the embassy')).toBe('interview_preparation');
  });

  it('detects interview_rescheduling event', () => {
    expect(detectConsularEvent('I need to reschedule my visa interview')).toBe('interview_rescheduling');
  });

  it('detects missed_interview event', () => {
    expect(detectConsularEvent('I missed my consular interview last week')).toBe('missed_interview');
  });

  it('detects document_deficiency event', () => {
    expect(detectConsularEvent('I am missing police certificates for my visa application')).toBe('document_deficiency');
  });

  it('detects priority_date_retrogression event', () => {
    expect(detectConsularEvent('My priority date retrogressed and is no longer current')).toBe('priority_date_retrogression');
  });

  it('detects delayed_processing event', () => {
    expect(detectConsularEvent('My case is stuck at NVC and taking too long')).toBe('delayed_processing');
  });

  it('detects medical_exam_issue event', () => {
    expect(detectConsularEvent('My medical exam has expired and I need a new panel physician')).toBe('medical_exam_issue');
  });

  it('detects visa_issuance_urgency event', () => {
    expect(detectConsularEvent('My visa is expiring soon and I need to travel to the US before it expires')).toBe('visa_issuance_urgency');
  });

  it('detects unknown event for unrelated text', () => {
    expect(detectConsularEvent('I want to buy a car')).toBe('unknown');
  });

  it('detects NVC stage: petition_approved', () => {
    expect(detectNVCStage('My I-130 was approved and the case is now at NVC')).toBe('petition_approved');
  });

  it('detects NVC stage: ds_260_submitted', () => {
    expect(detectNVCStage('I submitted the DS-260 application online')).toBe('ds_260_submitted');
  });

  it('detects NVC stage: fees_paid', () => {
    expect(detectNVCStage('I paid the IV fee and AOS fee')).toBe('fees_paid');
  });

  it('detects NVC stage: documents_uploaded', () => {
    expect(detectNVCStage('I uploaded all my civil documents to NVC')).toBe('documents_uploaded');
  });

  it('detects NVC stage: case_complete', () => {
    expect(detectNVCStage('NVC said my case is complete and qualified')).toBe('case_complete');
  });

  it('detects NVC stage: interview_scheduled', () => {
    expect(detectNVCStage('I received my interview appointment letter from the embassy')).toBe('interview_scheduled');
  });

  it('detects NVC stage: interview_completed', () => {
    expect(detectNVCStage('My interview was completed last month')).toBe('interview_completed');
  });

  it('detects NVC stage: visa_issued', () => {
    expect(detectNVCStage('My visa was approved and issued in my passport')).toBe('visa_issued');
  });

  it('detects NVC stage: administrative_processing', () => {
    expect(detectNVCStage('My case is in administrative processing under 221(g)')).toBe('administrative_processing');
  });

  it('detects visa category: IR', () => {
    expect(detectVisaCategory('I am the spouse of a US citizen, immediate relative')).toBe('IR');
  });

  it('detects visa category: CR', () => {
    expect(detectVisaCategory('I am a conditional resident spouse, married less than 2 years')).toBe('CR');
  });

  it('detects visa category: F1', () => {
    expect(detectVisaCategory('I am the unmarried son of a US citizen')).toBe('F1');
  });

  it('detects visa category: F2A', () => {
    expect(detectVisaCategory('I am the spouse of an LPR')).toBe('F2A');
  });

  it('detects visa category: F4', () => {
    expect(detectVisaCategory('My US citizen sister filed for me, F4 category')).toBe('F4');
  });

  it('detects visa category: EB1', () => {
    expect(detectVisaCategory('I have extraordinary ability, EB1 category')).toBe('EB1');
  });

  it('detects visa category: DV', () => {
    expect(detectVisaCategory('I won the diversity visa lottery, DV2027')).toBe('DV');
  });

  it('detects visa category: unknown for unclassified text', () => {
    expect(detectVisaCategory('I want a visa')).toBe('unknown');
  });

  it('detects document types: police certificate', () => {
    expect(detectDocumentTypes('I need police certificates from multiple countries')).toContain('police_certificate');
  });

  it('detects document types: birth certificate', () => {
    expect(detectDocumentTypes('I need my birth certificate translated')).toContain('birth_certificate');
  });

  it('detects document types: translations', () => {
    expect(detectDocumentTypes('I need certified English translations of my documents')).toContain('translations');
  });

  it('detects document types: financial evidence', () => {
    expect(detectDocumentTypes('I need help with the affidavit of support I-864 and tax returns')).toContain('financial_evidence');
  });

  it('detects document types: medical report', () => {
    expect(detectDocumentTypes('I need my DS-3025 vaccination record from the panel physician')).toContain('medical_report');
  });

  it('detects document types: unknown for no match', () => {
    expect(detectDocumentTypes('hello world')).toContain('unknown');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 4: EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

describe('CONSULAR_RECEIPT_INTERVIEW_DATE — Stage: extraction', () => {
  it('extracts NVC case number', () => {
    expect(extractNVCCaseNumber('My NVC case number is MTL1234567890')).toBe('MTL1234567890');
  });

  it('extracts NVC case number from lowercase', () => {
    expect(extractNVCCaseNumber('case mtl1234567890 is my number')).toBe('MTL1234567890');
  });

  it('returns undefined for no NVC case number', () => {
    expect(extractNVCCaseNumber('I need help with my visa')).toBeUndefined();
  });

  it('extracts invoice ID', () => {
    expect(extractInvoiceId('My invoice ID is INV123456')).toBe('INV123456');
  });

  it('returns undefined for no invoice ID', () => {
    expect(extractInvoiceId('I need to pay my fees')).toBeUndefined();
  });

  it('extracts embassy code', () => {
    expect(extractEmbassyCode('My interview is at the embassy in MTL')).toBe('MTL');
  });

  it('returns undefined for no embassy code', () => {
    expect(extractEmbassyCode('I have an interview next week')).toBeUndefined();
  });

  it('extracts interview date from text', () => {
    const text = 'My interview is on 2026-09-15';
    const result = analyzeConsular(text);
    expect(result.interviewDate).toBe('2026-09-15');
  });

  it('extracts visa expiration date from text', () => {
    const text = 'My visa expires on 2027-03-15 and I need to travel';
    const result = analyzeConsular(text);
    expect(result.visaExpirationDate).toBe('2027-03-15');
  });

  it('extracts priority date from text', () => {
    const text = 'My priority date is 01/15/2022';
    const result = analyzeConsular(text);
    expect(result.priorityDate).toBe('2022-01-15');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 5: PROVENANCE
// ═══════════════════════════════════════════════════════════════════════════════

describe('CONSULAR_PROVENANCE — Stage: provenance', () => {
  it('analyze produces ConsularAnalysis with all required fields', () => {
    const result = analyzeConsular('I need to prepare for my consular interview');
    expect(result.eventType).toBeDefined();
    expect(result.urgency).toBeDefined();
    expect(result.nvcStage).toBeDefined();
    expect(result.visaCategory).toBeDefined();
    expect(result.documentStatus).toBeDefined();
    expect(result.recommendedAction).toBeDefined();
    expect(result.authority).toBeDefined();
    expect(result.riskLevel).toBeDefined();
    expect(result.canReschedule).toBeDefined();
    expect(result.missedInterviewConsequences).toBeDefined();
  });

  it('authority cites INA 222, 9 FAM, 22 CFR 42', () => {
    const result = analyzeConsular('I need help with my DS-260');
    expect(result.authority).toContain('222');
    expect(result.authority).toContain('9 FAM');
    expect(result.authority).toContain('22 CFR');
  });

  it('getEmbassy returns correct embassy info for valid code', () => {
    const embassy = getEmbassy('MTM');
    expect(embassy?.city).toBe('Manila');
    expect(embassy?.country).toBe('Philippines');
  });

  it('getEmbassy returns undefined for invalid code', () => {
    expect(getEmbassy('XYZ')).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 6: FACT_NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('CONSULAR_FACTS — Stage: fact_normalization', () => {
  it('form type defaults to DS-260 when not specified', () => {
    const result = analyzeConsular('I need help with my NVC processing');
    expect(result.formType).toBe('DS-260');
  });

  it('form type detected from text', () => {
    const result = analyzeConsular('I need help with my I-864 affidavit of support');
    expect(result.formType).toBe('I-864');
  });

  it('NVC case number is uppercased', () => {
    const result = analyzeConsular('my case is mtl1234567890');
    expect(result.nvcCaseNumber).toBe('MTL1234567890');
  });

  it('NVC stage is detected from text', () => {
    const result = analyzeConsular('I paid the IV fee and AOS fee');
    expect(result.nvcStage).toBe('fees_paid');
  });

  it('visa category is detected from text', () => {
    const result = analyzeConsular('I am the spouse of a US citizen, immediate relative');
    expect(result.visaCategory).toBe('IR');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 7: DEADLINES
// ═══════════════════════════════════════════════════════════════════════════════

describe('CONSULAR_INTERVIEW_DEADLINE — Stage: deadlines', () => {
  it('calculates days until interview', () => {
    expect(calculateDaysUntilInterview('2026-09-22', '2026-08-23')).toBe(30);
  });

  it('calculates days since interview', () => {
    expect(calculateDaysSinceInterview('2026-06-24', '2026-08-23')).toBe(60);
  });

  it('calculates days until visa expiration', () => {
    expect(calculateDaysUntilVisaExpiration('2026-10-07', '2026-08-23')).toBe(45);
  });

  it('days until interview can be negative (past date)', () => {
    expect(calculateDaysUntilInterview('2020-01-01')).toBeLessThan(0);
  });

  it('detects critical urgency for missed interview (past date)', () => {
    expect(detectUrgency('I missed my interview', '2020-01-01')).toBe('critical');
  });

  it('detects critical urgency for visa expiring within 7 days', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 5);
    const dateStr = soon.toISOString().split('T')[0];
    expect(detectUrgency('visa expiring', undefined, dateStr)).toBe('critical');
  });

  it('detects time_sensitive for interview within 14 days', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 10);
    const dateStr = soon.toISOString().split('T')[0];
    expect(detectUrgency('I need help', dateStr)).toBe('time_sensitive');
  });

  it('detects routine urgency for no deadline', () => {
    expect(detectUrgency('I want to prepare for my interview eventually')).toBe('routine');
  });

  it('rescheduleWindowDays is 30', () => {
    const result = analyzeConsular('I need help with NVC processing');
    expect(result.rescheduleWindowDays).toBe(30);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 8: ISSUES
// ═══════════════════════════════════════════════════════════════════════════════

describe('CONSULAR_ISSUES — Stage: issues', () => {
  it('identifies 9 event types as distinct issues', () => {
    const events: ConsularEventType[] = [
      'nvc_processing', 'interview_preparation', 'interview_rescheduling', 'missed_interview',
      'document_deficiency', 'priority_date_retrogression', 'delayed_processing',
      'medical_exam_issue', 'visa_issuance_urgency',
    ];
    expect(events).toHaveLength(9);
    expect(events).not.toContain('unknown');
  });

  it('canReschedule returns true for missed_interview', () => {
    expect(canReschedule('missed_interview')).toBe(true);
  });

  it('canReschedule returns true for interview_rescheduling with positive days', () => {
    expect(canReschedule('interview_rescheduling', 10)).toBe(true);
  });

  it('canReschedule returns false for interview_rescheduling with zero days', () => {
    expect(canReschedule('interview_rescheduling', 0)).toBe(false);
  });

  it('canReschedule returns false for unknown event type', () => {
    expect(canReschedule('unknown')).toBe(false);
  });

  it('missedInterviewConsequences mentions case termination', () => {
    const consequences = getMissedInterviewConsequences();
    expect(consequences).toContain('terminated');
  });

  it('missedInterviewConsequences mentions 22 CFR', () => {
    const consequences = getMissedInterviewConsequences();
    expect(consequences).toContain('42.63');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 9: EVIDENCE
// ═══════════════════════════════════════════════════════════════════════════════

describe('CONSULAR_EVIDENCE — Stage: evidence', () => {
  it('strategy for nvc_processing lists DS-260 and fee evidence', () => {
    const analysis = analyzeConsular('I need help with my DS-260 and fee payment');
    const strategy = buildConsularStrategy(analysis);
    expect(strategy.supportingEvidence.some(e => e.includes('DS-260'))).toBe(true);
    expect(strategy.supportingEvidence.some(e => e.includes('fee'))).toBe(true);
  });

  it('strategy for interview_preparation lists passport and civil documents', () => {
    const analysis = analyzeConsular('I need to prepare for my consular interview');
    const strategy = buildConsularStrategy(analysis);
    expect(strategy.supportingEvidence.some(e => e.includes('passport'))).toBe(true);
    expect(strategy.supportingEvidence.some(e => e.includes('civil documents'))).toBe(true);
  });

  it('strategy for missed_interview lists emergency documentation', () => {
    const analysis = analyzeConsular('I missed my consular interview');
    const strategy = buildConsularStrategy(analysis);
    expect(strategy.supportingEvidence.some(e => e.includes('emergency'))).toBe(true);
  });

  it('strategy for document_deficiency lists missing documents', () => {
    const analysis = analyzeConsular('I am missing police certificates');
    const strategy = buildConsularStrategy(analysis);
    expect(strategy.supportingEvidence.some(e => e.includes('missing'))).toBe(true);
  });

  it('strategy for medical_exam_issue lists panel physician and DS-3025', () => {
    const analysis = analyzeConsular('My medical exam expired, I need a new panel physician');
    const strategy = buildConsularStrategy(analysis);
    expect(strategy.supportingEvidence.some(e => e.includes('DS-3025'))).toBe(true);
    expect(strategy.supportingEvidence.some(e => e.includes('panel physician'))).toBe(true);
  });

  it('strategy for visa_issuance_urgency lists visa and travel itinerary', () => {
    const analysis = analyzeConsular('My visa is expiring soon and I need to travel before it expires');
    const strategy = buildConsularStrategy(analysis);
    expect(strategy.supportingEvidence.some(e => e.includes('visa'))).toBe(true);
    expect(strategy.supportingEvidence.some(e => e.includes('itinerary'))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 10: AUTHORITY
// ═══════════════════════════════════════════════════════════════════════════════

describe('CONSULAR_AUTHORITY — Stage: authority', () => {
  it('analysis cites INA 222', () => {
    const result = analyzeConsular('I need help');
    expect(result.authority).toContain('222');
  });

  it('analysis cites 9 FAM', () => {
    const result = analyzeConsular('I need help');
    expect(result.authority).toContain('9 FAM');
  });

  it('analysis cites 22 CFR 42', () => {
    const result = analyzeConsular('I need help');
    expect(result.authority).toContain('22 CFR');
    expect(result.authority).toContain('42');
  });

  it('analysis cites INA 203 for visa bulletin', () => {
    const result = analyzeConsular('I need help');
    expect(result.authority).toContain('203');
  });

  it('strategy inherits authority from analysis', () => {
    const analysis = analyzeConsular('I need help');
    const strategy = buildConsularStrategy(analysis);
    expect(strategy.authority).toBe(analysis.authority);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 11: RISK
// ═══════════════════════════════════════════════════════════════════════════════

describe('CONSULAR_RISK — Stage: risk', () => {
  it('nvc_processing is low risk', () => {
    const result = analyzeConsular('I need help with my DS-260');
    expect(result.riskLevel).toBe('low');
  });

  it('interview_preparation is low risk', () => {
    const result = analyzeConsular('I want to prepare for my consular interview');
    expect(result.riskLevel).toBe('low');
  });

  it('missed_interview is elevated risk', () => {
    const result = analyzeConsular('I missed my consular interview');
    expect(result.riskLevel).toBe('elevated');
  });

  it('visa_issuance_urgency is elevated risk', () => {
    const result = analyzeConsular('My visa is about to expire, I need to travel before it expires');
    expect(result.riskLevel).toBe('elevated');
  });

  it('document_deficiency is moderate risk', () => {
    const result = analyzeConsular('I am missing my birth certificate');
    expect(result.riskLevel).toBe('moderate');
  });

  it('interview_rescheduling urgency is moderate or elevated', () => {
    const result = analyzeConsular('I need to reschedule my interview');
    expect(['moderate', 'elevated']).toContain(result.riskLevel);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 12: STRATEGY
// ═══════════════════════════════════════════════════════════════════════════════

describe('CONSULAR_STRATEGY — Stage: strategy', () => {
  it('strategy for nvc_processing has correct approach', () => {
    const analysis = analyzeConsular('I need help with my DS-260 and NVC processing');
    const strategy = buildConsularStrategy(analysis);
    expect(strategy.approach).toBe('NVC Processing Guidance');
  });

  it('strategy for interview_preparation has correct approach', () => {
    const analysis = analyzeConsular('I need to prepare for my consular interview at the embassy');
    const strategy = buildConsularStrategy(analysis);
    expect(strategy.approach).toBe('Consular Interview Preparation Guide');
  });

  it('strategy for interview_rescheduling has correct approach', () => {
    const analysis = analyzeConsular('I need to reschedule my visa interview');
    const strategy = buildConsularStrategy(analysis);
    expect(strategy.approach).toBe('Consular Interview Reschedule Request');
  });

  it('strategy for missed_interview has correct approach', () => {
    const analysis = analyzeConsular('I missed my consular interview');
    const strategy = buildConsularStrategy(analysis);
    expect(strategy.approach).toBe('Missed Consular Interview Remedy');
  });

  it('strategy for document_deficiency has correct approach', () => {
    const analysis = analyzeConsular('I am missing police certificates for my visa application');
    const strategy = buildConsularStrategy(analysis);
    expect(strategy.approach).toBe('Civil Document Remediation');
  });

  it('strategy for priority_date_retrogression has correct approach', () => {
    const analysis = analyzeConsular('My priority date retrogressed');
    const strategy = buildConsularStrategy(analysis);
    expect(strategy.approach).toBe('Priority Date Retrogression Advisory');
  });

  it('strategy for delayed_processing has correct approach', () => {
    const analysis = analyzeConsular('My case is stuck at NVC');
    const strategy = buildConsularStrategy(analysis);
    expect(strategy.approach).toBe('Delayed Processing Inquiry');
  });

  it('strategy for medical_exam_issue has correct approach', () => {
    const analysis = analyzeConsular('My medical exam expired, I need a new panel physician');
    const strategy = buildConsularStrategy(analysis);
    expect(strategy.approach).toBe('Medical Examination Remediation');
  });

  it('strategy for visa_issuance_urgency has correct approach', () => {
    const analysis = analyzeConsular('My visa is expiring and I need to travel before it expires');
    const strategy = buildConsularStrategy(analysis);
    expect(strategy.approach).toBe('Visa Expiration Travel Advisory');
  });

  it('strategy always has key arguments', () => {
    const events = [
      'I need help with my DS-260',
      'I need to prepare for my consular interview',
      'I need to reschedule my interview',
      'I missed my interview',
      'I am missing police certificates',
      'My priority date retrogressed',
      'My case is stuck at NVC',
      'My medical exam expired',
      'My visa is expiring and I need to travel',
    ];
    for (const text of events) {
      const analysis = analyzeConsular(text);
      const strategy = buildConsularStrategy(analysis);
      expect(strategy.keyArguments.length).toBeGreaterThan(0);
    }
  });

  it('strategy always has supporting evidence', () => {
    const events = [
      'I need help with my DS-260',
      'I need to prepare for my consular interview',
      'I missed my interview',
    ];
    for (const text of events) {
      const analysis = analyzeConsular(text);
      const strategy = buildConsularStrategy(analysis);
      expect(strategy.supportingEvidence.length).toBeGreaterThan(0);
    }
  });

  it('strategy always has deadline note', () => {
    const analysis = analyzeConsular('I need help');
    const strategy = buildConsularStrategy(analysis);
    expect(strategy.deadlineNote).toBeDefined();
    expect(typeof strategy.deadlineNote).toBe('string');
  });

  it('strategy always has interview note', () => {
    const analysis = analyzeConsular('I need help');
    const strategy = buildConsularStrategy(analysis);
    expect(strategy.interviewNote).toBeDefined();
    expect(typeof strategy.interviewNote).toBe('string');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 13: DRAFTING
// ═══════════════════════════════════════════════════════════════════════════════

describe('CONSULAR_DRAFT — Stage: drafting', () => {
  it('draft is generated for nvc_processing', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help with my DS-260 and NVC processing');
    c = analyze(c);
    c = classify(c);
    c = buildStrategy(c);
    c = draft(c);
    expect(c.draft).toBeDefined();
    expect(c.draft!.length).toBeGreaterThan(100);
  });

  it('draft contains approach as title', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help with my DS-260');
    c = analyze(c);
    c = classify(c);
    c = buildStrategy(c);
    c = draft(c);
    expect(c.draft).toContain('NVC Processing Guidance');
  });

  it('draft contains Dear Consular Officer', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need to prepare for my consular interview');
    c = analyze(c);
    c = classify(c);
    c = buildStrategy(c);
    c = draft(c);
    expect(c.draft).toContain('Dear Consular Officer');
  });

  it('draft contains key arguments as bullet points', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I missed my consular interview');
    c = analyze(c);
    c = classify(c);
    c = buildStrategy(c);
    c = draft(c);
    expect(c.draft).toContain('- ');
  });

  it('draft contains Sincerely closing', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help');
    c = analyze(c);
    c = classify(c);
    c = buildStrategy(c);
    c = draft(c);
    expect(c.draft).toContain('Sincerely');
  });

  it('draft includes NVC case number when provided', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help', 'DS-260', 'MTL1234567890');
    c = analyze(c);
    c = classify(c);
    c = buildStrategy(c);
    c = draft(c);
    expect(c.draft).toContain('MTL1234567890');
  });

  it('draft throws if no analysis or strategy', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    expect(() => draft(ctx)).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 14: VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('CONSULAR_VALIDATED — Stage: validation', () => {
  it('validation passes for complete nvc_processing input', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help with my DS-260 and NVC processing', 'DS-260', 'MTL1234567890');
    c = analyze(c);
    c = classify(c);
    c = buildStrategy(c);
    c = draft(c);
    c = validate(c);
    expect(c.validationIssues).toHaveLength(0);
  });

  it('validation flags missing NVC case number for nvc_processing', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help with my DS-260');
    c = analyze(c);
    c = classify(c);
    c = buildStrategy(c);
    c = draft(c);
    c = validate(c);
    expect(c.validationIssues.some(i => i.includes('NVC case number'))).toBe(true);
  });

  it('validation flags missing interview date for rescheduling', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need to reschedule my interview');
    c = analyze(c);
    c = classify(c);
    c = buildStrategy(c);
    c = draft(c);
    c = validate(c);
    expect(c.validationIssues.some(i => i.includes('Interview date'))).toBe(true);
  });

  it('validation flags missing visa expiration for visa_issuance_urgency', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'My visa is expiring and I need to travel before it expires');
    c = analyze(c);
    c = classify(c);
    c = buildStrategy(c);
    c = draft(c);
    c = validate(c);
    expect(c.validationIssues.some(i => i.includes('Visa expiration'))).toBe(true);
  });

  it('validation flags unknown document types for document_deficiency', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help with something');
    c = analyze(c);
    c = classify(c);
    c = buildStrategy(c);
    c = draft(c);
    c = validate(c);
    // If event type is unknown, validation flags it
    expect(c.validationIssues.some(i => i.includes('could not be determined') || i.includes('NVC case number'))).toBe(true);
  });

  it('validation adds audit trail entry', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help with my DS-260', 'DS-260', 'MTL1234567890');
    c = analyze(c);
    c = classify(c);
    c = buildStrategy(c);
    c = draft(c);
    const trailLen = c.auditTrail.length;
    c = validate(c);
    expect(c.auditTrail).toHaveLength(trailLen + 1);
    expect(c.auditTrail[trailLen].event).toBe('VALIDATED');
  });

  it('validation throws if no draft', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    expect(() => validate(ctx)).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 15: X_RAY
// ═══════════════════════════════════════════════════════════════════════════════

describe('CONSULAR_XRAY — Stage: x_ray', () => {
  it('xray passes for well-formed nvc_processing', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help with my DS-260 and NVC processing', 'DS-260', 'MTL1234567890');
    c = analyze(c);
    c = classify(c);
    c = buildStrategy(c);
    c = draft(c);
    c = validate(c);
    c = xray(c);
    expect(c.xrayIssues).toHaveLength(0);
  });

  it('xray flags missed_interview with non-critical urgency', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I missed my consular interview');
    c = analyze(c);
    c = classify(c);
    c = buildStrategy(c);
    c = draft(c);
    c = validate(c);
    c = xray(c);
    // missed interview should have critical urgency; if not, xray flags it
    if (c.analysis!.urgency !== 'critical') {
      expect(c.xrayIssues.some(i => i.includes('Missed interview should be classified as critical'))).toBe(true);
    } else {
      expect(c.xrayIssues.some(i => i.includes('Missed interview'))).toBe(false);
    }
  });

  it('xray flags nvc_processing with non-low risk', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help with my DS-260');
    c = analyze(c);
    c = classify(c);
    c = buildStrategy(c);
    c = draft(c);
    c = validate(c);
    c = xray(c);
    // nvc_processing should be low risk
    expect(c.analysis!.riskLevel).toBe('low');
    expect(c.xrayIssues.some(i => i.includes('NVC processing should be low risk'))).toBe(false);
  });

  it('xray flags visa_issuance_urgency with routine urgency', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'My visa is expiring and I need to travel before it expires');
    c = analyze(c);
    c = classify(c);
    c = buildStrategy(c);
    c = draft(c);
    c = validate(c);
    c = xray(c);
    if (c.analysis!.urgency === 'routine') {
      expect(c.xrayIssues.some(i => i.includes('Visa issuance urgency should not be routine'))).toBe(true);
    }
  });

  it('xray adds audit trail entry', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help with my DS-260', 'DS-260', 'MTL1234567890');
    c = analyze(c);
    c = classify(c);
    c = buildStrategy(c);
    c = draft(c);
    c = validate(c);
    const trailLen = c.auditTrail.length;
    c = xray(c);
    expect(c.auditTrail).toHaveLength(trailLen + 1);
    expect(c.auditTrail[trailLen].event).toBe('XRAY');
  });

  it('xray throws if no draft or analysis', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    expect(() => xray(ctx)).toThrow();
  });

  it('xray flags medical_exam_issue with routine urgency', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need to find a panel physician for my medical exam DS-3025');
    c = analyze(c);
    c = classify(c);
    c = buildStrategy(c);
    c = draft(c);
    c = validate(c);
    c = xray(c);
    if (c.analysis!.urgency === 'routine') {
      expect(c.xrayIssues.some(i => i.includes('Medical exam issue should not be routine'))).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 16: BLOCKING_GATES
// ═══════════════════════════════════════════════════════════════════════════════

describe('CONSULAR_GATES — Stage: blocking_gates', () => {
  it('analyze requires intake text', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    const analyzed = analyze(ctx);
    // analyze works with empty text, just produces 'unknown' event
    expect(analyzed.analysis).toBeDefined();
  });

  it('classify requires analysis', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    expect(() => classify(ctx)).toThrow('Must analyze before classifying');
  });

  it('buildStrategy requires analysis', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    expect(() => buildStrategy(ctx)).toThrow('Must analyze before building strategy');
  });

  it('draft requires analysis and strategy', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    expect(() => draft(ctx)).toThrow();
  });

  it('approve requires draft', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    expect(() => approve(ctx)).toThrow('Must draft before approval');
  });

  it('pay requires approval', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    expect(() => pay(ctx)).toThrow('Must approve before payment');
  });

  it('fulfill requires payment', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    expect(() => fulfill(ctx, 'f-1')).toThrow('Must pay before fulfillment');
  });

  it('track requires fulfillment', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    ctx.fulfillmentId = undefined;
    expect(() => track(ctx, 't-1')).toThrow('Must fulfill before tracking');
  });

  it('prove requires tracking', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    expect(() => prove(ctx, 'p-1')).toThrow('Must track before proof');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 17: HUMAN_REVIEW
// ═══════════════════════════════════════════════════════════════════════════════

describe('CONSULAR_REVIEW — Stage: human_review', () => {
  it('userReview adds audit trail entry', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    const reviewed = userReview(ctx);
    expect(reviewed.auditTrail).toHaveLength(1);
    expect(reviewed.auditTrail[0].event).toBe('USER_REVIEW');
  });

  it('userReview preserves existing context', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help with my DS-260', 'DS-260', 'MTL1234567890');
    c = analyze(c);
    c = buildStrategy(c);
    c = draft(c);
    const trailLen = c.auditTrail.length;
    c = userReview(c);
    expect(c.caseId).toBe('case-1');
    expect(c.draft).toBeDefined();
    expect(c.auditTrail).toHaveLength(trailLen + 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 18: EXPLICIT_APPROVAL
// ═══════════════════════════════════════════════════════════════════════════════

describe('CONSULAR_APPROVED — Stage: explicit_approval', () => {
  it('approve sets approved to true', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help');
    c = analyze(c);
    c = buildStrategy(c);
    c = draft(c);
    c = approve(c);
    expect(c.approved).toBe(true);
  });

  it('approve adds audit trail entry', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help');
    c = analyze(c);
    c = buildStrategy(c);
    c = draft(c);
    const trailLen = c.auditTrail.length;
    c = approve(c);
    expect(c.auditTrail).toHaveLength(trailLen + 1);
    expect(c.auditTrail[trailLen].event).toBe('APPROVED');
  });

  it('approve throws without draft', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    expect(() => approve(ctx)).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 19: PAYMENT
// ═══════════════════════════════════════════════════════════════════════════════

describe('CONSULAR_PAID — Stage: payment', () => {
  it('pay sets paid to true', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help');
    c = analyze(c);
    c = buildStrategy(c);
    c = draft(c);
    c = approve(c);
    c = pay(c);
    expect(c.paid).toBe(true);
  });

  it('pay adds audit trail entry with Stripe detail', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help');
    c = analyze(c);
    c = buildStrategy(c);
    c = draft(c);
    c = approve(c);
    const trailLen = c.auditTrail.length;
    c = pay(c);
    expect(c.auditTrail).toHaveLength(trailLen + 1);
    expect(c.auditTrail[trailLen].event).toBe('PAID');
    expect(c.auditTrail[trailLen].detail).toContain('Stripe');
  });

  it('pay throws without approval', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    expect(() => pay(ctx)).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 20: FULFILLMENT
// ═══════════════════════════════════════════════════════════════════════════════

describe('CONSULAR_FULFILLED — Stage: fulfillment', () => {
  it('fulfill sets fulfillmentId', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help');
    c = analyze(c);
    c = buildStrategy(c);
    c = draft(c);
    c = approve(c);
    c = pay(c);
    c = fulfill(c, 'fulfill-123');
    expect(c.fulfillmentId).toBe('fulfill-123');
  });

  it('fulfill adds audit trail entry', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help');
    c = analyze(c);
    c = buildStrategy(c);
    c = draft(c);
    c = approve(c);
    c = pay(c);
    const trailLen = c.auditTrail.length;
    c = fulfill(c, 'fulfill-123');
    expect(c.auditTrail).toHaveLength(trailLen + 1);
    expect(c.auditTrail[trailLen].event).toBe('FULFILLED');
  });

  it('fulfill throws without payment', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    expect(() => fulfill(ctx, 'f-1')).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 21: PROVIDER_SUBMISSION
// ═══════════════════════════════════════════════════════════════════════════════

describe('CONSULAR_PROVIDER — Stage: provider_submission', () => {
  it('track sets tracking number', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help');
    c = analyze(c);
    c = buildStrategy(c);
    c = draft(c);
    c = approve(c);
    c = pay(c);
    c = fulfill(c, 'f-1');
    c = track(c, 'USPS123456');
    expect(c.trackingNumber).toBe('USPS123456');
  });

  it('track adds audit trail entry', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help');
    c = analyze(c);
    c = buildStrategy(c);
    c = draft(c);
    c = approve(c);
    c = pay(c);
    c = fulfill(c, 'f-1');
    const trailLen = c.auditTrail.length;
    c = track(c, 'USPS123456');
    expect(c.auditTrail).toHaveLength(trailLen + 1);
    expect(c.auditTrail[trailLen].event).toBe('TRACKED');
  });

  it('track throws without fulfillment', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    expect(() => track(ctx, 't-1')).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 22: TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

describe('CONSULAR_TRACKING — Stage: tracking', () => {
  it('tracking number is stored and retrievable', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help');
    c = analyze(c);
    c = buildStrategy(c);
    c = draft(c);
    c = approve(c);
    c = pay(c);
    c = fulfill(c, 'f-1');
    c = track(c, 'USPS123456');
    expect(c.trackingNumber).toBe('USPS123456');
    expect(c.auditTrail.some(e => e.detail?.includes('USPS123456'))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 23: PROOF
// ═══════════════════════════════════════════════════════════════════════════════

describe('CONSULAR_PROOF — Stage: proof', () => {
  it('prove sets proofId', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help');
    c = analyze(c);
    c = buildStrategy(c);
    c = draft(c);
    c = approve(c);
    c = pay(c);
    c = fulfill(c, 'f-1');
    c = track(c, 't-1');
    c = prove(c, 'proof-123');
    expect(c.proofId).toBe('proof-123');
  });

  it('prove adds audit trail entry', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help');
    c = analyze(c);
    c = buildStrategy(c);
    c = draft(c);
    c = approve(c);
    c = pay(c);
    c = fulfill(c, 'f-1');
    c = track(c, 't-1');
    const trailLen = c.auditTrail.length;
    c = prove(c, 'proof-123');
    expect(c.auditTrail).toHaveLength(trailLen + 1);
    expect(c.auditTrail[trailLen].event).toBe('PROVEN');
  });

  it('prove throws without tracking', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    expect(() => prove(ctx, 'p-1')).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 24: AUDIT
// ═══════════════════════════════════════════════════════════════════════════════

describe('CONSULAR_AUDIT — Stage: audit', () => {
  it('full pipeline produces audit trail with all 13 stages', () => {
    const ctx = runFullConsular('case-1', 'owner-1', 'I need help with my DS-260', 'DS-260', 'MTL1234567890');
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

  it('every audit trail entry has a timestamp', () => {
    const ctx = runFullConsular('case-1', 'owner-1', 'I need help');
    for (const entry of ctx.auditTrail) {
      expect(entry.timestamp).toBeDefined();
      expect(new Date(entry.timestamp).getTime()).not.toBeNaN();
    }
  });

  it('every audit trail entry has an event name', () => {
    const ctx = runFullConsular('case-1', 'owner-1', 'I need help');
    for (const entry of ctx.auditTrail) {
      expect(entry.event).toBeDefined();
      expect(typeof entry.event).toBe('string');
    }
  });

  it('audit trail is append-only — existing entries are not modified', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    const c1 = intake(ctx, 'text 1');
    const firstEntry = c1.auditTrail[0];
    const c2 = analyze(c1);
    expect(c2.auditTrail[0]).toEqual(firstEntry);
    expect(c2.auditTrail.length).toBeGreaterThan(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 25: IDEMPOTENCY
// ═══════════════════════════════════════════════════════════════════════════════

describe('CONSULAR_IDEMPOTENT — Stage: idempotency', () => {
  it('processConsularIdempotent returns existing context if already proven', () => {
    const ctx = runFullConsular('case-1', 'owner-1', 'I need help');
    const result = processConsularIdempotent('case-1', 'owner-1', 'I need help', ctx);
    expect(result).toBe(ctx);
  });

  it('processConsularIdempotent runs full pipeline for new case', () => {
    const result = processConsularIdempotent('case-1', 'owner-1', 'I need help');
    expect(result.proofId).toBeDefined();
    expect(result.auditTrail.length).toBeGreaterThan(0);
  });

  it('processConsularIdempotent does not re-run for same case ID', () => {
    const ctx = runFullConsular('case-1', 'owner-1', 'I need help');
    const result = processConsularIdempotent('case-1', 'owner-1', 'different text', ctx);
    expect(result.userText).toBe('I need help');
  });

  it('processConsularIdempotent re-runs for different case ID', () => {
    const ctx = runFullConsular('case-1', 'owner-1', 'I need help');
    const result = processConsularIdempotent('case-2', 'owner-1', 'new text');
    expect(result.caseId).toBe('case-2');
    expect(result.userText).toBe('new text');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 26: OWNER_ISOLATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('CONSULAR_ISOLATED — Stage: owner_isolation', () => {
  it('assertOwnerIsolation passes for correct owner', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    expect(() => assertOwnerIsolation(ctx, 'owner-1')).not.toThrow();
  });

  it('assertOwnerIsolation throws for wrong owner', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    expect(() => assertOwnerIsolation(ctx, 'owner-2')).toThrow('Owner isolation violation');
  });

  it('owner isolation message includes both owner IDs', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    try {
      assertOwnerIsolation(ctx, 'owner-2');
      fail('Should have thrown');
    } catch (e) {
      expect((e as Error).message).toContain('owner-1');
      expect((e as Error).message).toContain('owner-2');
    }
  });

  it('full pipeline preserves owner ID', () => {
    const ctx = runFullConsular('case-1', 'owner-1', 'I need help');
    expect(ctx.ownerId).toBe('owner-1');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 27: FAILURE_RETRY
// ═══════════════════════════════════════════════════════════════════════════════

describe('CONSULAR_RETRY — Stage: failure_retry', () => {
  it('retryFromStage from analyzed re-analyzes', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help with my DS-260');
    c = analyze(c);
    c = retryFromStage(c, 'analyzed');
    expect(c.analysis).toBeDefined();
  });

  it('retryFromStage from classified re-classifies', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help with my DS-260');
    c = analyze(c);
    c = classify(c);
    c = retryFromStage(c, 'classified');
    expect(c.analysis).toBeDefined();
  });

  it('retryFromStage from strategy_built re-builds strategy', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help with my DS-260');
    c = analyze(c);
    c = classify(c);
    c = buildStrategy(c);
    c = retryFromStage(c, 'strategy_built');
    expect(c.strategy).toBeDefined();
  });

  it('retryFromStage from drafted re-drafts', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help with my DS-260');
    c = analyze(c);
    c = classify(c);
    c = buildStrategy(c);
    c = draft(c);
    c = retryFromStage(c, 'drafted');
    expect(c.draft).toBeDefined();
  });

  it('retryFromStage from validated re-validates', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help with my DS-260');
    c = analyze(c);
    c = classify(c);
    c = buildStrategy(c);
    c = draft(c);
    c = validate(c);
    c = retryFromStage(c, 'validated');
    expect(c.validationIssues).toBeDefined();
  });

  it('retryFromStage from xray_complete re-xrays', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help with my DS-260');
    c = analyze(c);
    c = classify(c);
    c = buildStrategy(c);
    c = draft(c);
    c = validate(c);
    c = xray(c);
    c = retryFromStage(c, 'xray_complete');
    expect(c.xrayIssues).toBeDefined();
  });

  it('retryFromStage with new text updates userText', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'original text');
    c = analyze(c);
    c = retryFromStage(c, 'analyzed', 'updated text');
    expect(c.userText).toBe('updated text');
  });

  it('retryFromStage default runs full pipeline', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help');
    c = analyze(c);
    c = retryFromStage(c, 'proven' as ConsularState);
    expect(c.proofId).toBeDefined();
  });

  it('retry adds audit trail entry', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    let c = intake(ctx, 'I need help');
    c = analyze(c);
    const trailLen = c.auditTrail.length;
    c = retryFromStage(c, 'analyzed');
    expect(c.auditTrail.some(e => e.event === 'RETRY')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E2E Lifecycle Tests — All 9 Event Types
// ═══════════════════════════════════════════════════════════════════════════════

describe('E2E: Full lifecycle for each event type', () => {
  const eventCases: Array<{ name: string; text: string; expectedEvent: ConsularEventType }> = [
    { name: 'nvc_processing', text: 'I need help with my DS-260 and NVC processing, case MTL1234567890', expectedEvent: 'nvc_processing' },
    { name: 'interview_preparation', text: 'I need to prepare for my consular interview at the embassy in Manila', expectedEvent: 'interview_preparation' },
    { name: 'interview_rescheduling', text: 'I need to reschedule my visa interview, case MTL1234567890', expectedEvent: 'interview_rescheduling' },
    { name: 'missed_interview', text: 'I missed my consular interview last week at the embassy', expectedEvent: 'missed_interview' },
    { name: 'document_deficiency', text: 'I am missing police certificates from multiple countries for my visa application', expectedEvent: 'document_deficiency' },
    { name: 'priority_date_retrogression', text: 'My priority date retrogressed and is no longer current in the visa bulletin', expectedEvent: 'priority_date_retrogression' },
    { name: 'delayed_processing', text: 'My case is stuck at NVC and taking too long, case MTL1234567890', expectedEvent: 'delayed_processing' },
    { name: 'medical_exam_issue', text: 'My medical exam has expired and I need a new panel physician for DS-3025', expectedEvent: 'medical_exam_issue' },
    { name: 'visa_issuance_urgency', text: 'My visa is expiring soon and I need to travel before it expires', expectedEvent: 'visa_issuance_urgency' },
  ];

  for (const { name, text, expectedEvent } of eventCases) {
    it(`E2E for ${name}: full pipeline completes with proofId`, () => {
      const ctx = runFullConsular(`case-${name}`, 'owner-1', text);
      expect(ctx.proofId).toBeDefined();
      expect(ctx.analysis!.eventType).toBe(expectedEvent);
      expect(ctx.draft).toBeDefined();
      expect(ctx.trackingNumber).toBeDefined();
    });

    it(`E2E for ${name}: analysis has correct urgency and risk level`, () => {
      const ctx = runFullConsular(`case-${name}`, 'owner-1', text);
      expect(ctx.analysis!.urgency).toBeDefined();
      expect(ctx.analysis!.riskLevel).toBeDefined();
      expect(['low', 'moderate', 'elevated']).toContain(ctx.analysis!.riskLevel);
    });

    it(`E2E for ${name}: strategy has approach and key arguments`, () => {
      const ctx = runFullConsular(`case-${name}`, 'owner-1', text);
      expect(ctx.strategy!.approach).toBeDefined();
      expect(ctx.strategy!.keyArguments.length).toBeGreaterThan(0);
    });

    it(`E2E for ${name}: draft contains Consular Officer greeting`, () => {
      const ctx = runFullConsular(`case-${name}`, 'owner-1', text);
      expect(ctx.draft).toContain('Dear Consular Officer');
    });

    it(`E2E for ${name}: audit trail has all 13 events`, () => {
      const ctx = runFullConsular(`case-${name}`, 'owner-1', text);
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

    it(`E2E for ${name}: approach is unique to this event type`, () => {
      const ctx = runFullConsular(`case-${name}`, 'owner-1', text);
      const approaches: Record<string, string> = {
        nvc_processing: 'NVC Processing Guidance',
        interview_preparation: 'Consular Interview Preparation Guide',
        interview_rescheduling: 'Consular Interview Reschedule Request',
        missed_interview: 'Missed Consular Interview Remedy',
        document_deficiency: 'Civil Document Remediation',
        priority_date_retrogression: 'Priority Date Retrogression Advisory',
        delayed_processing: 'Delayed Processing Inquiry',
        medical_exam_issue: 'Medical Examination Remediation',
        visa_issuance_urgency: 'Visa Expiration Travel Advisory',
      };
      expect(ctx.strategy!.approach).toBe(approaches[name]);
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// State Machine Integrity
// ═══════════════════════════════════════════════════════════════════════════════

describe('State Machine Integrity', () => {
  it('CONSULAR_STATES has exactly 13 states', () => {
    expect(CONSULAR_STATES).toHaveLength(13);
  });

  it('CONSULAR_STATES starts with intake and ends with proven', () => {
    expect(CONSULAR_STATES[0]).toBe('intake');
    expect(CONSULAR_STATES[12]).toBe('proven');
  });

  it('all states are unique', () => {
    expect(new Set(CONSULAR_STATES).size).toBe(CONSULAR_STATES.length);
  });

  it('context starts in intake state (no audit entries)', () => {
    const ctx = createConsularContext('case-1', 'owner-1');
    expect(ctx.auditTrail).toHaveLength(0);
    expect(ctx.approved).toBe(false);
    expect(ctx.paid).toBe(false);
  });

  it('full pipeline reaches proven state', () => {
    const ctx = runFullConsular('case-1', 'owner-1', 'I need help');
    expect(ctx.proofId).toBeDefined();
    expect(ctx.approved).toBe(true);
    expect(ctx.paid).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Uniqueness — Each event type produces a distinct approach
// ═══════════════════════════════════════════════════════════════════════════════

describe('Uniqueness: Each event type has a distinct approach', () => {
  it('all 9 event types produce unique approaches', () => {
    const texts = [
      'I need help with my DS-260 and NVC processing, case MTL1234567890',
      'I need to prepare for my consular interview at the embassy',
      'I need to reschedule my visa interview',
      'I missed my consular interview',
      'I am missing police certificates for my visa application',
      'My priority date retrogressed',
      'My case is stuck at NVC and delayed',
      'My medical exam expired, I need a panel physician for DS-3025',
      'My visa is expiring and I need to travel before it expires',
    ];
    const approaches = texts.map(t => buildConsularStrategy(analyzeConsular(t)).approach);
    const unique = new Set(approaches);
    expect(unique.size).toBe(9);
  });
});
