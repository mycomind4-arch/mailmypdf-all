/**
 * Naturalization / Citizenship — Comprehensive Gold Certification Tests
 *
 * Pipeline P07 — Naturalization / Citizenship
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
  detectNaturalizationEvent,
  detectUrgency,
  detectInterviewStatus,
  detectCivicsComponents,
  extractReceiptNumber,
  extractFieldOfficeCode,
  getFieldOffice,
  calculateDaysUntilInterview,
  calculateDaysSinceInterview,
  calculateDaysUntilOath,
  canReschedule,
  getMissedInterviewConsequences,
  analyzeNaturalization,
  buildNaturalizationStrategy,
  type NaturalizationEventType,
  type NaturalizationUrgency,
  type InterviewStatus,
  type CivicsTestComponent,
  type NaturalizationAnalysis,
  type NaturalizationStrategy,
} from './naturalization-model';
import {
  NATURALIZATION_STATES,
  createNaturalizationContext,
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
  runFullNaturalization,
  processNaturalizationIdempotent,
  assertOwnerIsolation,
  retryFromStage,
  type NaturalizationContext,
  type NaturalizationState,
} from './naturalization-workflow';

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 1: INTAKE
// ═══════════════════════════════════════════════════════════════════════════════

describe('NATURALIZATION_CASE_CREATED — Stage: intake', () => {
  it('creates context with case ID and owner ID', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    expect(ctx.caseId).toBe('case-1');
    expect(ctx.ownerId).toBe('owner-1');
  });

  it('initializes with empty user text', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    expect(ctx.userText).toBe('');
  });

  it('initializes with empty audit trail', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    expect(ctx.auditTrail).toHaveLength(0);
  });

  it('intake stores user text', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    const updated = intake(ctx, 'I need to prepare for my N-400 interview');
    expect(updated.userText).toBe('I need to prepare for my N-400 interview');
  });

  it('intake stores optional form type', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    const updated = intake(ctx, 'I need help', 'N-400');
    expect(updated.formType).toBe('N-400');
  });

  it('intake stores optional receipt number', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    const updated = intake(ctx, 'I need help', 'N-400', 'LIN1234567890');
    expect(updated.receiptNumber).toBe('LIN1234567890');
  });

  it('intake stores optional interview date', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    const updated = intake(ctx, 'I need help', 'N-400', 'LIN1234567890', '2026-09-15');
    expect(updated.interviewDate).toBe('2026-09-15');
  });

  it('intake stores optional oath date', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    const updated = intake(ctx, 'I need help', 'N-400', 'LIN1234567890', undefined, '2026-10-20');
    expect(updated.oathDate).toBe('2026-10-20');
  });

  it('intake adds audit trail entry', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    const updated = intake(ctx, 'I need help');
    expect(updated.auditTrail).toHaveLength(1);
    expect(updated.auditTrail[0].event).toBe('INTAKE');
  });

  it('supports Spanish language context', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1', 'es');
    expect(ctx.language.ui).toBe('es');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 2: DOCUMENT_INGESTION
// ═══════════════════════════════════════════════════════════════════════════════

describe('NATURALIZATION_NOTICE_OPTIONAL — Stage: document_ingestion', () => {
  it('interview notice is optional — user text alone works', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'I need to prepare for my N-400 interview');
    expect(result.analysis).toBeDefined();
  });

  it('receipt number extracted from text when not provided', () => {
    const analysis = analyzeNaturalization('My receipt number is LIN1234567890 and I need help with my interview');
    expect(analysis.receiptNumber).toBe('LIN1234567890');
  });

  it('receipt number provided explicitly takes priority', () => {
    const analysis = analyzeNaturalization('I need help', 'N-400', 'ABC9876543210');
    expect(analysis.receiptNumber).toBe('ABC9876543210');
  });

  it('interview date extracted from text', () => {
    const analysis = analyzeNaturalization('My interview is on 09/15/2026');
    expect(analysis.interviewDate).toBeDefined();
  });

  it('field office code extracted from text', () => {
    const code = extractFieldOfficeCode('My interview is at USCIS LOS field office');
    expect(code).toBe('LOS');
  });

  it('field office code extracted from FO prefix', () => {
    const code = extractFieldOfficeCode('FO: NYC');
    expect(code).toBe('NYC');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 3: CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('NATURALIZATION_EVENT_CLASSIFIED — Stage: classification', () => {
  it('detects interview preparation', () => {
    expect(detectNaturalizationEvent('I need to prepare for my N-400 interview')).toBe('interview_preparation');
  });

  it('detects civics test readiness', () => {
    expect(detectNaturalizationEvent('I need to study for the civics test')).toBe('civics_test_readiness');
  });

  it('detects English test readiness', () => {
    expect(detectNaturalizationEvent('I need help with the English test for naturalization')).toBe('civics_test_readiness');
  });

  it('detects interview rescheduling', () => {
    expect(detectNaturalizationEvent('I cannot make my interview, I need to reschedule')).toBe('interview_rescheduling');
  });

  it('detects missed interview', () => {
    expect(detectNaturalizationEvent('I missed my citizenship interview')).toBe('missed_interview');
  });

  it('detects interview notice discrepancy', () => {
    expect(detectNaturalizationEvent('My interview notice has the wrong name on it')).toBe('interview_notice_discrepancy');
  });

  it('detects oath ceremony scheduling — delay', () => {
    expect(detectNaturalizationEvent('My oath ceremony is delayed, I haven\'t received a notice')).toBe('oath_ceremony_scheduling');
  });

  it('detects post-interview RFE', () => {
    expect(detectNaturalizationEvent('I received an RFE after my naturalization interview')).toBe('post_interview_rfe');
  });

  it('detects delayed decision', () => {
    expect(detectNaturalizationEvent('My N-400 has been pending forever after the interview')).toBe('delayed_decision');
  });

  it('detects oath document issue', () => {
    expect(detectNaturalizationEvent('There is a problem with my oath ceremony document')).toBe('oath_document_issue');
  });

  it('detects unknown event', () => {
    expect(detectNaturalizationEvent('hello world')).toBe('unknown');
  });

  it('detects interview preparation from N-400 mention alone', () => {
    expect(detectNaturalizationEvent('I filed my N-400')).toBe('interview_preparation');
  });

  it('detects civics from 100 questions mention', () => {
    expect(detectNaturalizationEvent('I need to study the 100 questions for naturalization')).toBe('civics_test_readiness');
  });

  it('detects missed interview from didn\'t attend', () => {
    expect(detectNaturalizationEvent('I didn\'t attend my interview')).toBe('missed_interview');
  });

  it('detects oath ceremony delay from waiting', () => {
    expect(detectNaturalizationEvent('I\'m waiting for my oath ceremony after my interview was approved')).toBe('oath_ceremony_scheduling');
  });

  it('detects oath document issue from wrong name on certificate', () => {
    expect(detectNaturalizationEvent('The name on my oath ceremony document is wrong')).toBe('oath_document_issue');
  });

  it('detects delayed decision from no decision', () => {
    expect(detectNaturalizationEvent('No decision yet on my N-400 after interview')).toBe('delayed_decision');
  });

  it('detects post-interview RFE from evidence request', () => {
    expect(detectNaturalizationEvent('They asked for more evidence after my interview')).toBe('post_interview_rfe');
  });

  it('detects interview notice discrepancy from incorrect date', () => {
    expect(detectNaturalizationEvent('The date on my interview notice is wrong')).toBe('interview_notice_discrepancy');
  });

  it('detects civics test from reading test mention', () => {
    expect(detectNaturalizationEvent('I need to practice the reading test')).toBe('civics_test_readiness');
  });

  it('detects civics test from writing test mention', () => {
    expect(detectNaturalizationEvent('I need to practice the writing test')).toBe('civics_test_readiness');
  });

  it('detects civics test from speaking test mention', () => {
    expect(detectNaturalizationEvent('I need to practice the speaking test for naturalization')).toBe('civics_test_readiness');
  });

  it('detects interview prep from what to expect', () => {
    expect(detectNaturalizationEvent('What should I expect at my naturalization interview?')).toBe('interview_preparation');
  });

  it('detects interview prep from what to bring', () => {
    expect(detectNaturalizationEvent('What should I bring to my interview?')).toBe('interview_preparation');
  });

  it('detects interview prep from nervous', () => {
    expect(detectNaturalizationEvent('I\'m nervous about my interview')).toBe('interview_preparation');
  });

  it('detects reschedule from postpone', () => {
    expect(detectNaturalizationEvent('I need to postpone my interview')).toBe('interview_rescheduling');
  });

  it('detects missed from no show', () => {
    expect(detectNaturalizationEvent('I was a no show at my interview')).toBe('missed_interview');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 4: EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

describe('NATURALIZATION_RECEIPT_INTERVIEW_DATE — Stage: extraction', () => {
  it('extracts receipt number (LIN format)', () => {
    expect(extractReceiptNumber('LIN1234567890')).toBe('LIN1234567890');
  });

  it('extracts receipt number (MSC format)', () => {
    expect(extractReceiptNumber('MSC2098765432')).toBe('MSC2098765432');
  });

  it('extracts receipt number (WAC format)', () => {
    expect(extractReceiptNumber('WAC1234567890')).toBe('WAC1234567890');
  });

  it('extracts receipt number (SRC format)', () => {
    expect(extractReceiptNumber('SRC1234567890')).toBe('SRC1234567890');
  });

  it('returns undefined for non-receipt text', () => {
    expect(extractReceiptNumber('hello world')).toBeUndefined();
  });

  it('extracts receipt number from longer text', () => {
    expect(extractReceiptNumber('My case LIN1234567890 was filed')).toBe('LIN1234567890');
  });

  it('extracts field office code from USCIS prefix', () => {
    expect(extractFieldOfficeCode('My interview at USCIS SFO')).toBe('SFO');
  });

  it('returns undefined for no field office code', () => {
    expect(extractFieldOfficeCode('hello world')).toBeUndefined();
  });

  it('gets field office details for known code', () => {
    const office = getFieldOffice('LOS');
    expect(office).toBeDefined();
    expect(office!.city).toBe('Los Angeles');
    expect(office!.state).toBe('CA');
  });

  it('gets field office details for NYC', () => {
    const office = getFieldOffice('NYC');
    expect(office).toBeDefined();
    expect(office!.city).toBe('New York');
  });

  it('returns undefined for unknown field office code', () => {
    expect(getFieldOffice('XYZ')).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 5: PROVENANCE
// ═══════════════════════════════════════════════════════════════════════════════

describe('NATURALIZATION_PROVENANCE — Stage: provenance', () => {
  it('form type defaults to N-400 when detected', () => {
    const analysis = analyzeNaturalization('I need help with my N-400 interview');
    expect(analysis.formType).toBe('N-400');
  });

  it('form type defaults to N-400 when no form specified', () => {
    const analysis = analyzeNaturalization('I need to prepare for my interview');
    expect(analysis.formType).toBe('N-400');
  });

  it('form type explicitly provided overrides detection', () => {
    const analysis = analyzeNaturalization('I need help', 'N-600');
    expect(analysis.formType).toBe('N-600');
  });

  it('receipt number uppercased', () => {
    const analysis = analyzeNaturalization('lin1234567890');
    expect(analysis.receiptNumber).toBe('LIN1234567890');
  });

  it('authority cited in analysis', () => {
    const analysis = analyzeNaturalization('I need help with my interview');
    expect(analysis.authority).toContain('INA § 316');
    expect(analysis.authority).toContain('8 CFR § 316');
    expect(analysis.authority).toContain('Policy Manual Volume 12');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 6: FACT_NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('NATURALIZATION_FACTS — Stage: fact_normalization', () => {
  it('interview date normalized to ISO format', () => {
    const analysis = analyzeNaturalization('My interview is on 09/15/2026');
    expect(analysis.interviewDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('interview date in YYYY-MM-DD format', () => {
    const analysis = analyzeNaturalization('My interview is on 2026-09-15');
    expect(analysis.interviewDate).toBe('2026-09-15');
  });

  it('interview date in Month DD, YYYY format', () => {
    const analysis = analyzeNaturalization('My interview is on September 15, 2026');
    expect(analysis.interviewDate).toBe('2026-09-15');
  });

  it('field office city resolved from code', () => {
    const analysis = analyzeNaturalization('My interview at USCIS CHI');
    expect(analysis.fieldOffice).toBe('Chicago');
  });

  it('civics components detected — civics only', () => {
    const components = detectCivicsComponents('I need to study the civics questions');
    expect(components).toContain('civics');
    expect(components).not.toContain('all');
  });

  it('civics components detected — all', () => {
    const components = detectCivicsComponents('I need full test readiness for everything');
    expect(components).toContain('all');
  });

  it('civics components default to all when none mentioned', () => {
    const components = detectCivicsComponents('I need help with my interview');
    expect(components).toEqual(['all']);
  });

  it('civics components — reading', () => {
    const components = detectCivicsComponents('I need to practice the reading test');
    expect(components).toContain('reading');
  });

  it('civics components — writing', () => {
    const components = detectCivicsComponents('I need to practice the writing test');
    expect(components).toContain('writing');
  });

  it('civics components — speaking', () => {
    const components = detectCivicsComponents('I need to practice speaking English for the interview');
    expect(components).toContain('speaking');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 7: DEADLINES
// ═══════════════════════════════════════════════════════════════════════════════

describe('NATURALIZATION_INTERVIEW_DEADLINE — Stage: deadlines', () => {
  it('calculates days until interview (future date)', () => {
    const days = calculateDaysUntilInterview('2026-12-25', '2026-08-23');
    expect(days).toBe(124);
  });

  it('calculates days until interview (past date)', () => {
    const days = calculateDaysUntilInterview('2026-01-01', '2026-08-23');
    expect(days).toBeLessThan(0);
  });

  it('calculates days since interview', () => {
    const days = calculateDaysSinceInterview('2026-01-01', '2026-08-23');
    expect(days).toBe(234);
  });

  it('calculates days until oath ceremony', () => {
    const days = calculateDaysUntilOath('2026-12-25', '2026-08-23');
    expect(days).toBe(124);
  });

  it('daysUntilInterview set in analysis when interview date provided', () => {
    const analysis = analyzeNaturalization('I need help', 'N-400', undefined, '2026-12-25', undefined, '2026-08-23');
    expect(analysis.daysUntilInterview).toBe(124);
  });

  it('daysSinceInterview set for delayed decision', () => {
    const analysis = analyzeNaturalization('My N-400 has been pending forever after the interview', 'N-400', undefined, '2026-01-01', undefined, '2026-08-23');
    expect(analysis.daysSinceInterview).toBe(234);
  });

  it('daysUntilOath set when oath date provided', () => {
    const analysis = analyzeNaturalization('My oath ceremony is on 2026-12-25', 'N-400', undefined, undefined, '2026-12-25', '2026-08-23');
    expect(analysis.daysUntilOath).toBe(124);
  });

  it('reschedule window days set to 30', () => {
    const analysis = analyzeNaturalization('I need to reschedule my interview');
    expect(analysis.rescheduleWindowDays).toBe(30);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 8: ISSUES
// ═══════════════════════════════════════════════════════════════════════════════

describe('NATURALIZATION_ISSUES — Stage: issues', () => {
  it('detects interview status for interview preparation', () => {
    expect(detectInterviewStatus('interview_preparation')).toBe('scheduled');
  });

  it('detects interview status for civics test readiness', () => {
    expect(detectInterviewStatus('civics_test_readiness')).toBe('scheduled');
  });

  it('detects interview status for rescheduling', () => {
    expect(detectInterviewStatus('interview_rescheduling')).toBe('reschedule_requested');
  });

  it('detects interview status for missed interview', () => {
    expect(detectInterviewStatus('missed_interview')).toBe('missed');
  });

  it('detects interview status for notice discrepancy', () => {
    expect(detectInterviewStatus('interview_notice_discrepancy')).toBe('scheduled');
  });

  it('detects interview status for oath ceremony scheduling', () => {
    expect(detectInterviewStatus('oath_ceremony_scheduling')).toBe('oath_scheduled');
  });

  it('detects interview status for post-interview RFE', () => {
    expect(detectInterviewStatus('post_interview_rfe')).toBe('continued');
  });

  it('detects interview status for delayed decision', () => {
    expect(detectInterviewStatus('delayed_decision')).toBe('completed');
  });

  it('detects interview status for oath document issue', () => {
    expect(detectInterviewStatus('oath_document_issue')).toBe('oath_scheduled');
  });

  it('detects interview status for unknown', () => {
    expect(detectInterviewStatus('unknown')).toBe('unknown');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 9: EVIDENCE
// ═══════════════════════════════════════════════════════════════════════════════

describe('NATURALIZATION_EVIDENCE — Stage: evidence', () => {
  it('strategy for interview prep includes document list', () => {
    const analysis = analyzeNaturalization('I need to prepare for my interview');
    const strategy = buildNaturalizationStrategy(analysis);
    expect(strategy.supportingEvidence).toContain('Permanent Resident Card (Green Card)');
    expect(strategy.supportingEvidence).toContain('Valid passport and travel documents');
    expect(strategy.supportingEvidence.some(e => e.includes('Tax returns'))).toBe(true);
  });

  it('strategy for civics test includes study materials', () => {
    const analysis = analyzeNaturalization('I need to study for the civics test');
    const strategy = buildNaturalizationStrategy(analysis);
    expect(strategy.supportingEvidence.some(e => e.includes('Civics Test Study Materials'))).toBe(true);
    expect(strategy.supportingEvidence.some(e => e.includes('reading and writing vocabulary'))).toBe(true);
  });

  it('strategy for reschedule includes appointment notice', () => {
    const analysis = analyzeNaturalization('I cannot make my interview, I need to reschedule');
    const strategy = buildNaturalizationStrategy(analysis);
    expect(strategy.supportingEvidence.some(e => e.includes('interview notice'))).toBe(true);
  });

  it('strategy for missed interview includes emergency documentation', () => {
    const analysis = analyzeNaturalization('I missed my citizenship interview');
    const strategy = buildNaturalizationStrategy(analysis);
    expect(strategy.supportingEvidence.some(e => e.includes('emergency or circumstance'))).toBe(true);
  });

  it('strategy for post-interview RFE includes RFE notice', () => {
    const analysis = analyzeNaturalization('I received an RFE after my interview');
    const strategy = buildNaturalizationStrategy(analysis);
    expect(strategy.supportingEvidence.some(e => e.includes('RFE notice'))).toBe(true);
  });

  it('strategy for delayed decision includes processing time evidence', () => {
    const analysis = analyzeNaturalization('My N-400 has been pending forever', 'N-400', undefined, '2026-01-01', undefined, '2026-08-23');
    const strategy = buildNaturalizationStrategy(analysis);
    expect(strategy.supportingEvidence.some(e => e.includes('Processing time evidence'))).toBe(true);
  });

  it('strategy for oath document issue includes N-565 form', () => {
    const analysis = analyzeNaturalization('There is a problem with my oath ceremony document');
    const strategy = buildNaturalizationStrategy(analysis);
    expect(strategy.supportingEvidence.some(e => e.includes('N-565'))).toBe(true);
  });

  it('strategy for oath ceremony scheduling includes interview completion notice', () => {
    const analysis = analyzeNaturalization('My oath ceremony is delayed');
    const strategy = buildNaturalizationStrategy(analysis);
    expect(strategy.supportingEvidence.some(e => e.includes('interview completion'))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 10: AUTHORITY
// ═══════════════════════════════════════════════════════════════════════════════

describe('NATURALIZATION_AUTHORITY — Stage: authority', () => {
  it('analysis authority cites INA § 316', () => {
    const analysis = analyzeNaturalization('I need help with my interview');
    expect(analysis.authority).toContain('INA § 316');
  });

  it('analysis authority cites 8 CFR § 316', () => {
    const analysis = analyzeNaturalization('I need help with my interview');
    expect(analysis.authority).toContain('8 CFR § 316');
  });

  it('analysis authority cites USCIS Policy Manual Volume 12', () => {
    const analysis = analyzeNaturalization('I need help with my interview');
    expect(analysis.authority).toContain('Volume 12');
  });

  it('analysis authority cites INA § 336 for judicial review', () => {
    const analysis = analyzeNaturalization('My N-400 has been pending forever after the interview');
    expect(analysis.authority).toContain('INA § 336');
  });

  it('strategy authority matches analysis authority', () => {
    const analysis = analyzeNaturalization('I need to reschedule my interview');
    const strategy = buildNaturalizationStrategy(analysis);
    expect(strategy.authority).toBe(analysis.authority);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 11: RISK
// ═══════════════════════════════════════════════════════════════════════════════

describe('NATURALIZATION_RISK — Stage: risk', () => {
  it('interview preparation is low risk', () => {
    const analysis = analyzeNaturalization('I need to prepare for my interview');
    expect(analysis.riskLevel).toBe('low');
  });

  it('civics test readiness is low risk', () => {
    const analysis = analyzeNaturalization('I need to study for the civics test');
    expect(analysis.riskLevel).toBe('low');
  });

  it('interview rescheduling is moderate risk (routine)', () => {
    const analysis = analyzeNaturalization('I need to reschedule my interview');
    expect(analysis.riskLevel).toBe('moderate');
  });

  it('missed interview is elevated risk', () => {
    const analysis = analyzeNaturalization('I missed my citizenship interview');
    expect(analysis.riskLevel).toBe('elevated');
  });

  it('interview notice discrepancy is moderate risk', () => {
    const analysis = analyzeNaturalization('My interview notice has the wrong name');
    expect(analysis.riskLevel).toBe('moderate');
  });

  it('oath ceremony scheduling is moderate risk', () => {
    const analysis = analyzeNaturalization('My oath ceremony is delayed');
    expect(analysis.riskLevel).toBe('moderate');
  });

  it('post-interview RFE is moderate risk', () => {
    const analysis = analyzeNaturalization('I received an RFE after my interview');
    expect(analysis.riskLevel).toBe('moderate');
  });

  it('delayed decision is moderate risk', () => {
    const analysis = analyzeNaturalization('My N-400 has been pending forever', 'N-400', undefined, '2026-08-01', undefined, '2026-08-23');
    expect(analysis.riskLevel).toBe('moderate');
  });

  it('oath document issue is moderate risk', () => {
    const analysis = analyzeNaturalization('There is a problem with my oath ceremony document');
    expect(analysis.riskLevel).toBe('moderate');
  });

  it('unknown event is low risk', () => {
    const analysis = analyzeNaturalization('hello world');
    expect(analysis.riskLevel).toBe('low');
  });

  it('reschedule with imminent interview is elevated risk', () => {
    const analysis = analyzeNaturalization('I need to reschedule my interview', 'N-400', 'LIN1234567890', '2026-08-24', undefined, '2026-08-23');
    expect(analysis.riskLevel).toBe('elevated');
  });

  it('missed interview urgency is critical', () => {
    const analysis = analyzeNaturalization('I missed my citizenship interview');
    expect(analysis.urgency).toBe('critical');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 12: STRATEGY
// ═══════════════════════════════════════════════════════════════════════════════

describe('NATURALIZATION_STRATEGY — Stage: strategy', () => {
  it('builds strategy for interview preparation', () => {
    const analysis = analyzeNaturalization('I need to prepare for my interview');
    const strategy = buildNaturalizationStrategy(analysis);
    expect(strategy.approach).toBe('Interview Preparation Guide');
    expect(strategy.keyArguments.length).toBeGreaterThan(0);
  });

  it('builds strategy for civics test readiness', () => {
    const analysis = analyzeNaturalization('I need to study for the civics test');
    const strategy = buildNaturalizationStrategy(analysis);
    expect(strategy.approach).toBe('Civics and English Test Preparation');
  });

  it('builds strategy for interview rescheduling', () => {
    const analysis = analyzeNaturalization('I need to reschedule my interview');
    const strategy = buildNaturalizationStrategy(analysis);
    expect(strategy.approach).toBe('Interview Reschedule Request');
  });

  it('builds strategy for missed interview', () => {
    const analysis = analyzeNaturalization('I missed my citizenship interview');
    const strategy = buildNaturalizationStrategy(analysis);
    expect(strategy.approach).toBe('Missed Interview Remedy');
  });

  it('builds strategy for interview notice discrepancy', () => {
    const analysis = analyzeNaturalization('My interview notice has the wrong name');
    const strategy = buildNaturalizationStrategy(analysis);
    expect(strategy.approach).toBe('Interview Notice Correction Request');
  });

  it('builds strategy for oath ceremony scheduling', () => {
    const analysis = analyzeNaturalization('My oath ceremony is delayed');
    const strategy = buildNaturalizationStrategy(analysis);
    expect(strategy.approach).toBe('Oath Ceremony Inquiry');
  });

  it('builds strategy for post-interview RFE', () => {
    const analysis = analyzeNaturalization('I received an RFE after my interview');
    const strategy = buildNaturalizationStrategy(analysis);
    expect(strategy.approach).toBe('Post-Interview RFE Response');
  });

  it('builds strategy for delayed decision', () => {
    const analysis = analyzeNaturalization('My N-400 has been pending forever', 'N-400', undefined, '2026-01-01', undefined, '2026-08-23');
    const strategy = buildNaturalizationStrategy(analysis);
    expect(strategy.approach).toBe('Delayed Naturalization Decision Inquiry');
  });

  it('builds strategy for oath document issue', () => {
    const analysis = analyzeNaturalization('There is a problem with my oath ceremony document');
    const strategy = buildNaturalizationStrategy(analysis);
    expect(strategy.approach).toBe('Oath Ceremony Document Correction');
  });

  it('strategy includes interview note', () => {
    const analysis = analyzeNaturalization('I need to prepare for my interview');
    const strategy = buildNaturalizationStrategy(analysis);
    expect(strategy.interviewNote).toBeDefined();
    expect(strategy.interviewNote.length).toBeGreaterThan(0);
  });

  it('strategy includes deadline note', () => {
    const analysis = analyzeNaturalization('I need help', 'N-400', undefined, '2026-12-25', undefined, '2026-08-23');
    const strategy = buildNaturalizationStrategy(analysis);
    expect(strategy.deadlineNote).toContain('124 days');
  });

  it('delayed decision strategy mentions mandamus after 120 days', () => {
    const analysis = analyzeNaturalization('My N-400 has been pending forever', 'N-400', undefined, '2026-01-01', undefined, '2026-08-23');
    const strategy = buildNaturalizationStrategy(analysis);
    expect(strategy.interviewNote).toContain('mandamus');
    expect(strategy.keyArguments.some(a => a.includes('writ of mandamus'))).toBe(true);
  });

  it('delayed decision strategy does not mention mandamus before 120 days', () => {
    const analysis = analyzeNaturalization('My N-400 has been pending forever', 'N-400', undefined, '2026-08-01', undefined, '2026-08-23');
    const strategy = buildNaturalizationStrategy(analysis);
    expect(strategy.keyArguments.some(a => a.includes('mandamus'))).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 13: DRAFTING
// ═══════════════════════════════════════════════════════════════════════════════

describe('NATURALIZATION_DRAFT — Stage: drafting', () => {
  it('drafts a letter for interview preparation', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'I need to prepare for my N-400 interview', 'N-400', 'LIN1234567890');
    expect(result.draft).toBeDefined();
    expect(result.draft).toContain('Interview Preparation Guide');
    expect(result.draft).toContain('USCIS Field Office');
    expect(result.draft).toContain('N-400');
    expect(result.draft).toContain('LIN1234567890');
    expect(result.draft).toContain('Dear USCIS Officer');
  });

  it('drafts a reschedule request letter', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'I need to reschedule my interview', 'N-400', 'LIN1234567890');
    expect(result.draft).toContain('Interview Reschedule Request');
  });

  it('drafts a missed interview remedy letter', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'I missed my citizenship interview', 'N-400', 'LIN1234567890');
    expect(result.draft).toContain('Missed Interview Remedy');
  });

  it('draft includes key arguments as bullet points', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'I need to prepare for my interview');
    expect(result.draft).toContain('- ');
  });

  it('draft includes supporting evidence list', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'I need to prepare for my interview');
    expect(result.draft).toContain('Supporting documentation');
    expect(result.draft).toContain('Green Card');
  });

  it('draft includes date', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'I need help');
    expect(result.draft).toMatch(/Date: \d{4}-\d{2}-\d{2}/);
  });

  it('draft includes signature block', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'I need help');
    expect(result.draft).toContain('Sincerely,');
    expect(result.draft).toContain('[Your Name]');
  });

  it('draft for oath ceremony inquiry includes oath ceremony', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'My oath ceremony is delayed', 'N-400', 'LIN1234567890');
    expect(result.draft).toContain('Oath Ceremony Inquiry');
  });

  it('draft for post-interview RFE includes RFE response', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'I received an RFE after my interview', 'N-400', 'LIN1234567890');
    expect(result.draft).toContain('Post-Interview RFE Response');
  });

  it('draft for delayed decision includes decision inquiry', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'My N-400 has been pending forever', 'N-400', 'LIN1234567890', '2026-01-01');
    expect(result.draft).toContain('Delayed Naturalization Decision Inquiry');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 14: VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('NATURALIZATION_VALIDATED — Stage: validation', () => {
  it('validates clean case — no issues', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'I need to prepare for my N-400 interview', 'N-400', 'LIN1234567890');
    expect(result.validationIssues).toBeDefined();
  });

  it('flags missing receipt number for reschedule', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'I need to reschedule my interview', 'N-400');
    expect(result.validationIssues.some(i => i.includes('Receipt number not provided'))).toBe(true);
  });

  it('flags missing interview date for reschedule', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'I need to reschedule my interview', 'N-400', 'LIN1234567890');
    expect(result.validationIssues.some(i => i.includes('Interview date not provided'))).toBe(true);
  });

  it('flags unknown event type', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'hello world');
    expect(result.validationIssues.some(i => i.includes('could not be determined'))).toBe(true);
  });

  it('flags post-interview RFE without receipt number', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'I received an RFE after my interview', 'N-400');
    expect(result.validationIssues.some(i => i.includes('Receipt number not provided'))).toBe(true);
  });

  it('flags delayed decision without interview date', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'My N-400 has been pending forever', 'N-400', 'LIN1234567890');
    expect(result.validationIssues.some(i => i.includes('Interview date not provided'))).toBe(true);
  });

  it('does not require receipt number for interview preparation', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'I need to prepare for my N-400 interview', 'N-400');
    expect(result.validationIssues.some(i => i.includes('Receipt number not provided'))).toBe(false);
  });

  it('does not require receipt number for civics test readiness', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'I need to study for the civics test', 'N-400');
    expect(result.validationIssues.some(i => i.includes('Receipt number not provided'))).toBe(false);
  });

  it('adds audit trail entry for validation', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'I need help', 'N-400', 'LIN1234567890');
    expect(result.auditTrail.some(e => e.event === 'VALIDATED')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 15: X_RAY (Adversarial Review)
// ═══════════════════════════════════════════════════════════════════════════════

describe('NATURALIZATION_XRAY — Stage: x_ray', () => {
  it('X-Ray passes for clean interview preparation', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'I need to prepare for my interview', 'N-400', 'LIN1234567890');
    expect(result.xrayIssues).toBeDefined();
  });

  it('X-Ray flags missed interview not critical', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    const updated = intake(ctx, 'I missed my citizenship interview', 'N-400', 'LIN1234567890');
    const analyzed = analyze(updated);
    const classified = classify(analyzed);
    const strategy = buildStrategy(classified);
    const drafted = draft(strategy);
    const validated = validate(drafted);
    // Force urgency to non-critical to trigger xray check
    const modCtx: NaturalizationContext = {
      ...validated,
      analysis: { ...validated.analysis!, urgency: 'routine' },
    };
    const xrayed = xray(modCtx);
    expect(xrayed.xrayIssues.some(i => i.includes('Missed interview should be classified as critical'))).toBe(true);
  });

  it('X-Ray flags post-interview RFE as not routine', () => {
    // RFE has a deadline, so urgency won't be routine — test the xray check independently
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    const updated = intake(ctx, 'I received an RFE after my interview', 'N-400', 'LIN1234567890');
    const analyzed = analyze(updated);
    const classified = classify(analyzed);
    const strategy = buildStrategy(classified);
    const drafted = draft(strategy);
    const validated = validate(drafted);
    // Force urgency to routine to trigger xray
    const modCtx: NaturalizationContext = {
      ...validated,
      analysis: { ...validated.analysis!, urgency: 'routine' },
    };
    const xrayed = xray(modCtx);
    expect(xrayed.xrayIssues.some(i => i.includes('Post-interview RFE should not be routine'))).toBe(true);
  });

  it('X-Ray flags oath document issue as not routine', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    const updated = intake(ctx, 'There is a problem with my oath ceremony document', 'N-400', 'LIN1234567890');
    const analyzed = analyze(updated);
    const classified = classify(analyzed);
    const strategy = buildStrategy(classified);
    const drafted = draft(strategy);
    const validated = validate(drafted);
    const modCtx: NaturalizationContext = {
      ...validated,
      analysis: { ...validated.analysis!, urgency: 'routine' },
    };
    const xrayed = xray(modCtx);
    expect(xrayed.xrayIssues.some(i => i.includes('Oath document issue should not be routine'))).toBe(true);
  });

  it('X-Ray flags interview notice discrepancy as not routine', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    const updated = intake(ctx, 'The name on my interview notice is wrong', 'N-400', 'LIN1234567890');
    const analyzed = analyze(updated);
    const classified = classify(analyzed);
    const strategy = buildStrategy(classified);
    const drafted = draft(strategy);
    const validated = validate(drafted);
    const modCtx: NaturalizationContext = {
      ...validated,
      analysis: { ...validated.analysis!, urgency: 'routine' },
    };
    const xrayed = xray(modCtx);
    expect(xrayed.xrayIssues.some(i => i.includes('Interview notice discrepancy should not be routine'))).toBe(true);
  });

  it('X-Ray adds audit trail entry', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'I need help', 'N-400', 'LIN1234567890');
    expect(result.auditTrail.some(e => e.event === 'XRAY')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 16: BLOCKING_GATES
// ═══════════════════════════════════════════════════════════════════════════════

describe('NATURALIZATION_GATES — Stage: blocking_gates', () => {
  it('cannot classify without analysis', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    expect(() => classify(ctx)).toThrow('Must analyze before classifying');
  });

  it('cannot build strategy without analysis', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    expect(() => buildStrategy(ctx)).toThrow('Must analyze before building strategy');
  });

  it('cannot draft without analysis', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    expect(() => draft(ctx)).toThrow('Must analyze and build strategy before drafting');
  });

  it('cannot validate without draft', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    expect(() => validate(ctx)).toThrow('Must draft before validating');
  });

  it('cannot X-Ray without draft', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    expect(() => xray(ctx)).toThrow('Must validate before X-Ray');
  });

  it('cannot approve without draft', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    expect(() => approve(ctx)).toThrow('Must draft before approval');
  });

  it('cannot pay without approval', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    ctx.draft = 'test draft';
    expect(() => pay(ctx)).toThrow('Must approve before payment');
  });

  it('cannot fulfill without payment', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    ctx.draft = 'test';
    ctx.approved = true;
    expect(() => fulfill(ctx, 'f-1')).toThrow('Must pay before fulfillment');
  });

  it('cannot track without fulfillment', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    ctx.paid = true;
    expect(() => track(ctx, 't-1')).toThrow('Must fulfill before tracking');
  });

  it('cannot prove without tracking', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    ctx.fulfillmentId = 'f-1';
    expect(() => prove(ctx, 'p-1')).toThrow('Must track before proof');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 17: HUMAN_REVIEW
// ═══════════════════════════════════════════════════════════════════════════════

describe('NATURALIZATION_REVIEW — Stage: human_review', () => {
  it('user review adds audit trail entry', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    const withDraft = { ...ctx, draft: 'test draft' };
    const reviewed = userReview(withDraft);
    expect(reviewed.auditTrail.some(e => e.event === 'USER_REVIEW')).toBe(true);
  });

  it('user review preserves draft', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    const withDraft = { ...ctx, draft: 'test draft' };
    const reviewed = userReview(withDraft);
    expect(reviewed.draft).toBe('test draft');
  });

  it('full workflow includes user review stage', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'I need help', 'N-400', 'LIN1234567890');
    expect(result.auditTrail.some(e => e.event === 'USER_REVIEW')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 18: EXPLICIT_APPROVAL
// ═══════════════════════════════════════════════════════════════════════════════

describe('NATURALIZATION_APPROVED — Stage: explicit_approval', () => {
  it('approve sets approved flag to true', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    const withDraft = { ...ctx, draft: 'test draft' };
    const approvedCtx = approve(withDraft);
    expect(approvedCtx.approved).toBe(true);
  });

  it('approve adds audit trail entry', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    const withDraft = { ...ctx, draft: 'test draft' };
    const approvedCtx = approve(withDraft);
    expect(approvedCtx.auditTrail.some(e => e.event === 'APPROVED')).toBe(true);
  });

  it('approve detail mentions mailing', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    const withDraft = { ...ctx, draft: 'test draft' };
    const approvedCtx = approve(withDraft);
    expect(approvedCtx.auditTrail.find(e => e.event === 'APPROVED')?.detail).toContain('mailing');
  });

  it('initial approved is false', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    expect(ctx.approved).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 19: PAYMENT
// ═══════════════════════════════════════════════════════════════════════════════

describe('NATURALIZATION_PAID — Stage: payment', () => {
  it('pay sets paid flag to true', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    const withDraft = { ...ctx, draft: 'test draft', approved: true };
    const paidCtx = pay(withDraft);
    expect(paidCtx.paid).toBe(true);
  });

  it('pay adds audit trail entry mentioning Stripe', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    const withDraft = { ...ctx, draft: 'test draft', approved: true };
    const paidCtx = pay(withDraft);
    expect(paidCtx.auditTrail.some(e => e.event === 'PAID' && e.detail?.includes('Stripe'))).toBe(true);
  });

  it('initial paid is false', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    expect(ctx.paid).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 20: FULFILLMENT
// ═══════════════════════════════════════════════════════════════════════════════

describe('NATURALIZATION_FULFILLED — Stage: fulfillment', () => {
  it('fulfill sets fulfillment ID', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    const ready = { ...ctx, draft: 'test', approved: true, paid: true };
    const fulfilled = fulfill(ready, 'fulfill-001');
    expect(fulfilled.fulfillmentId).toBe('fulfill-001');
  });

  it('fulfill adds audit trail entry', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    const ready = { ...ctx, draft: 'test', approved: true, paid: true };
    const fulfilled = fulfill(ready, 'fulfill-001');
    expect(fulfilled.auditTrail.some(e => e.event === 'FULFILLED')).toBe(true);
  });

  it('fulfill detail includes fulfillment ID', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    const ready = { ...ctx, draft: 'test', approved: true, paid: true };
    const fulfilled = fulfill(ready, 'fulfill-001');
    expect(fulfilled.auditTrail.find(e => e.event === 'FULFILLED')?.detail).toContain('fulfill-001');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 21: PROVIDER_SUBMISSION
// ═══════════════════════════════════════════════════════════════════════════════

describe('NATURALIZATION_PROVIDER — Stage: provider_submission', () => {
  it('track sets tracking number', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    const ready = { ...ctx, draft: 'test', approved: true, paid: true, fulfillmentId: 'f-1' };
    const tracked = track(ready, 'TRK123456');
    expect(tracked.trackingNumber).toBe('TRK123456');
  });

  it('track adds audit trail entry', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    const ready = { ...ctx, draft: 'test', approved: true, paid: true, fulfillmentId: 'f-1' };
    const tracked = track(ready, 'TRK123456');
    expect(tracked.auditTrail.some(e => e.event === 'TRACKED')).toBe(true);
  });

  it('track detail includes tracking number', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    const ready = { ...ctx, draft: 'test', approved: true, paid: true, fulfillmentId: 'f-1' };
    const tracked = track(ready, 'TRK123456');
    expect(tracked.auditTrail.find(e => e.event === 'TRACKED')?.detail).toContain('TRK123456');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 22: TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

describe('NATURALIZATION_TRACKING — Stage: tracking', () => {
  it('tracking number persists in context', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    const ready = { ...ctx, draft: 'test', approved: true, paid: true, fulfillmentId: 'f-1' };
    const tracked = track(ready, 'USPS123456');
    expect(tracked.trackingNumber).toBe('USPS123456');
  });

  it('tracking preserves fulfillment ID', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    const ready = { ...ctx, draft: 'test', approved: true, paid: true, fulfillmentId: 'f-1' };
    const tracked = track(ready, 'USPS123456');
    expect(tracked.fulfillmentId).toBe('f-1');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 23: PROOF
// ═══════════════════════════════════════════════════════════════════════════════

describe('NATURALIZATION_PROOF — Stage: proof', () => {
  it('prove sets proof ID', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    const ready = { ...ctx, draft: 'test', approved: true, paid: true, fulfillmentId: 'f-1', trackingNumber: 't-1' };
    const proven = prove(ready, 'proof-001');
    expect(proven.proofId).toBe('proof-001');
  });

  it('prove adds audit trail entry', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    const ready = { ...ctx, draft: 'test', approved: true, paid: true, fulfillmentId: 'f-1', trackingNumber: 't-1' };
    const proven = prove(ready, 'proof-001');
    expect(proven.auditTrail.some(e => e.event === 'PROVEN')).toBe(true);
  });

  it('prove detail includes proof ID', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    const ready = { ...ctx, draft: 'test', approved: true, paid: true, fulfillmentId: 'f-1', trackingNumber: 't-1' };
    const proven = prove(ready, 'proof-001');
    expect(proven.auditTrail.find(e => e.event === 'PROVEN')?.detail).toContain('proof-001');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 24: AUDIT
// ═══════════════════════════════════════════════════════════════════════════════

describe('NATURALIZATION_AUDIT — Stage: audit', () => {
  it('full workflow produces complete audit trail', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'I need help', 'N-400', 'LIN1234567890');
    const events = result.auditTrail.map(e => e.event);
    expect(events).toContain('INTAKE');
    expect(events).toContain('ANALYZED');
    expect(events).toContain('CLASSIFIED');
    expect(events).toContain('STRATEGY_BUILT');
    expect(events).toContain('DRAFTED');
    expect(events).toContain('VALIDATED');
    expect(events).toContain('XRAY');
    expect(events).toContain('USER_REVIEW');
  });

  it('every audit trail entry has timestamp', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'I need help', 'N-400', 'LIN1234567890');
    for (const entry of result.auditTrail) {
      expect(entry.timestamp).toBeDefined();
      expect(new Date(entry.timestamp).getTime()).not.toBeNaN();
    }
  });

  it('every audit trail entry has event name', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'I need help', 'N-400', 'LIN1234567890');
    for (const entry of result.auditTrail) {
      expect(entry.event).toBeDefined();
      expect(entry.event.length).toBeGreaterThan(0);
    }
  });

  it('audit trail preserves order', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'I need help', 'N-400', 'LIN1234567890');
    const events = result.auditTrail.map(e => e.event);
    const intakeIdx = events.indexOf('INTAKE');
    const analyzedIdx = events.indexOf('ANALYZED');
    const classifiedIdx = events.indexOf('CLASSIFIED');
    const strategyIdx = events.indexOf('STRATEGY_BUILT');
    const draftIdx = events.indexOf('DRAFTED');
    expect(intakeIdx).toBeLessThan(analyzedIdx);
    expect(analyzedIdx).toBeLessThan(classifiedIdx);
    expect(classifiedIdx).toBeLessThan(strategyIdx);
    expect(strategyIdx).toBeLessThan(draftIdx);
  });

  it('end-to-end with approve, pay, fulfill, track, prove', () => {
    let ctx = runFullNaturalization('case-1', 'owner-1', 'I need help', 'N-400', 'LIN1234567890');
    ctx = approve(ctx);
    ctx = pay(ctx);
    ctx = fulfill(ctx, 'f-1');
    ctx = track(ctx, 't-1');
    ctx = prove(ctx, 'p-1');
    const events = ctx.auditTrail.map(e => e.event);
    expect(events).toContain('APPROVED');
    expect(events).toContain('PAID');
    expect(events).toContain('FULFILLED');
    expect(events).toContain('TRACKED');
    expect(events).toContain('PROVEN');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 25: IDEMPOTENCY
// ═══════════════════════════════════════════════════════════════════════════════

describe('NATURALIZATION_IDEMPOTENT — Stage: idempotency', () => {
  it('same idempotency key returns same result', () => {
    const result1 = processNaturalizationIdempotent('key-1', 'case-1', 'owner-1', 'I need help with my interview', 'N-400');
    const result2 = processNaturalizationIdempotent('key-1', 'case-1', 'owner-1', 'I need help with my interview', 'N-400');
    expect(result1).toBe(result2);
  });

  it('different idempotency key returns different result', () => {
    const result1 = processNaturalizationIdempotent('key-2', 'case-1', 'owner-1', 'I need help', 'N-400');
    const result2 = processNaturalizationIdempotent('key-3', 'case-1', 'owner-1', 'I need help', 'N-400');
    expect(result1).not.toBe(result2);
  });

  it('idempotent result has complete analysis', () => {
    const result = processNaturalizationIdempotent('key-4', 'case-1', 'owner-1', 'I need to prepare for my interview', 'N-400');
    expect(result.analysis).toBeDefined();
    expect(result.analysis!.eventType).toBe('interview_preparation');
  });

  it('idempotent result has draft', () => {
    const result = processNaturalizationIdempotent('key-5', 'case-1', 'owner-1', 'I need help', 'N-400', 'LIN1234567890');
    expect(result.draft).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 26: OWNER_ISOLATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('NATURALIZATION_ISOLATED — Stage: owner_isolation', () => {
  it('owner access succeeds', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    expect(() => assertOwnerIsolation(ctx, 'owner-1')).not.toThrow();
  });

  it('non-owner access throws', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    expect(() => assertOwnerIsolation(ctx, 'owner-2')).toThrow('Owner isolation violation');
  });

  it('error message includes both owner and requesting user', () => {
    const ctx = createNaturalizationContext('case-1', 'owner-1');
    try {
      assertOwnerIsolation(ctx, 'owner-2');
      fail('Should have thrown');
    } catch (e) {
      expect((e as Error).message).toContain('owner-1');
      expect((e as Error).message).toContain('owner-2');
    }
  });

  it('full workflow respects owner ID', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'I need help', 'N-400');
    expect(result.ownerId).toBe('owner-1');
    expect(() => assertOwnerIsolation(result, 'owner-1')).not.toThrow();
    expect(() => assertOwnerIsolation(result, 'owner-2')).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 27: FAILURE_RETRY
// ═══════════════════════════════════════════════════════════════════════════════

describe('NATURALIZATION_RETRY — Stage: failure_retry', () => {
  it('retry from analyzed stage', () => {
    let ctx = createNaturalizationContext('case-1', 'owner-1');
    ctx = intake(ctx, 'I need help', 'N-400', 'LIN1234567890');
    ctx = analyze(ctx);
    const retried = retryFromStage(ctx, 'analyzed');
    expect(retried.analysis).toBeDefined();
  });

  it('retry from classified stage', () => {
    let ctx = createNaturalizationContext('case-1', 'owner-1');
    ctx = intake(ctx, 'I need help', 'N-400', 'LIN1234567890');
    ctx = analyze(ctx);
    ctx = classify(ctx);
    const retried = retryFromStage(ctx, 'classified');
    expect(retried.analysis).toBeDefined();
  });

  it('retry from strategy_built stage', () => {
    let ctx = createNaturalizationContext('case-1', 'owner-1');
    ctx = intake(ctx, 'I need help', 'N-400', 'LIN1234567890');
    ctx = analyze(ctx);
    ctx = classify(ctx);
    ctx = buildStrategy(ctx);
    const retried = retryFromStage(ctx, 'strategy_built');
    expect(retried.strategy).toBeDefined();
  });

  it('retry from drafted stage', () => {
    let ctx = createNaturalizationContext('case-1', 'owner-1');
    ctx = intake(ctx, 'I need help', 'N-400', 'LIN1234567890');
    ctx = analyze(ctx);
    ctx = classify(ctx);
    ctx = buildStrategy(ctx);
    ctx = draft(ctx);
    const retried = retryFromStage(ctx, 'drafted');
    expect(retried.draft).toBeDefined();
  });

  it('retry from validated stage', () => {
    let ctx = createNaturalizationContext('case-1', 'owner-1');
    ctx = intake(ctx, 'I need help', 'N-400', 'LIN1234567890');
    ctx = analyze(ctx);
    ctx = classify(ctx);
    ctx = buildStrategy(ctx);
    ctx = draft(ctx);
    ctx = validate(ctx);
    const retried = retryFromStage(ctx, 'validated');
    expect(retried.validationIssues).toBeDefined();
  });

  it('retry from xray_complete stage', () => {
    let ctx = createNaturalizationContext('case-1', 'owner-1');
    ctx = intake(ctx, 'I need help', 'N-400', 'LIN1234567890');
    ctx = analyze(ctx);
    ctx = classify(ctx);
    ctx = buildStrategy(ctx);
    ctx = draft(ctx);
    ctx = validate(ctx);
    ctx = xray(ctx);
    const retried = retryFromStage(ctx, 'xray_complete');
    expect(retried.xrayIssues).toBeDefined();
  });

  it('retry with new text', () => {
    let ctx = createNaturalizationContext('case-1', 'owner-1');
    ctx = intake(ctx, 'I need help', 'N-400', 'LIN1234567890');
    ctx = analyze(ctx);
    const retried = retryFromStage(ctx, 'analyzed', 'I need to reschedule my interview');
    expect(retried.userText).toContain('reschedule');
    expect(retried.analysis?.eventType).toBe('interview_rescheduling');
  });

  it('retry from default re-runs full workflow', () => {
    let ctx = createNaturalizationContext('case-1', 'owner-1');
    ctx = intake(ctx, 'I need help', 'N-400', 'LIN1234567890');
    ctx = analyze(ctx);
    const retried = retryFromStage(ctx, 'intake');
    expect(retried.analysis).toBeDefined();
    expect(retried.draft).toBeDefined();
  });

  it('retry adds audit trail entry', () => {
    let ctx = createNaturalizationContext('case-1', 'owner-1');
    ctx = intake(ctx, 'I need help', 'N-400', 'LIN1234567890');
    ctx = analyze(ctx);
    const retried = retryFromStage(ctx, 'analyzed');
    expect(retried.auditTrail.some(e => e.event === 'RETRY')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FULL LIFECYCLE / E2E
// ═══════════════════════════════════════════════════════════════════════════════

describe('Naturalization — Full Lifecycle E2E', () => {
  it('runs full workflow for interview preparation', () => {
    const result = runFullNaturalization('case-1', 'owner-1', 'I need to prepare for my N-400 interview', 'N-400', 'LIN1234567890');
    expect(result.analysis).toBeDefined();
    expect(result.strategy).toBeDefined();
    expect(result.draft).toBeDefined();
    expect(result.validationIssues).toBeDefined();
    expect(result.xrayIssues).toBeDefined();
  });

  it('runs full workflow for civics test readiness', () => {
    const result = runFullNaturalization('case-2', 'owner-1', 'I need to study for the civics test', 'N-400');
    expect(result.analysis?.eventType).toBe('civics_test_readiness');
  });

  it('runs full workflow for reschedule', () => {
    const result = runFullNaturalization('case-3', 'owner-1', 'I cannot make my interview, I need to reschedule', 'N-400', 'LIN1234567890');
    expect(result.analysis?.eventType).toBe('interview_rescheduling');
  });

  it('runs full workflow for missed interview', () => {
    const result = runFullNaturalization('case-4', 'owner-1', 'I missed my citizenship interview', 'N-400', 'LIN1234567890');
    expect(result.analysis?.eventType).toBe('missed_interview');
  });

  it('runs full workflow for notice discrepancy', () => {
    const result = runFullNaturalization('case-5', 'owner-1', 'My interview notice has the wrong name on it', 'N-400', 'LIN1234567890');
    expect(result.analysis?.eventType).toBe('interview_notice_discrepancy');
  });

  it('runs full workflow for oath ceremony scheduling', () => {
    const result = runFullNaturalization('case-6', 'owner-1', 'My oath ceremony is delayed', 'N-400', 'LIN1234567890');
    expect(result.analysis?.eventType).toBe('oath_ceremony_scheduling');
  });

  it('runs full workflow for post-interview RFE', () => {
    const result = runFullNaturalization('case-7', 'owner-1', 'I received an RFE after my naturalization interview', 'N-400', 'LIN1234567890');
    expect(result.analysis?.eventType).toBe('post_interview_rfe');
  });

  it('runs full workflow for delayed decision', () => {
    const result = runFullNaturalization('case-8', 'owner-1', 'My N-400 has been pending forever after the interview', 'N-400', 'LIN1234567890', '2026-01-01');
    expect(result.analysis?.eventType).toBe('delayed_decision');
  });

  it('runs full workflow for oath document issue', () => {
    const result = runFullNaturalization('case-9', 'owner-1', 'There is a problem with my oath ceremony document', 'N-400', 'LIN1234567890');
    expect(result.analysis?.eventType).toBe('oath_document_issue');
  });

  it('all 9 event types produce unique approaches', () => {
    const eventTypes: NaturalizationEventType[] = [
      'interview_preparation', 'civics_test_readiness', 'interview_rescheduling',
      'missed_interview', 'interview_notice_discrepancy', 'oath_ceremony_scheduling',
      'post_interview_rfe', 'delayed_decision', 'oath_document_issue',
    ];
    const texts: Record<NaturalizationEventType, string> = {
      interview_preparation: 'I need to prepare for my interview',
      civics_test_readiness: 'I need to study for the civics test',
      interview_rescheduling: 'I need to reschedule my interview',
      missed_interview: 'I missed my citizenship interview',
      interview_notice_discrepancy: 'My interview notice has the wrong name',
      oath_ceremony_scheduling: 'My oath ceremony is delayed',
      post_interview_rfe: 'I received an RFE after my interview',
      delayed_decision: 'My N-400 has been pending forever',
      oath_document_issue: 'There is a problem with my oath ceremony document',
      unknown: 'hello world',
    };
    const approaches = new Set<string>();
    for (const et of eventTypes) {
      const analysis = analyzeNaturalization(texts[et], 'N-400', 'LIN1234567890');
      const strategy = buildNaturalizationStrategy(analysis);
      approaches.add(strategy.approach);
    }
    expect(approaches.size).toBe(9);
  });

  it('canReschedule returns true for reschedule request', () => {
    expect(canReschedule('interview_rescheduling', 10)).toBe(true);
  });

  it('canReschedule returns false for past interview', () => {
    expect(canReschedule('interview_rescheduling', -1)).toBe(false);
  });

  it('canReschedule returns true for missed interview', () => {
    expect(canReschedule('missed_interview')).toBe(true);
  });

  it('canReschedule returns false for unknown', () => {
    expect(canReschedule('unknown')).toBe(false);
  });

  it('missed interview consequences mentions denial', () => {
    const consequences = getMissedInterviewConsequences();
    expect(consequences).toContain('denied');
  });

  it('NATURALIZATION_STATES has 13 states', () => {
    expect(NATURALIZATION_STATES).toHaveLength(13);
  });

  it('all states are unique', () => {
    expect(new Set(NATURALIZATION_STATES).size).toBe(NATURALIZATION_STATES.length);
  });

  it('states follow correct order', () => {
    expect(NATURALIZATION_STATES[0]).toBe('intake');
    expect(NATURALIZATION_STATES[6]).toBe('xray_complete');
    expect(NATURALIZATION_STATES[12]).toBe('proven');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// URGENCY DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Naturalization — Urgency Detection', () => {
  it('detects routine urgency', () => {
    expect(detectUrgency('I need help')).toBe('routine');
  });

  it('detects time_sensitive urgency from text', () => {
    expect(detectUrgency('urgent help needed')).toBe('time_sensitive');
  });

  it('detects critical urgency from missed keyword', () => {
    expect(detectUrgency('I missed my interview')).toBe('critical');
  });

  it('detects critical urgency from tomorrow', () => {
    expect(detectUrgency('my interview is tomorrow')).toBe('critical');
  });

  it('detects critical urgency from emergency', () => {
    expect(detectUrgency('emergency interview help')).toBe('critical');
  });

  // Use dynamic dates so tests don't break as calendar time advances
  const pastDate = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
  const weekAway = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const farFuture = new Date(Date.now() + 100 * 86400000).toISOString().split('T')[0];

  it('detects critical urgency from interview date within 3 days', () => {
    expect(detectUrgency('I need help', pastDate, undefined)).toBe('critical');
  });

  it('detects time_sensitive urgency from interview date within 14 days', () => {
    expect(detectUrgency('I need help', weekAway, undefined)).toBe('time_sensitive');
  });

  it('detects routine urgency from interview date far away', () => {
    expect(detectUrgency('I need help', farFuture, undefined)).toBe('routine');
  });

  it('detects critical urgency from oath date within 3 days', () => {
    expect(detectUrgency('I need help', undefined, pastDate)).toBe('critical');
  });

  it('detects critical urgency from denied keyword', () => {
    expect(detectUrgency('my application was denied')).toBe('critical');
  });
});
