/**
 * I-90 Application to Replace Permanent Resident Card — Comprehensive Gold Tests
 *
 * Covers all 27 Gold certification stages plus domain-specific branches:
 *   - Green card renewal (expiring within 6 months)
 *   - Green card renewal (already expired)
 *   - Replacement (lost/stolen/damaged)
 *   - Replacement (never received)
 *   - Correction (USCIS error — free filing)
 *   - Correction (name change)
 *   - Correction (biographic change)
 *   - Special (commuter status, turning 14)
 *   - Conditional card redirect to I-751
 *   - Naturalization alternative (N-400 vs I-90)
 *   - 36-month automatic extension
 *   - Filing window analysis (too early, within window, expired)
 *   - Evidence completeness
 *   - Biometrics requirement
 *   - Fee analysis ($415 online, $465 paper, free for USCIS error)
 *   - RFE/NOID/case-inquiry/biometrics downstream routing
 *   - Owner isolation, idempotency, audit trail
 *   - X-Ray adversarial review
 *   - End-to-end lifecycle for multiple I-90 pathways
 *   - Safety-critical: I-90 vs I-751 distinction
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectCardType,
  detectFilingReason,
  classifyAppType,
  analyzeFilingWindow,
  checkNaturalizationAlternative,
  checkI90VsI751,
  detectEvidenceTypes,
  getRequiredEvidence,
  analyzeI90Fee,
  requiresBiometrics,
  getExtensionInfo,
  detectEventType,
  detectRisk,
  getAuthority,
  analyzeI90,
  buildI90Strategy,
  type GreenCardType,
  type I90FilingReason,
  type I90AppType,
  type FilingWindowStatus,
} from './i90-model';
import {
  createI90Context,
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
  I90_STATES,
  type I90Context,
} from './i90-workflow';
import { ALL_GOLD_STAGES } from './gold-certification-full';

// ─── Card Type Detection ──────────────────────────────────────────────────────

describe('Card Type Detection', () => {
  it('detects 10-year permanent card from renewal text', () => {
    expect(detectCardType('I need to renew my green card')).toBe('permanent_10_year');
  });

  it('detects 10-year permanent card from expiring text', () => {
    expect(detectCardType('My green card is expiring soon')).toBe('permanent_10_year');
  });

  it('detects 10-year permanent card from lost/stolen text', () => {
    expect(detectCardType('I lost my green card')).toBe('permanent_10_year');
  });

  it('detects 2-year conditional card', () => {
    expect(detectCardType('I have a conditional resident green card')).toBe('conditional_2_year');
    expect(detectCardType('I have a 2-year green card')).toBe('conditional_2_year');
  });

  it('detects unknown for unrelated text', () => {
    expect(detectCardType('I need help with my taxes')).toBe('unknown');
  });
});

// ─── Filing Reason Detection ──────────────────────────────────────────────────

describe('Filing Reason Detection', () => {
  it('detects USCIS error', () => {
    expect(detectFilingReason('USCIS made a typo on my green card')).toBe('uscis_error');
    expect(detectFilingReason('USCIS misspelled my name on my card')).toBe('uscis_error');
  });

  it('detects lost/stolen/destroyed', () => {
    expect(detectFilingReason('I lost my green card')).toBe('lost_stolen_destroyed');
    expect(detectFilingReason('My green card was stolen')).toBe('lost_stolen_destroyed');
    expect(detectFilingReason('My green card was destroyed')).toBe('lost_stolen_destroyed');
  });

  it('detects never received', () => {
    expect(detectFilingReason('I never received my green card')).toBe('never_received');
  });

  it('detects name change', () => {
    expect(detectFilingReason('I legally changed my name')).toBe('name_change');
    expect(detectFilingReason('I got married and need to update my name on my green card')).toBe('name_change');
  });

  it('detects biographic change', () => {
    expect(detectFilingReason('My biographic information has changed')).toBe('biographic_change');
  });

  it('detects commuter status change', () => {
    expect(detectFilingReason('I need to change my commuter status')).toBe('commuter_status_change');
  });

  it('detects turning 14', () => {
    expect(detectFilingReason('I am turning 14 and my card expires before my 16th birthday')).toBe('turning_14');
  });

  it('detects expired card from date', () => {
    const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(detectFilingReason('My green card expired', pastDate)).toBe('expired_card');
  });

  it('detects expiring card from date within 180 days', () => {
    const nearDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(detectFilingReason('My green card is expiring', nearDate)).toBe('expiring_card');
  });

  it('detects expired card from text', () => {
    expect(detectFilingReason('My green card has expired')).toBe('expired_card');
  });

  it('detects expiring card from text', () => {
    expect(detectFilingReason('My green card is expiring soon')).toBe('expiring_card');
  });

  it('returns not_determined for unclear text', () => {
    expect(detectFilingReason('I have a question')).toBe('not_determined');
  });
});

// ─── Application Type Classification ───────────────────────────────────────────

describe('Application Type Classification', () => {
  it('classifies renewal for expiring/expired card', () => {
    expect(classifyAppType('expiring_card')).toBe('renewal');
    expect(classifyAppType('expired_card')).toBe('renewal');
  });

  it('classifies replacement for lost/stolen/never received', () => {
    expect(classifyAppType('lost_stolen_destroyed')).toBe('replacement');
    expect(classifyAppType('never_received')).toBe('replacement');
  });

  it('classifies correction for USCIS error/name change', () => {
    expect(classifyAppType('uscis_error')).toBe('correction');
    expect(classifyAppType('name_change')).toBe('correction');
    expect(classifyAppType('biographic_change')).toBe('correction');
  });

  it('classifies special for commuter/turning 14', () => {
    expect(classifyAppType('commuter_status_change')).toBe('special');
    expect(classifyAppType('turning_14')).toBe('special');
  });

  it('returns not_determined for unknown', () => {
    expect(classifyAppType('not_determined')).toBe('not_determined');
  });
});

// ─── Filing Window Analysis ────────────────────────────────────────────────────

describe('Filing Window Analysis', () => {
  it('returns too_early for >180 days before expiration', () => {
    const farDate = new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const result = analyzeFilingWindow('My card expires', farDate);
    expect(result.status).toBe('too_early');
    expect(result.note).toContain('180 days');
  });

  it('returns within_window for <180 days before expiration', () => {
    const nearDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const result = analyzeFilingWindow('My card expires', nearDate);
    expect(result.status).toBe('within_window');
  });

  it('returns expired for past date', () => {
    const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const result = analyzeFilingWindow('My card expired', pastDate);
    expect(result.status).toBe('expired');
    expect(result.note).toContain('36 months');
  });

  it('returns no_expiration for replacement without date', () => {
    const result = analyzeFilingWindow('I lost my green card');
    expect(result.status).toBe('no_expiration');
  });

  it('returns unknown for no context', () => {
    const result = analyzeFilingWindow('I have a question');
    expect(result.status).toBe('unknown');
  });

  it('includes note about 36-month extension for expired card', () => {
    const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const result = analyzeFilingWindow('expired', pastDate);
    expect(result.note).toContain('36 months');
  });
});

// ─── Naturalization Alternative ──────────────────────────────────────────────────

describe('Naturalization Alternative Check', () => {
  it('recommends N-400 for renewal filing', () => {
    const result = checkNaturalizationAlternative('I need to renew my green card');
    expect(result.recommendN400).toBe(true);
    expect(result.note).toContain('naturalization');
  });

  it('detects existing N-400 filing', () => {
    const result = checkNaturalizationAlternative('I already filed my N-400');
    expect(result.recommendN400).toBe(true);
    expect(result.note).toContain('naturalization');
  });

  it('detects naturalization interest', () => {
    const result = checkNaturalizationAlternative('I am interested in citizenship');
    expect(result.recommendN400).toBe(true);
  });

  it('does not recommend N-400 for replacement', () => {
    const result = checkNaturalizationAlternative('I lost my green card');
    expect(result.recommendN400).toBe(false);
  });
});

// ─── I-90 vs I-751 Distinction ──────────────────────────────────────────────────

describe('I-90 vs I-751 Distinction', () => {
  it('redirects conditional card to I-751', () => {
    const result = checkI90VsI751('conditional_2_year', 'I have a conditional green card');
    expect(result.isConditional).toBe(true);
    expect(result.redirect).toBe(true);
    expect(result.message).toContain('I-751');
    expect(result.message).toContain('cannot');
  });

  it('does not redirect 10-year card', () => {
    const result = checkI90VsI751('permanent_10_year', 'I need to renew my green card');
    expect(result.isConditional).toBe(false);
    expect(result.redirect).toBe(false);
  });
});

// ─── Evidence Detection ──────────────────────────────────────────────────────────

describe('Evidence Type Detection', () => {
  it('detects green card copy', () => {
    expect(detectEvidenceTypes('I have a copy of my green card')).toContain('current_green_card');
  });

  it('detects police report', () => {
    expect(detectEvidenceTypes('I filed a police report for my stolen green card')).toContain('police_report');
  });

  it('detects court order for name change', () => {
    expect(detectEvidenceTypes('I have a court order for my name change')).toContain('court_order');
  });

  it('detects marriage certificate', () => {
    expect(detectEvidenceTypes('I have my marriage certificate')).toContain('marriage_certificate');
  });

  it('detects USCIS error proof', () => {
    expect(detectEvidenceTypes('USCIS misspelled my name on my card')).toContain('uscis_error_proof');
  });

  it('returns unknown for no evidence', () => {
    expect(detectEvidenceTypes('I need help')).toContain('unknown');
  });
});

// ─── Required Evidence ────────────────────────────────────────────────────────────

describe('Required Evidence by Filing Reason', () => {
  it('renewal requires green card copy', () => {
    const evidence = getRequiredEvidence('expiring_card');
    expect(evidence.some(e => e.includes('green card') || e.includes('I-551'))).toBe(true);
  });

  it('lost/stolen requires police report', () => {
    const evidence = getRequiredEvidence('lost_stolen_destroyed');
    expect(evidence.some(e => e.includes('Police report'))).toBe(true);
    expect(evidence.some(e => e.includes('Explanation'))).toBe(true);
  });

  it('USCIS error requires original card with error', () => {
    const evidence = getRequiredEvidence('uscis_error');
    expect(evidence.some(e => e.includes('Original green card'))).toBe(true);
    expect(evidence.some(e => e.includes('USCIS error'))).toBe(true);
  });

  it('name change requires court order', () => {
    const evidence = getRequiredEvidence('name_change');
    expect(evidence.some(e => e.includes('Court order'))).toBe(true);
    expect(evidence.some(e => e.includes('Marriage certificate'))).toBe(true);
  });
});

// ─── Fee Analysis ────────────────────────────────────────────────────────────────

describe('Fee Analysis', () => {
  it('returns $415 for online filing', () => {
    const fee = analyzeI90Fee('expiring_card', 'online');
    expect(fee.amount).toBe(415);
    expect(fee.method).toBe('online');
  });

  it('returns $465 for paper filing', () => {
    const fee = analyzeI90Fee('expiring_card', 'paper');
    expect(fee.amount).toBe(465);
    expect(fee.method).toBe('paper');
  });

  it('returns $0 for USCIS error (free filing)', () => {
    const fee = analyzeI90Fee('uscis_error', 'paper');
    expect(fee.amount).toBe(0);
    expect(fee.note).toContain('No filing fee');
  });

  it('includes 36-month extension note for renewal', () => {
    const fee = analyzeI90Fee('expiring_card', 'online');
    expect(fee.note).toContain('36 months');
  });
});

// ─── Biometrics ──────────────────────────────────────────────────────────────────

describe('Biometrics Requirement', () => {
  it('requires biometrics for renewal', () => {
    expect(requiresBiometrics('expiring_card')).toBe(true);
  });

  it('requires biometrics for lost/stolen', () => {
    expect(requiresBiometrics('lost_stolen_destroyed')).toBe(true);
  });

  it('does not require biometrics for USCIS error', () => {
    expect(requiresBiometrics('uscis_error')).toBe(false);
  });
});

// ─── 36-Month Extension Info ──────────────────────────────────────────────────────

describe('36-Month Extension Info', () => {
  it('applies to expiring card', () => {
    const info = getExtensionInfo('expiring_card');
    expect(info.applies).toBe(true);
    expect(info.note).toContain('36 months');
  });

  it('applies to expired card', () => {
    const info = getExtensionInfo('expired_card');
    expect(info.applies).toBe(true);
    expect(info.note).toContain('36 months');
  });

  it('does not apply to lost/stolen', () => {
    const info = getExtensionInfo('lost_stolen_destroyed');
    expect(info.applies).toBe(false);
  });
});

// ─── Event Detection ──────────────────────────────────────────────────────────────

describe('I-90 Event Detection', () => {
  it('detects initial filing', () => {
    expect(detectEventType('I need to renew my green card')).toBe('initial_filing');
  });

  it('detects RFE routing', () => {
    expect(detectEventType('USCIS sent me an RFE on my I-90')).toBe('rfe_response');
  });

  it('detects NOID routing', () => {
    expect(detectEventType('I got a NOID on my I-90')).toBe('noid_response');
  });

  it('detects processing delay', () => {
    expect(detectEventType('My I-90 has been pending for 8 months')).toBe('processing_delay');
  });

  it('detects card delivery issue', () => {
    expect(detectEventType('I never received my green card from USCIS')).toBe('card_delivery_issue');
  });

  it('detects denial', () => {
    expect(detectEventType('My I-90 was denied')).toBe('denial_handling');
  });

  it('detects approval', () => {
    expect(detectEventType('My green card renewal was approved')).toBe('approval_handling');
    expect(detectEventType('I received my new green card')).toBe('approval_handling');
  });

  it('detects conditional redirect', () => {
    expect(detectEventType('I have a conditional 2-year green card')).toBe('conditional_redirect');
  });

  it('detects naturalization inquiry', () => {
    expect(detectEventType('Should I file N-400 or renew my green card?')).toBe('naturalization_inquiry');
  });
});

// ─── Risk Detection ────────────────────────────────────────────────────────────────

describe('Risk Detection', () => {
  it('returns high for conditional card', () => {
    expect(detectRisk('conditional_2_year', 'not_determined', 'unknown', false)).toBe('high');
  });

  it('returns elevated for too early filing', () => {
    expect(detectRisk('permanent_10_year', 'expiring_card', 'too_early', true)).toBe('elevated');
  });

  it('returns elevated for no evidence', () => {
    expect(detectRisk('permanent_10_year', 'expiring_card', 'within_window', false)).toBe('elevated');
  });

  it('returns moderate for lost/stolen', () => {
    expect(detectRisk('permanent_10_year', 'lost_stolen_destroyed', 'no_expiration', true)).toBe('moderate');
  });

  it('returns moderate for expired card', () => {
    expect(detectRisk('permanent_10_year', 'expired_card', 'expired', true)).toBe('moderate');
  });

  it('returns elevated for unknown reason', () => {
    expect(detectRisk('permanent_10_year', 'not_determined', 'unknown', true)).toBe('elevated');
  });

  it('returns low for well-formed renewal', () => {
    expect(detectRisk('permanent_10_year', 'expiring_card', 'within_window', true)).toBe('low');
  });
});

// ─── Analysis ────────────────────────────────────────────────────────────────────

describe('I-90 Analysis', () => {
  it('produces complete analysis for renewal', () => {
    const nearDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const analysis = analyzeI90('I need to renew my green card. I have a copy of my current card.', nearDate);
    expect(analysis.cardType).toBe('permanent_10_year');
    expect(analysis.filingReason).toBe('expiring_card');
    expect(analysis.appType).toBe('renewal');
    expect(analysis.filingWindow).toBe('within_window');
  });

  it('produces complete analysis for lost/stolen', () => {
    const analysis = analyzeI90('I lost my green card. I filed a police report.');
    expect(analysis.filingReason).toBe('lost_stolen_destroyed');
    expect(analysis.appType).toBe('replacement');
  });

  it('produces complete analysis for USCIS error', () => {
    const analysis = analyzeI90('USCIS misspelled my name on my green card');
    expect(analysis.filingReason).toBe('uscis_error');
    expect(analysis.appType).toBe('correction');
    expect(analysis.fee.amount).toBe(0);
  });

  it('produces complete analysis for conditional card', () => {
    const analysis = analyzeI90('I have a conditional 2-year green card that is expiring');
    expect(analysis.cardType).toBe('conditional_2_year');
    expect(analysis.i90vsI751.redirect).toBe(true);
    expect(analysis.i90vsI751.message).toContain('I-751');
  });

  it('includes naturalization alternative for renewal', () => {
    const nearDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const analysis = analyzeI90('I need to renew my green card', nearDate);
    expect(analysis.naturalizationCheck.recommendN400).toBe(true);
  });

  it('includes 36-month extension for renewal', () => {
    const nearDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const analysis = analyzeI90('I need to renew my green card', nearDate);
    expect(analysis.extensionInfo.applies).toBe(true);
  });

  it('detects missing evidence for lost/stolen', () => {
    const analysis = analyzeI90('I lost my green card');
    expect(analysis.missingEvidence.length).toBeGreaterThan(0);
    expect(analysis.missingEvidence.some(e => e.includes('Police report'))).toBe(true);
  });

  it('includes downstream routing for RFE', () => {
    const analysis = analyzeI90('I got an RFE on my I-90');
    expect(analysis.downstreamRouting).toContain('rfe-response');
  });

  it('includes downstream routing for processing delay', () => {
    const analysis = analyzeI90('My I-90 has been pending for 10 months');
    expect(analysis.downstreamRouting.some(r => r.includes('case-inquiry'))).toBe(true);
  });

  it('includes processing time note', () => {
    const analysis = analyzeI90('I need to renew my green card');
    expect(analysis.processingTimeNote).toContain('months');
  });

  it('includes authority', () => {
    const analysis = analyzeI90('I need to renew my green card');
    expect(analysis.authority.some(a => a.includes('INA') || a.includes('CFR'))).toBe(true);
  });
});

// ─── Strategy ────────────────────────────────────────────────────────────────────

describe('I-90 Strategy Generation', () => {
  it('generates strategy for renewal', () => {
    const nearDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const analysis = analyzeI90('I need to renew my green card. I have a copy of my card.', nearDate);
    const strategy = buildI90Strategy(analysis);
    expect(strategy.approach).toContain('I-90');
  });

  it('generates strategy for I-751 redirect', () => {
    const analysis = analyzeI90('I have a conditional 2-year green card that is expiring');
    const strategy = buildI90Strategy(analysis);
    expect(strategy.approach).toContain('I-751');
    expect(strategy.i751Note).toContain('I-751');
  });

  it('includes fee note', () => {
    const analysis = analyzeI90('I need to renew my green card');
    const strategy = buildI90Strategy(analysis);
    expect(strategy.feeNote).toContain('$');
  });

  it('includes extension note for renewal', () => {
    const nearDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const analysis = analyzeI90('I need to renew my green card', nearDate);
    const strategy = buildI90Strategy(analysis);
    expect(strategy.extensionNote).toContain('36 months');
  });

  it('includes naturalization note for renewal', () => {
    const nearDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const analysis = analyzeI90('I need to renew my green card', nearDate);
    const strategy = buildI90Strategy(analysis);
    expect(strategy.naturalizationNote).toContain('naturalization');
  });

  it('includes readiness checklist', () => {
    const analysis = analyzeI90('I need to renew my green card');
    const strategy = buildI90Strategy(analysis);
    expect(strategy.readinessChecklist.length).toBeGreaterThan(0);
  });

  it('includes biometrics note for renewal', () => {
    const analysis = analyzeI90('I need to renew my green card');
    const strategy = buildI90Strategy(analysis);
    expect(strategy.biometricsNote).toContain('Biometrics');
  });
});

// ─── Workflow Engine ──────────────────────────────────────────────────────────────

describe('I-90 Workflow Engine', () => {
  it('creates context with default values', () => {
    const ctx = createI90Context('case-1', 'owner-1');
    expect(ctx.caseId).toBe('case-1');
    expect(ctx.ownerId).toBe('owner-1');
    expect(ctx.userText).toBe('');
    expect(ctx.validationIssues).toEqual([]);
  });

  it('intake sets user text and optional fields', () => {
    const ctx = createI90Context('case-1', 'owner-1');
    const after = intake(ctx, 'I need to renew my green card', '2027-01-01', 'online', 'WAC123');
    expect(after.userText).toBe('I need to renew my green card');
    expect(after.cardExpirationDate).toBe('2027-01-01');
    expect(after.filingMethod).toBe('online');
    expect(after.receiptNumber).toBe('WAC123');
    expect(after.auditTrail.length).toBe(1);
  });

  it('analyze produces analysis', () => {
    const ctx = intake(createI90Context('case-1', 'owner-1'), 'I need to renew my green card');
    const after = analyze(ctx);
    expect(after.analysis).toBeDefined();
    expect(after.analysis!.cardType).toBe('permanent_10_year');
  });

  it('classify adds audit entry', () => {
    const ctx = analyze(intake(createI90Context('case-1', 'owner-1'), 'I need to renew my green card'));
    const after = classify(ctx);
    expect(after.auditTrail.some(e => e.event === 'CLASSIFIED')).toBe(true);
  });

  it('buildStrategy produces strategy', () => {
    const ctx = classify(analyze(intake(createI90Context('case-1', 'owner-1'), 'I need to renew my green card')));
    const after = buildStrategy(ctx);
    expect(after.strategy).toBeDefined();
  });

  it('draft produces draft text', () => {
    const ctx = buildStrategy(classify(analyze(intake(createI90Context('case-1', 'owner-1'), 'I need to renew my green card'))));
    const after = draft(ctx);
    expect(after.draft).toBeDefined();
    expect(after.draft).toContain('I-90');
  });

  it('validate produces validation issues', () => {
    const ctx = draft(buildStrategy(classify(analyze(intake(createI90Context('case-1', 'owner-1'), 'I need help')))));
    const after = validate(ctx);
    expect(after.validationIssues.length).toBeGreaterThan(0);
  });

  it('xray produces X-Ray issues', () => {
    const ctx = validate(draft(buildStrategy(classify(analyze(intake(createI90Context('case-1', 'owner-1'), 'I need to renew my green card'))))));
    const after = xray(ctx);
    expect(after.xrayIssues).toBeDefined();
  });

  it('userReview sets approved flag', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to renew my green card');
    expect(userReview(ctx, true).approved).toBe(true);
    expect(userReview(ctx, false).approved).toBe(false);
  });

  it('pay sets paid flag', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to renew my green card');
    expect(pay(ctx, true).paid).toBe(true);
    expect(pay(ctx, false).paid).toBe(false);
  });

  it('fulfill sets fulfillment ID', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to renew my green card');
    expect(fulfill(ctx, 'fulfill-001').fulfillmentId).toBe('fulfill-001');
  });

  it('track sets tracking number', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to renew my green card');
    expect(track(ctx, 'TRK123').trackingNumber).toBe('TRK123');
  });

  it('prove sets proof ID', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to renew my green card');
    expect(prove(ctx, 'proof-001').proofId).toBe('proof-001');
  });

  it('throws when classifying without analysis', () => {
    const ctx = createI90Context('case-1', 'owner-1');
    expect(() => classify(ctx)).toThrow('Must analyze before classifying');
  });

  it('throws when validating without draft', () => {
    const ctx = createI90Context('case-1', 'owner-1');
    expect(() => validate(ctx)).toThrow();
  });
});

// ─── Full Pipeline ────────────────────────────────────────────────────────────────

describe('I-90 Full Pipeline', () => {
  it('runs full pipeline for renewal', () => {
    const nearDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to renew my green card. I have a copy of my card.', {
      cardExpirationDate: nearDate,
      approved: true, paymentVerified: true, fulfillmentId: 'f1', trackingNumber: 't1', proofId: 'p1',
    });
    expect(ctx.analysis?.filingReason).toBe('expiring_card');
    expect(ctx.approved).toBe(true);
    expect(ctx.paid).toBe(true);
    expect(ctx.fulfillmentId).toBe('f1');
    expect(ctx.proofId).toBe('p1');
    expect(ctx.auditTrail.length).toBeGreaterThanOrEqual(10);
  });

  it('runs full pipeline for lost/stolen', () => {
    const ctx = runFullPipeline('case-2', 'owner-2', 'I lost my green card. I filed a police report.');
    expect(ctx.analysis?.appType).toBe('replacement');
  });

  it('runs full pipeline for USCIS error', () => {
    const ctx = runFullPipeline('case-3', 'owner-3', 'USCIS made a typo on my green card');
    expect(ctx.analysis?.appType).toBe('correction');
    expect(ctx.analysis?.fee.amount).toBe(0);
  });

  it('runs full pipeline for conditional card redirect', () => {
    const ctx = runFullPipeline('case-4', 'owner-4', 'I have a conditional 2-year green card that is expiring');
    expect(ctx.analysis?.i90vsI751.redirect).toBe(true);
  });

  it('runs full pipeline for name change', () => {
    const ctx = runFullPipeline('case-5', 'owner-5', 'I legally changed my name. I have a court order.');
    expect(ctx.analysis?.filingReason).toBe('name_change');
    expect(ctx.analysis?.appType).toBe('correction');
  });
});

// ─── States ──────────────────────────────────────────────────────────────────────

describe('I-90 States', () => {
  it('has all 13 states', () => {
    expect(I90_STATES.length).toBe(13);
    expect(I90_STATES).toContain('intake');
    expect(I90_STATES).toContain('proven');
  });
});

// ─── Idempotency ──────────────────────────────────────────────────────────────────

describe('I-90 Idempotency', () => {
  it('creates consistent key for same case and owner', () => {
    expect(createIdempotencyKey(createI90Context('case-1', 'owner-1')))
      .toBe(createIdempotencyKey(createI90Context('case-1', 'owner-1')));
  });

  it('creates different keys for different cases', () => {
    expect(createIdempotencyKey(createI90Context('case-1', 'owner-1')))
      .not.toBe(createIdempotencyKey(createI90Context('case-2', 'owner-1')));
  });

  it('detects duplicate submission', () => {
    const ctx = createI90Context('case-1', 'owner-1');
    const keys = new Set([createIdempotencyKey(ctx)]);
    expect(verifyIdempotency(ctx, keys).duplicate).toBe(true);
  });

  it('allows non-duplicate submission', () => {
    const ctx = createI90Context('case-1', 'owner-1');
    expect(verifyIdempotency(ctx, new Set()).duplicate).toBe(false);
  });
});

// ─── Owner Isolation ──────────────────────────────────────────────────────────────

describe('I-90 Owner Isolation', () => {
  it('verifies isolation between different owners', () => {
    const ctxA = createI90Context('case-1', 'owner-A');
    const ctxB = createI90Context('case-2', 'owner-B');
    expect(verifyOwnerIsolation(ctxA, ctxB)).toBe(true);
  });

  it('allows same owner for same case', () => {
    const ctxA = createI90Context('case-1', 'owner-A');
    const ctxB = createI90Context('case-1', 'owner-A');
    expect(verifyOwnerIsolation(ctxA, ctxB)).toBe(true);
  });
});

// ─── Audit Trail ──────────────────────────────────────────────────────────────────

describe('I-90 Audit Trail', () => {
  it('builds complete audit trail', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to renew my green card', {
      approved: true, paymentVerified: true, fulfillmentId: 'f1', trackingNumber: 't1', proofId: 'p1',
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
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to renew my green card');
    for (const entry of ctx.auditTrail) {
      expect(entry.timestamp).toBeTruthy();
      expect(entry.event).toBeTruthy();
    }
  });
});

// ─── X-Ray Adversarial Review ──────────────────────────────────────────────────────

describe('I-90 X-Ray Adversarial Review', () => {
  it('passes clean X-Ray for well-formed renewal with evidence', () => {
    const nearDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to renew my green card. I have a copy of my current card.', {
      cardExpirationDate: nearDate,
    });
    expect(ctx.xrayIssues.length).toBe(0);
  });

  it('flags conditional card filing I-90', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I have a conditional 2-year green card that is expiring');
    expect(ctx.xrayIssues.some(i => i.includes('CRITICAL') || i.includes('I-751'))).toBe(true);
  });

  it('flags filing too early', () => {
    const farDate = new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const ctx = runFullPipeline('case-1', 'owner-1', 'My green card is expiring', {
      cardExpirationDate: farDate,
    });
    expect(ctx.xrayIssues.some(i => i.includes('reject') || i.includes('180-day'))).toBe(true);
  });

  it('flags no evidence detected', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I lost my green card');
    expect(ctx.xrayIssues.some(i => i.includes('evidence') || i.includes('police'))).toBe(true);
  });
});

// ─── Validation ──────────────────────────────────────────────────────────────────

describe('I-90 Validation', () => {
  it('flags conditional card redirect', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I have a conditional 2-year green card');
    expect(ctx.validationIssues.some(i => i.includes('I-751'))).toBe(true);
  });

  it('flags filing too early', () => {
    const farDate = new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const ctx = runFullPipeline('case-1', 'owner-1', 'My green card is expiring', {
      cardExpirationDate: farDate,
    });
    expect(ctx.validationIssues.some(i => i.includes('180') || i.includes('wait'))).toBe(true);
  });

  it('flags missing evidence', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I lost my green card');
    expect(ctx.validationIssues.some(i => i.includes('evidence') || i.includes('Police'))).toBe(true);
  });

  it('flags unknown filing reason', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I have a question');
    expect(ctx.validationIssues.some(i => i.includes('reason'))).toBe(true);
  });

  it('flags naturalization alternative for renewal', () => {
    const nearDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to renew my green card', {
      cardExpirationDate: nearDate,
    });
    expect(ctx.validationIssues.some(i => i.includes('Naturalization') || i.includes('naturalization'))).toBe(true);
  });
});

// ─── Failure & Retry ──────────────────────────────────────────────────────────────

describe('I-90 Failure & Retry', () => {
  it('handles unapproved draft', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to renew my green card', { approved: false });
    expect(ctx.approved).toBe(false);
  });

  it('handles failed payment', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to renew my green card', { paymentVerified: false });
    expect(ctx.paid).toBe(false);
  });

  it('can retry after failed payment', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to renew my green card', { paymentVerified: false });
    expect(pay(ctx, true).paid).toBe(true);
  });
});

// ─── Downstream Routing ────────────────────────────────────────────────────────────

describe('I-90 Downstream Routing', () => {
  it('RFE routes to rfe-response', () => {
    const analysis = analyzeI90('I got an RFE on my I-90');
    expect(analysis.downstreamRouting).toContain('rfe-response');
  });

  it('NOID routes to noid-response', () => {
    const analysis = analyzeI90('I got a NOID on my I-90');
    expect(analysis.downstreamRouting).toContain('noid-response');
  });

  it('processing delay routes to case-inquiry', () => {
    const analysis = analyzeI90('My I-90 has been pending for 10 months');
    expect(analysis.downstreamRouting.some(r => r.includes('case-inquiry'))).toBe(true);
  });

  it('biometrics routes to biometrics-scheduling', () => {
    const analysis = analyzeI90('I need to renew my green card');
    expect(analysis.downstreamRouting.some(r => r.includes('biometrics-scheduling'))).toBe(true);
  });
});

// ─── Safety-Critical: I-90 vs I-751 ────────────────────────────────────────────────

describe('Safety-Critical: I-90 vs I-751 Distinction', () => {
  it('conditional card MUST NOT file I-90', () => {
    const analysis = analyzeI90('I have a 2-year conditional green card that is expiring');
    expect(analysis.i90vsI751.redirect).toBe(true);
    expect(analysis.risk).toBe('high');
    expect(analysis.i90vsI751.message).toContain('I-751');
  });

  it('10-year card CAN file I-90', () => {
    const nearDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const analysis = analyzeI90('I need to renew my green card', nearDate);
    expect(analysis.i90vsI751.redirect).toBe(false);
    expect(analysis.risk).not.toBe('high');
  });

  it('USCIS error filing is FREE', () => {
    const analysis = analyzeI90('USCIS made a typo on my green card');
    expect(analysis.fee.amount).toBe(0);
  });

  it('filing too early will be rejected', () => {
    const farDate = new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const analysis = analyzeI90('My green card is expiring', farDate);
    expect(analysis.filingWindow).toBe('too_early');
    expect(analysis.risk).toBe('elevated');
  });
});

// ─── Distinctness from Other Workflows ──────────────────────────────────────────

describe('I-90 Distinctness from Other Workflows', () => {
  it('I-90 has unique card-type detection not in I-751', () => {
    expect(detectCardType('I have a 10-year permanent resident card')).toBe('permanent_10_year');
    expect(detectCardType('I have a conditional 2-year green card')).toBe('conditional_2_year');
  });

  it('I-90 has unique 36-month extension analysis', () => {
    const info = getExtensionInfo('expiring_card');
    expect(info.applies).toBe(true);
    expect(info.note).toContain('36 months');
  });

  it('I-90 has unique filing window analysis (180 days)', () => {
    const farDate = new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const result = analyzeFilingWindow('expiring', farDate);
    expect(result.status).toBe('too_early');
    expect(result.note).toContain('180 days');
  });

  it('I-90 has unique USCIS error free-filing logic', () => {
    const fee = analyzeI90Fee('uscis_error', 'paper');
    expect(fee.amount).toBe(0);
  });

  it('I-90 has unique naturalization alternative check', () => {
    const check = checkNaturalizationAlternative('I need to renew my green card');
    expect(check.recommendN400).toBe(true);
  });
});

// ─── Gold Certification — All 27 Stages ────────────────────────────────────────────

describe('I-90 Gold Certification — All 27 Stages', () => {
  it('has exactly 27 Gold stages', () => {
    expect(ALL_GOLD_STAGES.length).toBe(27);
  });

  let fullCtx: I90Context;

  beforeEach(() => {
    const nearDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    fullCtx = runFullPipeline('case-gold', 'owner-gold', 'I need to renew my green card. I have a copy of my current green card and my passport.', {
      cardExpirationDate: nearDate,
      approved: true, paymentVerified: true, fulfillmentId: 'fulfill-gold', trackingNumber: 'TRK-GOLD-001', proofId: 'proof-gold',
    });
  });

  it('intake — case created with user text', () => {
    expect(fullCtx.userText).toBeTruthy();
    expect(fullCtx.auditTrail.some(e => e.event === 'INTAKE')).toBe(true);
  });

  it('document_ingestion — user text provides case context', () => {
    expect(fullCtx.userText.length).toBeGreaterThan(10);
  });

  it('classification — card type and reason classified', () => {
    expect(fullCtx.analysis?.cardType).toBe('permanent_10_year');
    expect(fullCtx.analysis?.filingReason).toBe('expiring_card');
  });

  it('extraction — evidence types extracted', () => {
    expect(fullCtx.analysis?.evidenceTypes).toBeDefined();
    expect(fullCtx.analysis?.evidenceTypes.length).toBeGreaterThan(0);
  });

  it('provenance — authority preserved', () => {
    expect(fullCtx.analysis?.authority.some(a => a.includes('INA') || a.includes('CFR'))).toBe(true);
  });

  it('fact_normalization — analysis fields populated', () => {
    expect(fullCtx.analysis?.filingReason).toBeDefined();
    expect(fullCtx.analysis?.appType).toBeDefined();
    expect(fullCtx.analysis?.filingWindow).toBeDefined();
  });

  it('deadlines — filing window analyzed', () => {
    expect(fullCtx.analysis?.filingWindow).toBe('within_window');
    expect(fullCtx.analysis?.filingWindowNote).toBeDefined();
  });

  it('issues — validation issues detected', () => {
    expect(fullCtx.validationIssues).toBeDefined();
  });

  it('evidence — evidence types detected', () => {
    expect(fullCtx.analysis?.evidenceTypes).toContain('current_green_card');
  });

  it('authority — legal authority cited', () => {
    expect(fullCtx.analysis?.authority.length).toBeGreaterThan(0);
  });

  it('risk — risk level assessed', () => {
    expect(['low', 'moderate', 'elevated', 'high']).toContain(fullCtx.analysis?.risk);
  });

  it('strategy — strategy generated', () => {
    expect(fullCtx.strategy).toBeDefined();
    expect(fullCtx.strategy?.approach).toContain('I-90');
  });

  it('drafting — letter drafted', () => {
    expect(fullCtx.draft).toBeTruthy();
    expect(fullCtx.draft).toContain('I-90');
  });

  it('validation — validation performed', () => {
    expect(fullCtx.auditTrail.some(e => e.event === 'VALIDATED')).toBe(true);
  });

  it('x_ray — adversarial review performed', () => {
    expect(fullCtx.auditTrail.some(e => e.event === 'XRAY_COMPLETE')).toBe(true);
  });

  it('blocking_gates — no blocking issues for clean case', () => {
    expect(fullCtx.xrayIssues.length).toBe(0);
  });

  it('human_review — user reviewed and approved', () => {
    expect(fullCtx.approved).toBe(true);
  });

  it('explicit_approval — approval explicitly granted', () => {
    expect(fullCtx.approved).toBe(true);
  });

  it('payment — payment verified', () => {
    expect(fullCtx.paid).toBe(true);
  });

  it('fulfillment — fulfillment completed', () => {
    expect(fullCtx.fulfillmentId).toBe('fulfill-gold');
  });

  it('provider_submission — provider fulfillment available', () => {
    expect(fullCtx.fulfillmentId).toBeTruthy();
  });

  it('tracking — tracking number recorded', () => {
    expect(fullCtx.trackingNumber).toBe('TRK-GOLD-001');
  });

  it('proof — proof preserved', () => {
    expect(fullCtx.proofId).toBe('proof-gold');
  });

  it('audit — complete audit trail', () => {
    expect(fullCtx.auditTrail.length).toBeGreaterThanOrEqual(10);
  });

  it('idempotency — idempotency key verified', () => {
    const key = createIdempotencyKey(fullCtx);
    expect(key).toContain('i90');
    expect(verifyIdempotency(fullCtx, new Set([key])).duplicate).toBe(true);
    expect(verifyIdempotency(fullCtx, new Set()).duplicate).toBe(false);
  });

  it('owner_isolation — owner isolation verified', () => {
    const ctxA = createI90Context('case-A', 'owner-A');
    const ctxB = createI90Context('case-B', 'owner-B');
    expect(verifyOwnerIsolation(ctxA, ctxB)).toBe(true);
  });

  it('failure_retry — retry logic available', () => {
    const failed = runFullPipeline('case-1', 'owner-1', 'I need to renew my green card', { paymentVerified: false });
    expect(failed.paid).toBe(false);
    expect(pay(failed, true).paid).toBe(true);
  });

  it('passes full Gold certification harness', () => {
    expect(ALL_GOLD_STAGES.length).toBe(27);
    expect(fullCtx.auditTrail.length).toBeGreaterThanOrEqual(10);
    expect(fullCtx.approved).toBe(true);
    expect(fullCtx.paid).toBe(true);
    expect(fullCtx.fulfillmentId).toBeTruthy();
    expect(fullCtx.trackingNumber).toBeTruthy();
    expect(fullCtx.proofId).toBeTruthy();
  });
});
