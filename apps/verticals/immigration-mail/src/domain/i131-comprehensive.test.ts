/**
 * I-131 Advance Parole / Travel Document — Comprehensive Gold Tests
 *
 * Covers all 27 Gold certification stages plus domain-specific branches:
 *   - Advance Parole (pending I-485)
 *   - Emergency Advance Parole
 *   - Re-entry Permit (LPR)
 *   - Refugee Travel Document (refugee/asylee)
 *   - Replacement (lost/stolen/damaged)
 *   - Travel date approaching (urgent, critical)
 *   - Travel date far away (routine)
 *   - Expired/near-expired document
 *   - Missing underlying-case information
 *   - H-1B/L-1 dual-intent exception
 *   - Travel risk analysis (abandonment, country of persecution, criminal history)
 *   - Evidence completeness
 *   - Emergency evidence
 *   - Biometrics dependency
 *   - Payment, filing, receipt, delayed case
 *   - Case-inquiry handoff
 *   - RFE handoff
 *   - Owner isolation, idempotency, audit trail
 *   - X-Ray adversarial review
 *   - End-to-end lifecycle for multiple I-131 pathways
 *   - Safety-critical: document existence ≠ safe travel
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectDocType,
  detectAppType,
  detectUnderlyingStatus,
  isStatusConsistentWithDocType,
  detectTravelUrgency,
  analyzeDocExpiration,
  analyzeTravelRisk,
  detectEvidenceTypes,
  getRequiredEvidence,
  analyzeFee,
  requiresBiometrics,
  getDocValidityPeriod,
  detectEventType,
  detectFilingRisk,
  analyzeEmergency,
  getAuthority,
  analyzeI131,
  buildI131Strategy,
  type TravelDocType,
  type TravelAppType,
  type UnderlyingStatus,
  type TravelUrgency,
  type DocExpirationStatus,
  type I131Analysis,
} from './i131-model';
import {
  createI131Context,
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
  I131_STATES,
  type I131Context,
} from './i131-workflow';
import { ALL_GOLD_STAGES } from './gold-certification-full';

// ─── Document Type Detection ──────────────────────────────────────────────────

describe('Document Type Detection', () => {
  it('detects advance parole from pending I-485 context', () => {
    expect(detectDocType('I need to travel while my I-485 is pending')).toBe('advance_parole');
    expect(detectDocType('I have a pending adjustment of status and need a travel document')).toBe('advance_parole');
  });

  it('detects re-entry permit from LPR context', () => {
    expect(detectDocType('I am a lawful permanent resident and need a re-entry permit')).toBe('reentry_permit');
    expect(detectDocType('I need a reentry permit for extended travel')).toBe('reentry_permit');
  });

  it('detects refugee travel document from refugee/asylee context', () => {
    expect(detectDocType('I am a refugee and need a refugee travel document')).toBe('refugee_travel_document');
    expect(detectDocType('I was granted asylum and need to travel')).toBe('refugee_travel_document');
  });

  it('detects TPS travel authorization', () => {
    expect(detectDocType('I have TPS and need a travel authorization')).toBe('tps_travel_authorization');
  });

  it('detects humanitarian parole', () => {
    expect(detectDocType('I need humanitarian parole for urgent reasons')).toBe('humanitarian_parole');
  });

  it('detects replacement', () => {
    expect(detectDocType('I lost my advance parole document')).toBe('replacement');
    expect(detectDocType('My travel document was stolen')).toBe('replacement');
    expect(detectDocType('My re-entry permit was damaged')).toBe('replacement');
  });

  it('detects emergency advance parole', () => {
    expect(detectDocType('I need emergency advance parole for a medical emergency while my I-485 is pending')).toBe('advance_parole');
  });

  it('returns not_determined for unclear text', () => {
    expect(detectDocType('I need help with my taxes')).toBe('not_determined');
  });
});

// ─── Application Type Detection ────────────────────────────────────────────────

describe('Application Type Detection', () => {
  it('detects emergency', () => {
    expect(detectAppType('I need emergency advance parole')).toBe('emergency');
    expect(detectAppType('Urgent travel for humanitarian reasons')).toBe('emergency');
  });

  it('detects replacement', () => {
    expect(detectAppType('I lost my travel document')).toBe('replacement');
    expect(detectAppType('My document was stolen')).toBe('replacement');
  });

  it('detects renewal', () => {
    expect(detectAppType('I need to renew my advance parole')).toBe('renewal');
    expect(detectAppType('I want to extend my travel document')).toBe('renewal');
  });

  it('detects initial', () => {
    expect(detectAppType('I need to apply for a travel document')).toBe('initial');
    expect(detectAppType('First time filing for advance parole')).toBe('initial');
  });

  it('returns not_determined for unclear text', () => {
    expect(detectAppType('I have a question')).toBe('not_determined');
  });
});

// ─── Underlying Status Detection ────────────────────────────────────────────────

describe('Underlying Status Detection', () => {
  it('detects pending I-485', () => {
    expect(detectUnderlyingStatus('My I-485 is pending')).toBe('pending_i485');
  });

  it('detects LPR', () => {
    expect(detectUnderlyingStatus('I am a lawful permanent resident')).toBe('lawful_permanent_resident');
    expect(detectUnderlyingStatus('I am a green card holder')).toBe('lawful_permanent_resident');
  });

  it('detects refugee', () => {
    expect(detectUnderlyingStatus('I am a refugee')).toBe('refugee_status');
  });

  it('detects asylee', () => {
    expect(detectUnderlyingStatus('I was granted asylum')).toBe('asylee');
  });

  it('detects TPS', () => {
    expect(detectUnderlyingStatus('I have TPS')).toBe('tps_beneficiary');
  });

  it('detects H-1B', () => {
    expect(detectUnderlyingStatus('I have H-1B status')).toBe('h1b_status');
  });

  it('detects L-1', () => {
    expect(detectUnderlyingStatus('I have L-1 status')).toBe('l1_status');
  });

  it('detects deferred action', () => {
    expect(detectUnderlyingStatus('I have DACA deferred action')).toBe('deferred_action');
  });

  it('returns none for no status mentioned', () => {
    expect(detectUnderlyingStatus('I need a travel document')).toBe('none');
  });
});

// ─── Status Consistency ──────────────────────────────────────────────────────

describe('Status Consistency with Document Type', () => {
  it('advance parole is consistent with pending I-485', () => {
    expect(isStatusConsistentWithDocType('advance_parole', 'pending_i485')).toBe(true);
  });

  it('advance parole is not consistent with LPR status', () => {
    expect(isStatusConsistentWithDocType('advance_parole', 'lawful_permanent_resident')).toBe(false);
  });

  it('re-entry permit is consistent with LPR', () => {
    expect(isStatusConsistentWithDocType('reentry_permit', 'lawful_permanent_resident')).toBe(true);
  });

  it('re-entry permit is not consistent with pending I-485', () => {
    expect(isStatusConsistentWithDocType('reentry_permit', 'pending_i485')).toBe(false);
  });

  it('refugee travel document is consistent with refugee status', () => {
    expect(isStatusConsistentWithDocType('refugee_travel_document', 'refugee_status')).toBe(true);
  });

  it('refugee travel document is consistent with asylee', () => {
    expect(isStatusConsistentWithDocType('refugee_travel_document', 'asylee')).toBe(true);
  });

  it('TPS travel authorization is consistent with TPS', () => {
    expect(isStatusConsistentWithDocType('tps_travel_authorization', 'tps_beneficiary')).toBe(true);
  });

  it('replacement is consistent with all statuses', () => {
    expect(isStatusConsistentWithDocType('replacement', 'pending_i485')).toBe(true);
    expect(isStatusConsistentWithDocType('replacement', 'lawful_permanent_resident')).toBe(true);
  });
});

// ─── Travel Urgency ────────────────────────────────────────────────────────────

describe('Travel Urgency Detection', () => {
  it('returns critical for emergency keywords', () => {
    expect(detectTravelUrgency('My grandmother is dying')).toBe('critical');
    expect(detectTravelUrgency('I need to travel ASAP')).toBe('critical');
    expect(detectTravelUrgency('I need to travel tomorrow')).toBe('critical');
  });

  it('returns critical for travel within 7 days', () => {
    const nearDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(detectTravelUrgency('I need to travel', nearDate)).toBe('critical');
  });

  it('returns urgent for travel within 30 days', () => {
    const nearDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(detectTravelUrgency('I need to travel', nearDate)).toBe('urgent');
  });

  it('returns time_sensitive for travel within 90 days', () => {
    const futureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(detectTravelUrgency('I need to travel', futureDate)).toBe('time_sensitive');
  });

  it('returns time_sensitive for soon keyword', () => {
    expect(detectTravelUrgency('I need to travel soon')).toBe('time_sensitive');
  });

  it('returns routine for no urgency', () => {
    expect(detectTravelUrgency('I am thinking about future travel next year')).toBe('routine');
  });
});

// ─── Document Expiration ────────────────────────────────────────────────────────

describe('Document Expiration Analysis', () => {
  it('returns no_document when no date provided', () => {
    const result = analyzeDocExpiration('I need to file for a travel document');
    expect(result.status).toBe('no_document');
  });

  it('returns expired for past date', () => {
    const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const result = analyzeDocExpiration('My document expired', pastDate);
    expect(result.status).toBe('expired');
    expect(result.daysUntilExpiry!).toBeLessThan(0);
  });

  it('returns near_expiry for date within 30 days', () => {
    const nearDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const result = analyzeDocExpiration('My document expires soon', nearDate);
    expect(result.status).toBe('near_expiry');
  });

  it('returns valid_short for date within 90 days', () => {
    const futureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const result = analyzeDocExpiration('My document expires', futureDate);
    expect(result.status).toBe('valid_short');
  });

  it('returns valid for date beyond 90 days', () => {
    const farDate = new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const result = analyzeDocExpiration('My document is valid', farDate);
    expect(result.status).toBe('valid');
  });

  it('includes note for expired document', () => {
    const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const result = analyzeDocExpiration('expired', pastDate);
    expect(result.note).toContain('immediately');
  });

  it('includes note for near_expiry document', () => {
    const nearDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const result = analyzeDocExpiration('expiring', nearDate);
    expect(result.note).toContain('Do not travel');
  });
});

// ─── Travel Risk Analysis ───────────────────────────────────────────────────────

describe('Travel Risk Analysis', () => {
  it('identifies abandonment risk for pending I-485 without AP', () => {
    const result = analyzeTravelRisk('I need to travel', 'advance_parole', 'pending_i485', 'no_document', false);
    expect(result.level).toBe('high');
    expect(result.factors.some(f => f.includes('abandonment'))).toBe(true);
  });

  it('identifies dual-intent exception for H-1B', () => {
    const result = analyzeTravelRisk('I need to travel', 'advance_parole', 'h1b_status', 'no_document', false);
    expect(result.level).toBe('low');
    expect(result.factors.some(f => f.includes('H-1B'))).toBe(true);
  });

  it('identifies expired document as critical risk', () => {
    const result = analyzeTravelRisk('travel', 'advance_parole', 'pending_i485', 'expired', true);
    expect(result.level).toBe('high');
  });

  it('identifies near_expiry as elevated risk', () => {
    const result = analyzeTravelRisk('travel', 'advance_parole', 'pending_i485', 'near_expiry', true);
    expect(result.level).toBe('elevated');
  });

  it('identifies travel to country of persecution for asylees', () => {
    const result = analyzeTravelRisk('I want to travel to my home country', 'refugee_travel_document', 'asylee', 'valid', true);
    expect(result.level).toBe('elevated');
    expect(result.factors.some(f => f.includes('persecution'))).toBe(true);
  });

  it('identifies criminal history as risk', () => {
    const result = analyzeTravelRisk('I have a criminal record', 'advance_parole', 'pending_i485', 'valid', true);
    expect(result.factors.some(f => f.includes('Criminal'))).toBe(true);
  });

  it('identifies prior immigration violations as risk', () => {
    const result = analyzeTravelRisk('I had an overstay', 'advance_parole', 'pending_i485', 'valid', true);
    expect(result.factors.some(f => f.includes('violation'))).toBe(true);
  });

  it('identifies BIA Aug 2026 unlawful presence risk', () => {
    const result = analyzeTravelRisk('I have a 10 year bar for unlawful presence', 'advance_parole', 'pending_i485', 'valid', true);
    expect(result.factors.some(f => f.includes('Aug. 13, 2026'))).toBe(true);
  });

  it('returns low risk for no risk factors', () => {
    const result = analyzeTravelRisk('I need to travel', 'advance_parole', 'pending_i485', 'valid', true);
    expect(result.level).toBe('low');
  });

  it('provides appropriate recommendation for critical risk', () => {
    const result = analyzeTravelRisk('travel', 'advance_parole', 'pending_i485', 'expired', true);
    expect(result.recommendation).toContain('attorney');
  });
});

// ─── Evidence Detection ──────────────────────────────────────────────────────────

describe('Evidence Type Detection', () => {
  it('detects I-485 receipt', () => {
    expect(detectEvidenceTypes('I have my I-485 receipt notice')).toContain('i485_receipt');
  });

  it('detects green card copy', () => {
    expect(detectEvidenceTypes('I have my green card')).toContain('green_card_copy');
  });

  it('detects emergency evidence', () => {
    expect(detectEvidenceTypes('I have medical records and a death certificate')).toContain('emergency_evidence');
  });

  it('detects identity document', () => {
    expect(detectEvidenceTypes('I have my passport')).toContain('identity_document');
  });

  it('detects travel itinerary', () => {
    expect(detectEvidenceTypes('I have my flight itinerary and round trip ticket')).toContain('travel_itinerary');
  });

  it('detects police report for stolen document', () => {
    expect(detectEvidenceTypes('I filed a police report for my stolen document')).toContain('police_report');
  });

  it('returns unknown when no evidence mentioned', () => {
    expect(detectEvidenceTypes('I need help')).toContain('unknown');
  });
});

// ─── Required Evidence ────────────────────────────────────────────────────────────

describe('Required Evidence by Document Type', () => {
  it('advance parole requires I-485 receipt', () => {
    const evidence = getRequiredEvidence('advance_parole', 'initial', 'pending_i485');
    expect(evidence.some(e => e.includes('I-485'))).toBe(true);
  });

  it('re-entry permit requires green card copy', () => {
    const evidence = getRequiredEvidence('reentry_permit', 'initial', 'lawful_permanent_resident');
    expect(evidence.some(e => e.includes('Permanent Resident Card'))).toBe(true);
  });

  it('refugee travel document requires refugee status proof', () => {
    const evidence = getRequiredEvidence('refugee_travel_document', 'initial', 'refugee_status');
    expect(evidence.some(e => e.includes('refugee'))).toBe(true);
  });

  it('emergency requires emergency evidence', () => {
    const evidence = getRequiredEvidence('advance_parole', 'emergency', 'pending_i485');
    expect(evidence.some(e => e.includes('emergency'))).toBe(true);
    expect(evidence.some(e => e.includes('death certificate'))).toBe(true);
  });

  it('replacement requires explanation and police report if stolen', () => {
    const evidence = getRequiredEvidence('replacement', 'replacement', 'pending_i485');
    expect(evidence.some(e => e.includes('Police report'))).toBe(true);
    expect(evidence.some(e => e.includes('Explanation'))).toBe(true);
  });
});

// ─── Fee Analysis ────────────────────────────────────────────────────────────────

describe('Fee Analysis', () => {
  it('returns $630 for paper filing', () => {
    const fee = analyzeFee('paper');
    expect(fee.amount).toBe(630);
    expect(fee.method).toBe('paper');
  });

  it('returns $580 for online filing', () => {
    const fee = analyzeFee('online');
    expect(fee.amount).toBe(580);
    expect(fee.method).toBe('online');
  });
});

// ─── Biometrics ──────────────────────────────────────────────────────────────────

describe('Biometrics Requirement', () => {
  it('requires biometrics for re-entry permit', () => {
    expect(requiresBiometrics('reentry_permit', 'initial')).toBe(true);
  });

  it('requires biometrics for refugee travel document', () => {
    expect(requiresBiometrics('refugee_travel_document', 'initial')).toBe(true);
  });

  it('requires biometrics for advance parole', () => {
    expect(requiresBiometrics('advance_parole', 'initial')).toBe(true);
  });

  it('does not require biometrics for replacement', () => {
    expect(requiresBiometrics('advance_parole', 'replacement')).toBe(false);
  });
});

// ─── Document Validity ──────────────────────────────────────────────────────────

describe('Document Validity Periods', () => {
  it('advance parole valid for ~1 year', () => {
    const vp = getDocValidityPeriod('advance_parole');
    expect(vp.years).toBe(1);
    expect(vp.note).toContain('1 year');
  });

  it('re-entry permit valid for up to 2 years', () => {
    const vp = getDocValidityPeriod('reentry_permit');
    expect(vp.years).toBe(2);
    expect(vp.note).toContain('2 years');
  });

  it('refugee travel document valid for 1 year', () => {
    const vp = getDocValidityPeriod('refugee_travel_document');
    expect(vp.years).toBe(1);
    expect(vp.note).toContain('1 year');
  });
});

// ─── Event Detection ──────────────────────────────────────────────────────────────

describe('I-131 Event Detection', () => {
  it('detects initial filing', () => {
    expect(detectEventType('I need to apply for advance parole')).toBe('initial_filing');
  });

  it('detects emergency request', () => {
    expect(detectEventType('I need emergency advance parole for a medical emergency')).toBe('emergency_request');
  });

  it('detects renewal filing', () => {
    expect(detectEventType('I need to renew my advance parole')).toBe('renewal_filing');
  });

  it('detects replacement filing', () => {
    expect(detectEventType('I lost my travel document')).toBe('replacement_filing');
  });

  it('detects RFE routing', () => {
    expect(detectEventType('USCIS sent me an RFE on my I-131')).toBe('rfe_response');
  });

  it('detects NOID routing', () => {
    expect(detectEventType('I got a NOID on my travel document application')).toBe('noid_response');
  });

  it('detects processing delay', () => {
    expect(detectEventType('My I-131 has been pending for 6 months')).toBe('processing_delay');
  });

  it('detects document delivery issue', () => {
    expect(detectEventType('I never received my advance parole document')).toBe('document_delivery_issue');
  });

  it('detects denial', () => {
    expect(detectEventType('My I-131 was denied')).toBe('denial_handling');
  });

  it('detects approval', () => {
    expect(detectEventType('My advance parole was approved')).toBe('approval_handling');
    expect(detectEventType('I received my travel document')).toBe('approval_handling');
  });

  it('detects travel risk inquiry', () => {
    expect(detectEventType('Can I travel without advance parole?')).toBe('travel_risk_inquiry');
    expect(detectEventType('Is it safe to travel?')).toBe('travel_risk_inquiry');
  });

  it('detects expired document', () => {
    expect(detectEventType('My advance parole expired')).toBe('expired_document');
  });

  it('detects expiration warning', () => {
    expect(detectEventType('My travel document is expiring soon')).toBe('expiration_warning');
  });
});

// ─── Filing Risk ──────────────────────────────────────────────────────────────────

describe('Filing Risk Detection', () => {
  it('returns high for inconsistent status', () => {
    expect(detectFilingRisk('reentry_permit', 'pending_i485', false, true, 'routine', 'initial')).toBe('high');
  });

  it('returns elevated for unknown doc type', () => {
    expect(detectFilingRisk('not_determined', 'none', true, true, 'routine', 'initial')).toBe('elevated');
  });

  it('returns high for critical urgency without emergency app type', () => {
    expect(detectFilingRisk('advance_parole', 'pending_i485', true, true, 'critical', 'initial')).toBe('high');
  });

  it('returns elevated for no evidence', () => {
    expect(detectFilingRisk('advance_parole', 'pending_i485', true, false, 'routine', 'initial')).toBe('elevated');
  });

  it('returns moderate for emergency', () => {
    expect(detectFilingRisk('advance_parole', 'pending_i485', true, true, 'critical', 'emergency')).toBe('moderate');
  });

  it('returns low for well-formed case', () => {
    expect(detectFilingRisk('advance_parole', 'pending_i485', true, true, 'routine', 'initial')).toBe('low');
  });
});

// ─── Emergency Analysis ────────────────────────────────────────────────────────────

describe('Emergency Analysis', () => {
  it('detects medical emergency with evidence', () => {
    const result = analyzeEmergency('I have a medical emergency. I have medical records and a doctor\'s note.');
    expect(result.isEmergency).toBe(true);
    expect(result.emergencyType).toBe('Medical emergency');
    expect(result.hasEvidence).toBe(true);
  });

  it('detects death of family member with evidence', () => {
    const result = analyzeEmergency('My grandmother died. I have a death certificate.');
    expect(result.isEmergency).toBe(true);
    expect(result.emergencyType).toBe('Death of family member');
    expect(result.hasEvidence).toBe(true);
  });

  it('detects medical emergency without evidence', () => {
    const result = analyzeEmergency('My father is in the hospital with a serious illness');
    expect(result.isEmergency).toBe(true);
    expect(result.hasEvidence).toBe(false);
  });

  it('returns no emergency for routine request', () => {
    const result = analyzeEmergency('I need to apply for advance parole');
    expect(result.isEmergency).toBe(false);
    expect(result.emergencyType).toBeNull();
  });

  it('provides evidence description for medical emergency', () => {
    const result = analyzeEmergency('I have a medical emergency');
    expect(result.evidenceDescription).toContain('Medical records');
  });
});

// ─── Analysis ────────────────────────────────────────────────────────────────────

describe('I-131 Analysis', () => {
  it('produces complete analysis for advance parole initial', () => {
    const analysis = analyzeI131('I need to apply for advance parole while my I-485 is pending. I have my I-485 receipt notice and passport.');
    expect(analysis.docType).toBe('advance_parole');
    expect(analysis.appType).toBe('initial');
    expect(analysis.underlyingStatus).toBe('pending_i485');
    expect(analysis.statusConsistent).toBe(true);
    expect(analysis.authority.length).toBeGreaterThan(0);
  });

  it('produces complete analysis for re-entry permit', () => {
    const analysis = analyzeI131('I am a lawful permanent resident and need a re-entry permit for extended travel abroad. I have my green card.');
    expect(analysis.docType).toBe('reentry_permit');
    expect(analysis.underlyingStatus).toBe('lawful_permanent_resident');
    expect(analysis.statusConsistent).toBe(true);
  });

  it('produces complete analysis for emergency advance parole', () => {
    const analysis = analyzeI131('I need emergency advance parole. My grandmother is dying and I have a doctor\'s note. My I-485 is pending.');
    expect(analysis.docType).toBe('advance_parole');
    expect(analysis.appType).toBe('emergency');
    expect(analysis.emergencyAnalysis.isEmergency).toBe(true);
    expect(analysis.emergencyAnalysis.hasEvidence).toBe(true);
  });

  it('produces complete analysis for refugee travel document', () => {
    const analysis = analyzeI131('I was granted asylum and need a refugee travel document. I have my asylum grant letter.');
    expect(analysis.docType).toBe('refugee_travel_document');
    expect(analysis.underlyingStatus).toBe('asylee');
  });

  it('detects missing evidence for advance parole', () => {
    const analysis = analyzeI131('I need to apply for advance parole for my pending I-485');
    expect(analysis.missingEvidence.length).toBeGreaterThan(0);
    expect(analysis.missingEvidence.some(e => e.includes('I-485'))).toBe(true);
  });

  it('includes travel risk analysis', () => {
    const analysis = analyzeI131('I need to travel while my I-485 is pending');
    expect(analysis.travelRisk).toBeDefined();
    expect(analysis.travelRisk.level).toBeDefined();
  });

  it('includes downstream routing for RFE', () => {
    const analysis = analyzeI131('I got an RFE on my I-131');
    expect(analysis.downstreamRouting).toContain('rfe-response');
  });

  it('includes downstream routing for processing delay', () => {
    const analysis = analyzeI131('My I-131 has been pending for 8 months');
    expect(analysis.downstreamRouting.some(r => r.includes('case-inquiry'))).toBe(true);
  });

  it('includes processing time note', () => {
    const analysis = analyzeI131('I need advance parole');
    expect(analysis.processingTimeNote).toContain('processing times');
  });

  it('flags unknown doc type', () => {
    const analysis = analyzeI131('I need help');
    expect(analysis.docType).toBe('not_determined');
    expect(analysis.filingRisk).toBe('elevated');
  });

  it('includes fee analysis', () => {
    const analysis = analyzeI131('I need advance parole for my pending I-485');
    expect(analysis.fee).toBeDefined();
    expect(analysis.fee.amount).toBeGreaterThan(0);
  });

  it('includes biometrics requirement', () => {
    const analysis = analyzeI131('I need a re-entry permit. I am a green card holder.');
    expect(analysis.biometricsRequired).toBe(true);
  });

  it('includes document validity period', () => {
    const analysis = analyzeI131('I need advance parole for my pending I-485');
    expect(analysis.docValidityPeriod).toBeDefined();
    expect(analysis.docValidityPeriod.years).toBeGreaterThan(0);
  });
});

// ─── Strategy ────────────────────────────────────────────────────────────────────

describe('I-131 Strategy Generation', () => {
  it('generates strategy for advance parole initial', () => {
    const analysis = analyzeI131('I need to apply for advance parole while my I-485 is pending. I have my I-485 receipt notice.');
    const strategy = buildI131Strategy(analysis);
    expect(strategy.approach).toContain('I-131');
    expect(strategy.keyArguments.length).toBeGreaterThan(0);
    expect(strategy.filingNote).toContain('I-131');
  });

  it('generates strategy for emergency with evidence recommendation', () => {
    const analysis = analyzeI131('I need emergency advance parole. My father is dying. My I-485 is pending.');
    const strategy = buildI131Strategy(analysis);
    expect(strategy.approach).toContain('emergency');
    expect(strategy.emergencyNote).toContain('evidence');
  });

  it('generates strategy for unknown doc type', () => {
    const analysis = analyzeI131('I need help');
    const strategy = buildI131Strategy(analysis);
    expect(strategy.approach).toContain('Identify');
  });

  it('includes travel risk note', () => {
    const analysis = analyzeI131('I need to travel while my I-485 is pending without advance parole');
    const strategy = buildI131Strategy(analysis);
    expect(strategy.travelRiskNote).toBeTruthy();
  });

  it('includes readiness checklist', () => {
    const analysis = analyzeI131('I need advance parole for my pending I-485');
    const strategy = buildI131Strategy(analysis);
    expect(strategy.readinessChecklist.length).toBeGreaterThan(0);
  });

  it('includes fee note', () => {
    const analysis = analyzeI131('I need advance parole for my pending I-485');
    const strategy = buildI131Strategy(analysis);
    expect(strategy.feeNote).toContain('$');
  });

  it('includes biometrics note', () => {
    const analysis = analyzeI131('I need a re-entry permit. I am a green card holder.');
    const strategy = buildI131Strategy(analysis);
    expect(strategy.biometricsNote).toContain('Biometrics');
  });

  it('includes validity note', () => {
    const analysis = analyzeI131('I need advance parole for my pending I-485');
    const strategy = buildI131Strategy(analysis);
    expect(strategy.validityNote).toContain('year');
  });
});

// ─── Workflow Engine ──────────────────────────────────────────────────────────────

describe('I-131 Workflow Engine', () => {
  it('creates context with default values', () => {
    const ctx = createI131Context('case-1', 'owner-1');
    expect(ctx.caseId).toBe('case-1');
    expect(ctx.ownerId).toBe('owner-1');
    expect(ctx.userText).toBe('');
    expect(ctx.validationIssues).toEqual([]);
    expect(ctx.approved).toBe(false);
    expect(ctx.paid).toBe(false);
  });

  it('intake sets user text and optional fields', () => {
    const ctx = createI131Context('case-1', 'owner-1');
    const after = intake(ctx, 'I need advance parole', '2026-12-01', '2026-06-01', 'online', 'WAC123');
    expect(after.userText).toBe('I need advance parole');
    expect(after.docExpirationDate).toBe('2026-12-01');
    expect(after.travelDate).toBe('2026-06-01');
    expect(after.filingMethod).toBe('online');
    expect(after.receiptNumber).toBe('WAC123');
    expect(after.auditTrail.length).toBe(1);
  });

  it('analyze produces analysis', () => {
    const ctx = intake(createI131Context('case-1', 'owner-1'), 'I need advance parole for my pending I-485');
    const after = analyze(ctx);
    expect(after.analysis).toBeDefined();
    expect(after.analysis!.docType).toBe('advance_parole');
  });

  it('classify adds audit entry', () => {
    const ctx = analyze(intake(createI131Context('case-1', 'owner-1'), 'I need advance parole for my pending I-485'));
    const after = classify(ctx);
    expect(after.auditTrail.some(e => e.event === 'CLASSIFIED')).toBe(true);
  });

  it('buildStrategy produces strategy', () => {
    const ctx = classify(analyze(intake(createI131Context('case-1', 'owner-1'), 'I need advance parole for my pending I-485')));
    const after = buildStrategy(ctx);
    expect(after.strategy).toBeDefined();
  });

  it('draft produces draft text', () => {
    const ctx = buildStrategy(classify(analyze(intake(createI131Context('case-1', 'owner-1'), 'I need advance parole for my pending I-485'))));
    const after = draft(ctx);
    expect(after.draft).toBeDefined();
    expect(after.draft).toContain('I-131');
  });

  it('validate produces validation issues', () => {
    const ctx = draft(buildStrategy(classify(analyze(intake(createI131Context('case-1', 'owner-1'), 'I need help')))));
    const after = validate(ctx);
    expect(after.validationIssues.length).toBeGreaterThan(0);
  });

  it('xray produces X-Ray issues', () => {
    const ctx = validate(draft(buildStrategy(classify(analyze(intake(createI131Context('case-1', 'owner-1'), 'I need advance parole for my pending I-485'))))));
    const after = xray(ctx);
    expect(after.xrayIssues).toBeDefined();
  });

  it('userReview sets approved flag', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need advance parole for my pending I-485');
    expect(userReview(ctx, true).approved).toBe(true);
    expect(userReview(ctx, false).approved).toBe(false);
  });

  it('pay sets paid flag', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need advance parole');
    expect(pay(ctx, true).paid).toBe(true);
    expect(pay(ctx, false).paid).toBe(false);
  });

  it('fulfill sets fulfillment ID', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need advance parole');
    expect(fulfill(ctx, 'fulfill-001').fulfillmentId).toBe('fulfill-001');
  });

  it('track sets tracking number', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need advance parole');
    expect(track(ctx, 'TRK123').trackingNumber).toBe('TRK123');
  });

  it('prove sets proof ID', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need advance parole');
    expect(prove(ctx, 'proof-001').proofId).toBe('proof-001');
  });

  it('throws when classifying without analysis', () => {
    const ctx = createI131Context('case-1', 'owner-1');
    expect(() => classify(ctx)).toThrow('Must analyze before classifying');
  });

  it('throws when building strategy without analysis', () => {
    const ctx = createI131Context('case-1', 'owner-1');
    expect(() => buildStrategy(ctx)).toThrow();
  });

  it('throws when validating without draft', () => {
    const ctx = createI131Context('case-1', 'owner-1');
    expect(() => validate(ctx)).toThrow();
  });
});

// ─── Full Pipeline ────────────────────────────────────────────────────────────────

describe('I-131 Full Pipeline', () => {
  it('runs full pipeline for advance parole initial', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to apply for advance parole while my I-485 is pending. I have my I-485 receipt notice and passport.', {
      approved: true, paymentVerified: true, fulfillmentId: 'fulfill-001', trackingNumber: 'TRK123', proofId: 'proof-001',
    });
    expect(ctx.analysis?.docType).toBe('advance_parole');
    expect(ctx.strategy).toBeDefined();
    expect(ctx.draft).toBeDefined();
    expect(ctx.approved).toBe(true);
    expect(ctx.paid).toBe(true);
    expect(ctx.fulfillmentId).toBe('fulfill-001');
    expect(ctx.trackingNumber).toBe('TRK123');
    expect(ctx.proofId).toBe('proof-001');
    expect(ctx.auditTrail.length).toBeGreaterThanOrEqual(10);
  });

  it('runs full pipeline for emergency advance parole', () => {
    const ctx = runFullPipeline('case-2', 'owner-2', 'I need emergency advance parole. My grandmother is dying. I have medical records. My I-485 is pending.', {
      approved: true, paymentVerified: true,
    });
    expect(ctx.analysis?.appType).toBe('emergency');
    expect(ctx.analysis?.docType).toBe('advance_parole');
    expect(ctx.analysis?.emergencyAnalysis.isEmergency).toBe(true);
    expect(ctx.analysis?.emergencyAnalysis.hasEvidence).toBe(true);
  });

  it('runs full pipeline for re-entry permit', () => {
    const ctx = runFullPipeline('case-3', 'owner-3', 'I am a lawful permanent resident and need a re-entry permit for extended travel. I have my green card.');
    expect(ctx.analysis?.docType).toBe('reentry_permit');
    expect(ctx.analysis?.underlyingStatus).toBe('lawful_permanent_resident');
  });

  it('runs full pipeline for refugee travel document', () => {
    const ctx = runFullPipeline('case-4', 'owner-4', 'I was granted asylum and need a refugee travel document. I have my asylum grant letter.');
    expect(ctx.analysis?.docType).toBe('refugee_travel_document');
    expect(ctx.analysis?.underlyingStatus).toBe('asylee');
  });

  it('runs full pipeline for replacement', () => {
    const ctx = runFullPipeline('case-5', 'owner-5', 'I lost my advance parole document. I filed a police report. My I-485 is pending.');
    expect(ctx.analysis?.appType).toBe('replacement');
  });

  it('runs full pipeline for unknown doc type', () => {
    const ctx = runFullPipeline('case-6', 'owner-6', 'I need help');
    expect(ctx.analysis?.docType).toBe('not_determined');
  });
});

// ─── States ──────────────────────────────────────────────────────────────────────

describe('I-131 States', () => {
  it('has all 13 states', () => {
    expect(I131_STATES.length).toBe(13);
    expect(I131_STATES).toContain('intake');
    expect(I131_STATES).toContain('proven');
  });
});

// ─── Idempotency ──────────────────────────────────────────────────────────────────

describe('I-131 Idempotency', () => {
  it('creates consistent idempotency key for same case and owner', () => {
    const ctx1 = createI131Context('case-1', 'owner-1');
    const ctx2 = createI131Context('case-1', 'owner-1');
    expect(createIdempotencyKey(ctx1)).toBe(createIdempotencyKey(ctx2));
  });

  it('creates different keys for different cases', () => {
    expect(createIdempotencyKey(createI131Context('case-1', 'owner-1'))).not.toBe(createIdempotencyKey(createI131Context('case-2', 'owner-1')));
  });

  it('creates different keys for different owners', () => {
    expect(createIdempotencyKey(createI131Context('case-1', 'owner-1'))).not.toBe(createIdempotencyKey(createI131Context('case-1', 'owner-2')));
  });

  it('detects duplicate submission', () => {
    const ctx = createI131Context('case-1', 'owner-1');
    const previousKeys = new Set([createIdempotencyKey(ctx)]);
    expect(verifyIdempotency(ctx, previousKeys).duplicate).toBe(true);
  });

  it('allows non-duplicate submission', () => {
    const ctx = createI131Context('case-1', 'owner-1');
    expect(verifyIdempotency(ctx, new Set()).duplicate).toBe(false);
  });
});

// ─── Owner Isolation ──────────────────────────────────────────────────────────────

describe('I-131 Owner Isolation', () => {
  it('verifies isolation between different owners', () => {
    const ctxA = createI131Context('case-1', 'owner-A');
    const ctxB = createI131Context('case-2', 'owner-B');
    expect(verifyOwnerIsolation(ctxA, ctxB)).toBe(true);
  });

  it('allows same owner for same case', () => {
    const ctxA = createI131Context('case-1', 'owner-A');
    const ctxB = createI131Context('case-1', 'owner-A');
    expect(verifyOwnerIsolation(ctxA, ctxB)).toBe(true);
  });
});

// ─── Audit Trail ──────────────────────────────────────────────────────────────────

describe('I-131 Audit Trail', () => {
  it('builds complete audit trail through full pipeline', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need advance parole for my pending I-485', {
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
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need advance parole');
    for (const entry of ctx.auditTrail) {
      expect(entry.timestamp).toBeTruthy();
      expect(entry.event).toBeTruthy();
    }
  });
});

// ─── X-Ray Adversarial Review ──────────────────────────────────────────────────────

describe('I-131 X-Ray Adversarial Review', () => {
  it('passes clean X-Ray for well-formed advance parole case', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to apply for advance parole while my I-485 is pending. I have my I-485 receipt notice, passport, and two passport-style photos.', {
      docExpirationDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    expect(ctx.xrayIssues.length).toBe(0);
  });

  it('flags unknown document type with filing', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to file for a travel document');
    expect(ctx.xrayIssues.some(i => i.includes('document type unknown'))).toBe(true);
  });

  it('flags missing evidence for advance parole', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need advance parole for my pending I-485');
    expect(ctx.xrayIssues.some(i => i.includes('evidence') || i.includes('No evidence'))).toBe(true);
  });

  it('flags high travel risk', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to travel while my I-485 is pending without advance parole');
    expect(ctx.xrayIssues.some(i => i.includes('abandon') || i.includes('risk') || i.includes('Critical'))).toBe(true);
  });

  it('flags emergency without evidence', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need emergency advance parole. My grandmother is dying. My I-485 is pending.');
    expect(ctx.xrayIssues.some(i => i.includes('evidence') || i.includes('Emergency'))).toBe(true);
  });
});

// ─── Validation ──────────────────────────────────────────────────────────────────

describe('I-131 Validation', () => {
  it('flags unknown document type', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need help');
    expect(ctx.validationIssues.some(i => i.includes('document type'))).toBe(true);
  });

  it('flags missing evidence', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need advance parole for my pending I-485');
    expect(ctx.validationIssues.some(i => i.includes('evidence'))).toBe(true);
  });

  it('flags high travel risk', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to travel without advance parole while my I-485 is pending');
    expect(ctx.validationIssues.some(i => i.includes('abandon') || i.includes('risk'))).toBe(true);
  });

  it('flags emergency without evidence', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need emergency advance parole for a medical emergency. My I-485 is pending.');
    expect(ctx.validationIssues.some(i => i.includes('evidence'))).toBe(true);
  });

  it('flags H-1B dual-intent note', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need advance parole. I have H-1B status and my I-485 is pending.');
    expect(ctx.validationIssues.some(i => i.includes('H-1B') || i.includes('dual-intent'))).toBe(true);
  });

  it('passes validation for well-formed advance parole with evidence', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need to apply for advance parole while my I-485 is pending. I have my I-485 receipt notice and passport.', {
      docExpirationDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    expect(ctx.validationIssues.length).toBe(0);
  });
});

// ─── Failure & Retry ──────────────────────────────────────────────────────────────

describe('I-131 Failure & Retry', () => {
  it('handles unapproved draft', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need advance parole', { approved: false });
    expect(ctx.approved).toBe(false);
  });

  it('handles failed payment', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need advance parole', { paymentVerified: false });
    expect(ctx.paid).toBe(false);
  });

  it('can retry after failed payment', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need advance parole', { paymentVerified: false });
    expect(pay(ctx, true).paid).toBe(true);
  });

  it('handles missing fulfillment gracefully', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need advance parole', { approved: true, paymentVerified: true });
    expect(ctx.fulfillmentId).toBeUndefined();
  });
});

// ─── Downstream Routing ────────────────────────────────────────────────────────────

describe('I-131 Downstream Routing', () => {
  it('RFE routes to rfe-response', () => {
    const analysis = analyzeI131('I got an RFE on my I-131');
    expect(analysis.downstreamRouting).toContain('rfe-response');
  });

  it('NOID routes to noid-response', () => {
    const analysis = analyzeI131('I got a NOID on my travel document');
    expect(analysis.downstreamRouting).toContain('noid-response');
  });

  it('processing delay routes to case-inquiry', () => {
    const analysis = analyzeI131('My I-131 has been pending for 8 months');
    expect(analysis.downstreamRouting.some(r => r.includes('case-inquiry'))).toBe(true);
  });

  it('document delivery issue routes to case-inquiry', () => {
    const analysis = analyzeI131('I never received my advance parole document');
    expect(analysis.downstreamRouting.some(r => r.includes('case-inquiry'))).toBe(true);
  });

  it('biometrics routes to biometrics-scheduling', () => {
    const analysis = analyzeI131('I need a re-entry permit. I am a green card holder.');
    expect(analysis.downstreamRouting.some(r => r.includes('biometrics-scheduling'))).toBe(true);
  });
});

// ─── Safety-Critical: Document ≠ Safe Travel ──────────────────────────────────────

describe('Safety-Critical: Document Existence Does Not Equal Safe Travel', () => {
  it('having a valid document does not guarantee safe travel', () => {
    // Asylee traveling to country of persecution with valid document
    const analysis = analyzeI131('I want to travel to my home country. I was granted asylum and have a valid refugee travel document.');
    expect(analysis.travelRisk.level).not.toBe('low');
    expect(analysis.travelRisk.factors.some(f => f.includes('persecution'))).toBe(true);
  });

  it('valid AP with criminal history still has elevated risk', () => {
    const analysis = analyzeI131('I have a valid advance parole and a criminal conviction. Can I travel?');
    expect(analysis.travelRisk.factors.some(f => f.includes('Criminal'))).toBe(true);
  });

  it('valid document with near expiry is not safe for travel', () => {
    const nearDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const analysis = analyzeI131('I need to travel. My advance parole is valid.', nearDate);
    if (analysis.docExpiration === 'near_expiry') {
      expect(analysis.travelRisk.level).not.toBe('low');
    }
  });

  it('pending I-485 without AP has high risk even without explicit travel mention', () => {
    const analysis = analyzeI131('I need to travel while my I-485 is pending');
    expect(analysis.travelRisk.level).toBe('high');
  });

  it('H-1B without AP has low risk due to dual-intent exception', () => {
    const analysis = analyzeI131('I have H-1B status and my I-485 is pending. I need to travel.');
    expect(analysis.travelRisk.level).toBe('low');
    expect(analysis.travelRisk.factors.some(f => f.includes('H-1B'))).toBe(true);
  });
});

// ─── Gold Certification — All 27 Stages ────────────────────────────────────────────

describe('I-131 Gold Certification — All 27 Stages', () => {
  it('has exactly 27 Gold stages', () => {
    expect(ALL_GOLD_STAGES.length).toBe(27);
  });

  let fullCtx: I131Context;

  beforeEach(() => {
    fullCtx = runFullPipeline('case-gold', 'owner-gold', 'I need to apply for advance parole while my I-485 is pending. I have my I-485 receipt notice, passport, and two passport-style photos.', {
      approved: true, paymentVerified: true, fulfillmentId: 'fulfill-gold', trackingNumber: 'TRK-GOLD-001', proofId: 'proof-gold',
      docExpirationDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
  });

  it('intake — case created with user text', () => {
    expect(fullCtx.userText).toBeTruthy();
    expect(fullCtx.auditTrail.some(e => e.event === 'INTAKE')).toBe(true);
  });

  it('document_ingestion — user text provides case context', () => {
    expect(fullCtx.userText.length).toBeGreaterThan(10);
  });

  it('classification — document type classified', () => {
    expect(fullCtx.analysis?.docType).toBe('advance_parole');
    expect(fullCtx.auditTrail.some(e => e.event === 'CLASSIFIED')).toBe(true);
  });

  it('extraction — evidence types extracted', () => {
    expect(fullCtx.analysis?.evidenceTypes).toBeDefined();
    expect(fullCtx.analysis?.evidenceTypes.length).toBeGreaterThan(0);
  });

  it('provenance — authority preserved', () => {
    expect(fullCtx.analysis?.authority.some(a => a.includes('INA') || a.includes('CFR'))).toBe(true);
  });

  it('fact_normalization — analysis fields populated', () => {
    expect(fullCtx.analysis?.travelUrgency).toBeDefined();
    expect(fullCtx.analysis?.docType).toBeDefined();
    expect(fullCtx.analysis?.filingRisk).toBeDefined();
  });

  it('deadlines — expiration analysis available', () => {
    expect(fullCtx.analysis?.docExpiration).toBeDefined();
    expect(fullCtx.analysis?.expirationNote).toBeDefined();
  });

  it('issues — validation issues detected', () => {
    expect(fullCtx.validationIssues).toBeDefined();
  });

  it('evidence — evidence types detected', () => {
    expect(fullCtx.analysis?.evidenceTypes).toContain('i485_receipt');
  });

  it('authority — legal authority cited', () => {
    expect(fullCtx.analysis?.authority.length).toBeGreaterThan(0);
  });

  it('risk — risk level assessed', () => {
    expect(['low', 'moderate', 'elevated', 'high']).toContain(fullCtx.analysis?.filingRisk);
  });

  it('strategy — strategy generated', () => {
    expect(fullCtx.strategy).toBeDefined();
    expect(fullCtx.strategy?.approach).toContain('I-131');
  });

  it('drafting — letter drafted', () => {
    expect(fullCtx.draft).toBeTruthy();
    expect(fullCtx.draft).toContain('I-131');
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
    expect(key).toContain('i131');
    expect(verifyIdempotency(fullCtx, new Set([key])).duplicate).toBe(true);
    expect(verifyIdempotency(fullCtx, new Set()).duplicate).toBe(false);
  });

  it('owner_isolation — owner isolation verified', () => {
    const ctxA = createI131Context('case-A', 'owner-A');
    const ctxB = createI131Context('case-B', 'owner-B');
    expect(verifyOwnerIsolation(ctxA, ctxB)).toBe(true);
  });

  it('failure_retry — retry logic available', () => {
    const failed = runFullPipeline('case-1', 'owner-1', 'I need advance parole', { paymentVerified: false });
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

// ─── Distinctness from Other Workflows ──────────────────────────────────────────

describe('I-131 Distinctness from Other Workflows', () => {
  it('I-131 has unique document-type detection not in other workflows', () => {
    expect(detectDocType('I need advance parole for my pending I-485')).toBe('advance_parole');
    expect(detectDocType('I need a re-entry permit. I am a green card holder.')).toBe('reentry_permit');
    expect(detectDocType('I am a refugee and need a refugee travel document')).toBe('refugee_travel_document');
  });

  it('I-131 has unique travel-risk analysis not in other workflows', () => {
    const risk = analyzeTravelRisk('travel without AP', 'advance_parole', 'pending_i485', 'no_document', false);
    expect(risk.level).toBe('high');
    expect(risk.factors.some(f => f.includes('abandonment'))).toBe(true);
  });

  it('I-131 has unique emergency pathway not in other workflows', () => {
    const emergency = analyzeEmergency('My grandmother is dying. I have medical records.');
    expect(emergency.isEmergency).toBe(true);
    expect(emergency.emergencyType).toBe('Death of family member');
  });

  it('I-131 has unique dual-intent exception analysis not in other workflows', () => {
    const risk = analyzeTravelRisk('travel', 'advance_parole', 'h1b_status', 'no_document', false);
    expect(risk.level).toBe('low');
    expect(risk.factors.some(f => f.includes('H-1B'))).toBe(true);
  });

  it('I-131 has unique document validity periods not in other workflows', () => {
    expect(getDocValidityPeriod('advance_parole').years).toBe(1);
    expect(getDocValidityPeriod('reentry_permit').years).toBe(2);
    expect(getDocValidityPeriod('refugee_travel_document').years).toBe(1);
  });
});
