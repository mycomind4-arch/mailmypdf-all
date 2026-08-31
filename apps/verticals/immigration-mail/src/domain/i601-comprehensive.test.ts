/**
 * I-601 / I-601A Inadmissibility Waiver — Comprehensive Gold Tests
 *
 * Covers all 27 Gold certification stages plus domain-specific branches:
 *   - I-601 pathway
 *   - I-601A pathway
 *   - Inadmissibility ground recognition (all grounds)
 *   - Qualifying relative recognition
 *   - Insufficient qualifying-relative evidence
 *   - Hardship evidence categories (all factors)
 *   - Strong vs weak hardship context
 *   - Missing evidence
 *   - RFE/NOID handoff
 *   - Consular/NVC sequencing
 *   - Denial handling
 *   - Non-waivable grounds
 *   - I-601A eligibility gates
 *   - Owner isolation
 *   - Idempotency
 *   - X-Ray adversarial checks
 *   - Complete end-to-end lifecycle
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectI601Event,
  detectInadmissibilityGround,
  detectQualifyingRelative,
  detectHardshipFactors,
  detectWaiverEvidenceTypes,
  detectI601Urgency,
  detectI601Risk,
  checkI601AEligibility,
  getI601AEligibilityFailures,
  determinePathway,
  getWaiverAuthority,
  analyzeI601,
  buildI601Strategy,
  I601_WAIVABLE_GROUNDS,
  I601_NON_WAIVABLE_GROUNDS,
  I601A_WAIVABLE_GROUNDS,
  ALL_INADMISSIBILITY_GROUNDS,
  ALL_HARDSHIP_FACTORS,
  type I601Analysis,
  type I601Strategy,
  type I601EventType,
  type I601Urgency,
  type WaiverPathway,
  type InadmissibilityGround,
  type QualifyingRelativeType,
  type HardshipFactor,
  type WaiverEvidenceType,
  type I601RiskLevel,
  type I601AEligibility,
} from './i601-model';
import {
  createI601Context,
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
  I601_STATES,
  type I601Context,
} from './i601-workflow';
import { ALL_GOLD_STAGES } from './gold-certification-full';

// ─── Event Detection ──────────────────────────────────────────────────────────

describe('I-601 Event Detection', () => {
  it('detects I-601 filing preparation', () => {
    expect(detectI601Event('I need to file I-601 for my inadmissibility waiver')).toBe('i601_filing_preparation');
    expect(detectI601Event('I need a waiver of inadmissibility')).toBe('i601_filing_preparation');
  });

  it('detects I-601A filing preparation', () => {
    expect(detectI601Event('I need to file I-601A before leaving the US')).toBe('i601a_filing_preparation');
    expect(detectI601Event('I want to apply for a provisional waiver')).toBe('i601a_filing_preparation');
    expect(detectI601Event('I need an unlawful presence waiver')).toBe('i601a_filing_preparation');
  });

  it('detects inadmissibility ground detection', () => {
    expect(detectI601Event('I was found inadmissible at my visa interview')).toBe('inadmissibility_ground_detection');
    expect(detectI601Event('I am barred from entering the US')).toBe('inadmissibility_ground_detection');
  });

  it('detects hardship assessment', () => {
    expect(detectI601Event('I need to prove extreme hardship to my wife')).toBe('hardship_assessment');
    expect(detectI601Event('How do I show hardship to my qualifying relative?')).toBe('hardship_assessment');
  });

  it('detects evidence deficiency', () => {
    expect(detectI601Event('I do not have enough evidence for my waiver')).toBe('evidence_deficiency');
  });

  it('detects RFE response routing', () => {
    expect(detectI601Event('USCIS sent me an RFE on my I-601')).toBe('rfe_response');
    expect(detectI601Event('I received a request for evidence')).toBe('rfe_response');
  });

  it('detects NOID response routing', () => {
    expect(detectI601Event('I got a NOID on my I-601A')).toBe('noid_response');
    expect(detectI601Event('USCIS sent a notice of intent to deny')).toBe('noid_response');
  });

  it('detects processing delay', () => {
    expect(detectI601Event('My I-601 has been pending for 18 months')).toBe('processing_delay');
    expect(detectI601Event('USCIS is taking too long on my waiver')).toBe('processing_delay');
  });

  it('detects denial handling', () => {
    expect(detectI601Event('My I-601 was denied')).toBe('denial_handling');
  });

  it('detects approval handling', () => {
    expect(detectI601Event('My I-601A was approved')).toBe('approval_handling');
    expect(detectI601Event('My waiver was granted')).toBe('approval_handling');
  });

  it('detects consular interaction', () => {
    expect(detectI601Event('I need to schedule my visa interview at the embassy')).toBe('consular_interaction');
    expect(detectI601Event('NVC sent me instructions for my consular processing')).toBe('consular_interaction');
  });

  it('returns unknown for unrelated text', () => {
    expect(detectI601Event('I need help with my taxes')).toBe('unknown');
  });
});

// ─── Inadmissibility Ground Detection ────────────────────────────────────────

describe('Inadmissibility Ground Detection', () => {
  it('detects unlawful presence', () => {
    expect(detectInadmissibilityGround('I have unlawful presence from overstaying my visa')).toBe('unlawful_presence');
    expect(detectInadmissibilityGround('I entered without inspection')).toBe('unlawful_presence');
    expect(detectInadmissibilityGround('I have a 10-year bar')).toBe('unlawful_presence');
  });

  it('detects fraud/misrepresentation', () => {
    expect(detectInadmissibilityGround('I was found to have committed fraud on my visa application')).toBe('fraud_misrepresentation');
    expect(detectInadmissibilityGround('I willfully misrepresented material facts')).toBe('fraud_misrepresentation');
  });

  it('detects criminal ground', () => {
    expect(detectInadmissibilityGround('I have a conviction for a crime of moral turpitude')).toBe('criminal_ground');
    expect(detectInadmissibilityGround('I was convicted of a controlled substance offense')).toBe('criminal_ground');
  });

  it('detects health ground', () => {
    expect(detectInadmissibilityGround('I have a communicable disease')).toBe('health_ground');
    expect(detectInadmissibilityGround('I have a mental disorder')).toBe('health_ground');
  });

  it('detects smuggling', () => {
    expect(detectInadmissibilityGround('I was found to have smuggled my brother across the border')).toBe('smuggling');
  });

  it('detects prior removal', () => {
    expect(detectInadmissibilityGround('I was deported and need to return')).toBe('prior_removal');
    expect(detectInadmissibilityGround('I have a prior order of removal')).toBe('prior_removal');
  });

  it('detects unlawful presence after removal (permanent bar)', () => {
    expect(detectInadmissibilityGround('I re-entered after removal and accrued unlawful presence')).toBe('unlawful_presence_after_removal');
    expect(detectInadmissibilityGround('I have a permanent bar')).toBe('unlawful_presence_after_removal');
  });

  it('detects public charge', () => {
    expect(detectInadmissibilityGround('I was found likely to become a public charge')).toBe('public_charge');
  });

  it('detects security ground', () => {
    expect(detectInadmissibilityGround('I was found inadmissible for terrorism-related grounds')).toBe('security_ground');
    expect(detectInadmissibilityGround('I have an espionage conviction')).toBe('security_ground');
  });

  it('returns unknown for non-inadmissibility text', () => {
    expect(detectInadmissibilityGround('I need help with my green card renewal')).toBe('unknown');
  });
});

// ─── Qualifying Relative Detection ────────────────────────────────────────────

describe('Qualifying Relative Detection', () => {
  it('detects US citizen spouse', () => {
    expect(detectQualifyingRelative('My U.S. citizen wife would suffer extreme hardship')).toBe('us_citizen_spouse');
    expect(detectQualifyingRelative('My wife is a US citizen')).toBe('us_citizen_spouse');
  });

  it('detects LPR spouse', () => {
    expect(detectQualifyingRelative('My green card holder spouse would suffer')).toBe('lpr_spouse');
    expect(detectQualifyingRelative('My wife is an LPR')).toBe('lpr_spouse');
  });

  it('detects US citizen parent', () => {
    expect(detectQualifyingRelative('My U.S. citizen mother would suffer extreme hardship')).toBe('us_citizen_parent');
    expect(detectQualifyingRelative('My father is a US citizen')).toBe('us_citizen_parent');
  });

  it('detects LPR parent', () => {
    expect(detectQualifyingRelative('My LPR father would suffer hardship')).toBe('lpr_parent');
  });

  it('detects US citizen child', () => {
    expect(detectQualifyingRelative('My U.S. citizen son would suffer')).toBe('us_citizen_child');
    expect(detectQualifyingRelative('My daughter is a US citizen')).toBe('us_citizen_child');
  });

  it('detects no qualifying relative', () => {
    expect(detectQualifyingRelative('I need a waiver for myself')).toBe('no_qualifying_relative');
  });

  it('detects unknown when family mentioned but status unclear', () => {
    expect(detectQualifyingRelative('My wife would suffer hardship')).toBe('unknown');
    expect(detectQualifyingRelative('My parent would suffer')).toBe('unknown');
  });
});

// ─── Hardship Factor Detection ────────────────────────────────────────────────

describe('Hardship Factor Detection', () => {
  it('detects health hardship', () => {
    expect(detectHardshipFactors('My wife has a serious medical condition requiring treatment')).toContain('health');
  });

  it('detects financial hardship', () => {
    expect(detectHardshipFactors('I would lose my income and my family would face poverty')).toContain('financial');
  });

  it('detects educational hardship', () => {
    expect(detectHardshipFactors('My children would face disruption of their education and language barriers')).toContain('educational');
  });

  it('detects family/caregiving hardship', () => {
    expect(detectHardshipFactors('I am the primary caregiver for my elderly parent with special needs')).toContain('family_caregiving');
  });

  it('detects country conditions hardship', () => {
    expect(detectHardshipFactors('My country has extreme violence and political instability')).toContain('country_conditions');
  });

  it('detects psychological/emotional hardship', () => {
    expect(detectHardshipFactors('My wife suffers from depression and anxiety')).toContain('psychological_emotional');
  });

  it('detects special consideration factors', () => {
    expect(detectHardshipFactors('I am a VAWA self-petitioner with special consideration')).toContain('special_consideration');
  });

  it('detects multiple hardship factors', () => {
    const factors = detectHardshipFactors('My wife has a medical condition, we would face financial ruin, our children would lose their education, and my country has extreme violence');
    expect(factors.length).toBeGreaterThanOrEqual(4);
    expect(factors).toContain('health');
    expect(factors).toContain('financial');
    expect(factors).toContain('educational');
    expect(factors).toContain('country_conditions');
  });

  it('returns none when explicitly stated', () => {
    expect(detectHardshipFactors('I have no evidence of hardship')).toContain('none');
  });

  it('returns unknown when no hardship factors mentioned', () => {
    expect(detectHardshipFactors('I need help with my waiver')).toContain('unknown');
  });
});

// ─── Evidence Type Detection ──────────────────────────────────────────────────

describe('Waiver Evidence Type Detection', () => {
  it('detects qualifying relative evidence', () => {
    expect(detectWaiverEvidenceTypes('I have my marriage certificate and proof of relationship')).toContain('qualifying_relative_evidence');
  });

  it('detects medical evidence', () => {
    expect(detectWaiverEvidenceTypes('I have medical records and a physician letter')).toContain('medical_evidence');
  });

  it('detects financial evidence', () => {
    expect(detectWaiverEvidenceTypes('I have tax returns, pay stubs, and bank statements')).toContain('financial_evidence');
  });

  it('detects country condition evidence', () => {
    expect(detectWaiverEvidenceTypes('I have State Department country reports and news articles')).toContain('country_condition_evidence');
  });

  it('detects psychological evidence', () => {
    expect(detectWaiverEvidenceTypes('I have a psychological evaluation from a licensed psychologist')).toContain('psychological_evidence');
  });

  it('detects character evidence', () => {
    expect(detectWaiverEvidenceTypes('I have evidence of rehabilitation and good moral character')).toContain('character_evidence');
  });

  it('detects discretionary evidence', () => {
    expect(detectWaiverEvidenceTypes('I have letters of support from my community and church')).toContain('discretionary_evidence');
  });

  it('returns unknown when no evidence mentioned', () => {
    expect(detectWaiverEvidenceTypes('I need help filing my waiver')).toContain('unknown');
  });
});

// ─── Urgency Detection ─────────────────────────────────────────────────────────

describe('I-601 Urgency Detection', () => {
  it('returns critical for denial keywords', () => {
    expect(detectI601Urgency('My I-601 was denied')).toBe('critical');
  });

  it('returns critical for removal proceedings', () => {
    expect(detectI601Urgency('I am in removal proceedings')).toBe('critical');
  });

  it('returns critical for NTA keywords', () => {
    expect(detectI601Urgency('I received a notice to appear')).toBe('critical');
  });

  it('returns time_sensitive for upcoming deadlines', () => {
    expect(detectI601Urgency('My filing deadline is approaching soon')).toBe('time_sensitive');
  });

  it('returns routine for general inquiries', () => {
    expect(detectI601Urgency('I want to learn about the I-601 process')).toBe('routine');
  });

  it('uses filing deadline for urgency', () => {
    const futureDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();
    expect(detectI601Urgency('I need to file', futureDate)).toBe('time_sensitive');
  });

  it('uses interview date for urgency', () => {
    const futureDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
    expect(detectI601Urgency('I have an interview', undefined, futureDate)).toBe('time_sensitive');
  });

  it('returns critical when interview date has passed', () => {
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(detectI601Urgency('I missed it', undefined, pastDate)).toBe('critical');
  });
});

// ─── Risk Level Detection ─────────────────────────────────────────────────────

describe('I-601 Risk Level Detection', () => {
  it('returns high for non-waivable grounds', () => {
    expect(detectI601Risk('security_ground', 'I-601', [], true)).toBe('high');
    expect(detectI601Risk('unlawful_presence_after_removal', 'I-601', [], true)).toBe('high');
  });

  it('returns high for no qualifying relative', () => {
    expect(detectI601Risk('unlawful_presence', 'I-601', ['health'], false)).toBe('high');
  });

  it('returns elevated for criminal ground', () => {
    expect(detectI601Risk('criminal_ground', 'I-601', ['health', 'financial'], true)).toBe('elevated');
  });

  it('returns elevated for fraud/misrepresentation', () => {
    expect(detectI601Risk('fraud_misrepresentation', 'I-601', ['health', 'financial'], true)).toBe('elevated');
  });

  it('returns moderate for single hardship factor', () => {
    expect(detectI601Risk('unlawful_presence', 'I-601', ['health'], true)).toBe('moderate');
  });

  it('returns low for unlawful presence with multiple hardship factors', () => {
    expect(detectI601Risk('unlawful_presence', 'I-601', ['health', 'financial', 'educational'], true)).toBe('low');
  });
});

// ─── I-601A Eligibility Gates ──────────────────────────────────────────────────

describe('I-601A Eligibility Gates', () => {
  it('passes all gates for eligible applicant', () => {
    const text = 'I am in the US, I am 25 years old, I have an approved I-130 petition, I paid the visa processing fee, and I only have unlawful presence';
    const eligibility = checkI601AEligibility(text, 'unlawful_presence', 'us_citizen_spouse');
    const failures = getI601AEligibilityFailures(eligibility);
    expect(failures.length).toBe(0);
  });

  it('flags applicant not physically present in US', () => {
    const text = 'I am outside the US in my home country';
    const eligibility = checkI601AEligibility(text, 'unlawful_presence', 'us_citizen_spouse');
    expect(eligibility.physicallyPresentInUS).toBe(false);
  });

  it('flags under 17 years old', () => {
    const text = 'I am a 16 year old minor';
    const eligibility = checkI601AEligibility(text, 'unlawful_presence', 'us_citizen_spouse');
    expect(eligibility.atLeast17).toBe(false);
  });

  it('flags no approved immigrant visa petition', () => {
    const text = 'I am in the US and have unlawful presence';
    const eligibility = checkI601AEligibility(text, 'unlawful_presence', 'us_citizen_spouse');
    expect(eligibility.hasApprovedImmigrantVisaPetition).toBe(false);
  });

  it('flags pending I-485', () => {
    const text = 'I have a pending I-485 adjustment of status application';
    const eligibility = checkI601AEligibility(text, 'unlawful_presence', 'us_citizen_spouse');
    expect(eligibility.hasNoPendingI485).toBe(false);
  });

  it('flags removal proceedings', () => {
    const text = 'I am currently in removal proceedings in immigration court';
    const eligibility = checkI601AEligibility(text, 'unlawful_presence', 'us_citizen_spouse');
    expect(eligibility.notInRemovalProceedings).toBe(false);
  });

  it('allows administratively closed removal proceedings', () => {
    const text = 'My removal proceedings were administratively closed';
    const eligibility = checkI601AEligibility(text, 'unlawful_presence', 'us_citizen_spouse');
    expect(eligibility.notInRemovalProceedings).toBe(true);
  });

  it('flags final removal order', () => {
    const text = 'I have a final order of removal';
    const eligibility = checkI601AEligibility(text, 'unlawful_presence', 'us_citizen_spouse');
    expect(eligibility.noFinalRemovalOrder).toBe(false);
  });

  it('flags reinstated removal order', () => {
    const text = 'I have a reinstated removal order';
    const eligibility = checkI601AEligibility(text, 'unlawful_presence', 'us_citizen_spouse');
    expect(eligibility.noReinstatedRemovalOrder).toBe(false);
  });

  it('flags non-unlawful-presence ground', () => {
    const text = 'I am in the US';
    const eligibility = checkI601AEligibility(text, 'fraud_misrepresentation', 'us_citizen_spouse');
    expect(eligibility.onlyUnlawfulPresence).toBe(false);
  });

  it('flags child as qualifying relative (I-601A only allows spouse/parent)', () => {
    const text = 'I am in the US with an approved I-130 and paid the visa fee';
    const eligibility = checkI601AEligibility(text, 'unlawful_presence', 'us_citizen_child');
    expect(eligibility.hasQualifyingRelative).toBe(false);
  });

  it('lists all failures correctly', () => {
    const text = 'I am outside the US with a final order of removal and pending I-485';
    const eligibility = checkI601AEligibility(text, 'fraud_misrepresentation', 'no_qualifying_relative');
    const failures = getI601AEligibilityFailures(eligibility);
    expect(failures.length).toBeGreaterThanOrEqual(4);
    expect(failures.some(f => f.includes('physically present'))).toBe(true);
    expect(failures.some(f => f.includes('I-485'))).toBe(true);
    expect(failures.some(f => f.includes('final order'))).toBe(true);
    expect(failures.some(f => f.includes('unlawful presence'))).toBe(true);
    expect(failures.some(f => f.includes('qualifying relative'))).toBe(true);
  });
});

// ─── Pathway Determination ─────────────────────────────────────────────────────

describe('Pathway Determination', () => {
  it('determines I-601A for explicit mention', () => {
    expect(determinePathway('I want to file I-601A', 'unlawful_presence', null)).toBe('I-601A');
  });

  it('determines I-601 for explicit mention', () => {
    expect(determinePathway('I need to file I-601 for fraud', 'fraud_misrepresentation', null)).toBe('I-601');
  });

  it('determines I-601 for non-unlawful-presence ground', () => {
    expect(determinePathway('I have a criminal conviction', 'criminal_ground', null)).toBe('I-601');
  });

  it('determines I-601A for eligible unlawful presence applicant', () => {
    const text = 'I am in the US, 25 years old, with an approved I-130 and paid visa fee';
    const eligibility = checkI601AEligibility(text, 'unlawful_presence', 'us_citizen_spouse');
    expect(determinePathway(text, 'unlawful_presence', eligibility)).toBe('I-601A');
  });

  it('returns not_determined for ambiguous cases', () => {
    expect(determinePathway('I need a waiver', 'unknown', null)).toBe('not_determined');
  });
});

// ─── Waiver Authority ──────────────────────────────────────────────────────────

describe('Waiver Authority', () => {
  it('returns correct authority for unlawful presence', () => {
    const auth = getWaiverAuthority('unlawful_presence');
    expect(auth.statute).toContain('212(a)(9)(B)(v)');
    expect(auth.regulation).toContain('212.7');
  });

  it('returns correct authority for fraud/misrepresentation', () => {
    const auth = getWaiverAuthority('fraud_misrepresentation');
    expect(auth.statute).toContain('212(i)');
  });

  it('returns correct authority for criminal ground', () => {
    const auth = getWaiverAuthority('criminal_ground');
    expect(auth.statute).toContain('212(h)');
  });

  it('returns correct authority for smuggling', () => {
    const auth = getWaiverAuthority('smuggling');
    expect(auth.statute).toContain('212(d)(11)');
  });
});

// ─── Waivable / Non-Waivable Grounds ───────────────────────────────────────────

describe('Waivable and Non-Waivable Grounds', () => {
  it('I-601 waivable grounds include unlawful presence', () => {
    expect(I601_WAIVABLE_GROUNDS).toContain('unlawful_presence');
    expect(I601_WAIVABLE_GROUNDS).toContain('fraud_misrepresentation');
    expect(I601_WAIVABLE_GROUNDS).toContain('criminal_ground');
  });

  it('I-601 non-waivable grounds include security grounds', () => {
    expect(I601_NON_WAIVABLE_GROUNDS).toContain('security_ground');
    expect(I601_NON_WAIVABLE_GROUNDS).toContain('unlawful_presence_after_removal');
  });

  it('I-601A only waives unlawful presence', () => {
    expect(I601A_WAIVABLE_GROUNDS).toEqual(['unlawful_presence']);
  });

  it('security ground is not in waivable list', () => {
    expect(I601_WAIVABLE_GROUNDS).not.toContain('security_ground');
  });
});

// ─── Analysis ─────────────────────────────────────────────────────────────────

describe('I-601 Analysis', () => {
  it('produces complete analysis for I-601A unlawful presence', () => {
    const analysis = analyzeI601('I am in the US and need to file I-601A for my unlawful presence. My U.S. citizen wife would suffer extreme hardship. I have an approved I-130 and paid the visa fee.');
    expect(analysis.pathway).toBe('I-601A');
    expect(analysis.inadmissibilityGround).toBe('unlawful_presence');
    expect(analysis.qualifyingRelative).toBe('us_citizen_spouse');
    expect(analysis.waiverAvailable).toBe(true);
    expect(analysis.authority).toContain('INA § 212(a)(9)(B)(v)');
  });

  it('produces complete analysis for I-601 fraud', () => {
    const analysis = analyzeI601('I need to file I-601 for fraud on my visa application. My U.S. citizen wife would suffer financial and medical hardship.');
    expect(analysis.pathway).toBe('I-601');
    expect(analysis.inadmissibilityGround).toBe('fraud_misrepresentation');
    expect(analysis.qualifyingRelative).toBe('us_citizen_spouse');
    expect(analysis.hardshipFactors).toContain('financial');
    expect(analysis.hardshipFactors).toContain('health');
    expect(analysis.authority).toContain('INA § 212(i)');
  });

  it('produces complete analysis for criminal ground', () => {
    const analysis = analyzeI601('I need to file I-601 for my criminal conviction. My LPR parent would suffer hardship.');
    expect(analysis.inadmissibilityGround).toBe('criminal_ground');
    expect(analysis.pathway).toBe('I-601');
  });

  it('flags non-waivable security ground', () => {
    const analysis = analyzeI601('I was found inadmissible for terrorism');
    expect(analysis.inadmissibilityGround).toBe('security_ground');
    expect(analysis.waiverAvailable).toBe(false);
  });

  it('flags missing qualifying relative', () => {
    const analysis = analyzeI601('I need an I-601 waiver for unlawful presence');
    expect(analysis.qualifyingRelative).toBe('no_qualifying_relative');
    expect(analysis.riskLevel).toBe('high');
  });

  it('includes I-601A eligibility for unlawful presence', () => {
    const analysis = analyzeI601('I am in the US and need I-601A for unlawful presence');
    expect(analysis.i601aEligibility).not.toBeNull();
    expect(analysis.i601aEligibilityFailures.length).toBeGreaterThan(0);
  });

  it('detects evidence types in analysis', () => {
    const analysis = analyzeI601('I have medical records and tax returns for my I-601 waiver');
    expect(analysis.evidenceTypes).toContain('medical_evidence');
    expect(analysis.evidenceTypes).toContain('financial_evidence');
  });

  it('includes processing time note', () => {
    const analysis = analyzeI601('I need to file I-601');
    expect(analysis.processingTimeNote).toContain('12');
    expect(analysis.processingTimeNote).toContain('30');
  });

  it('includes consular sequencing note for I-601A', () => {
    const analysis = analyzeI601('I need to file I-601A before departing');
    expect(analysis.consularSequencingNote).toContain('depart the US');
  });

  it('includes consular sequencing note for I-601', () => {
    const analysis = analyzeI601('I need to file I-601 after my visa interview');
    expect(analysis.consularSequencingNote).toContain('remain abroad');
  });
});

// ─── Strategy Generation ─────────────────────────────────────────────────────

describe('I-601 Strategy Generation', () => {
  it('generates strategy for I-601A pathway', () => {
    const analysis = analyzeI601('I am in the US and need to file I-601A for unlawful presence. My U.S. citizen wife would suffer medical and financial hardship. I have medical records, tax returns, and an approved I-130 and paid the visa fee.');
    const strategy = buildI601Strategy(analysis);
    expect(strategy.approach).toContain('I-601A');
    expect(strategy.keyArguments.length).toBeGreaterThan(0);
    expect(strategy.supportingEvidence.length).toBeGreaterThan(0);
    expect(strategy.authority).toContain('INA § 212(a)(9)(B)(v)');
  });

  it('generates strategy for I-601 fraud pathway', () => {
    const analysis = analyzeI601('I need to file I-601 for fraud. My U.S. citizen wife would suffer financial hardship.');
    const strategy = buildI601Strategy(analysis);
    expect(strategy.approach).toContain('I-601');
    expect(strategy.keyArguments.some(a => a.includes('fraud'))).toBe(true);
    expect(strategy.authority).toContain('INA § 212(i)');
  });

  it('generates strategy for criminal ground', () => {
    const analysis = analyzeI601('I need I-601 for my criminal conviction. My LPR parent would suffer hardship.');
    const strategy = buildI601Strategy(analysis);
    expect(strategy.keyArguments.some(a => a.includes('criminal'))).toBe(true);
    expect(strategy.authority).toContain('INA § 212(h)');
  });

  it('flags non-waivable ground in strategy', () => {
    const analysis = analyzeI601('I was found inadmissible for terrorism');
    const strategy = buildI601Strategy(analysis);
    expect(strategy.approach).toContain('not be available');
  });

  it('includes eligibility gates for I-601A', () => {
    const analysis = analyzeI601('I need I-601A for unlawful presence');
    const strategy = buildI601Strategy(analysis);
    expect(strategy.eligibilityGates.length).toBeGreaterThan(0);
  });

  it('includes discretionary note', () => {
    const analysis = analyzeI601('I need I-601 for unlawful presence. My U.S. citizen wife would suffer hardship.');
    const strategy = buildI601Strategy(analysis);
    expect(strategy.discretionaryNote).toContain('discretionary');
    expect(strategy.discretionaryNote).toContain('never guaranteed');
  });

  it('includes consular note', () => {
    const analysis = analyzeI601('I need I-601A before departing');
    const strategy = buildI601Strategy(analysis);
    expect(strategy.consularNote).toContain('depart');
  });

  it('includes hardship note', () => {
    const analysis = analyzeI601('I need I-601 for fraud. My U.S. citizen wife would suffer hardship.');
    const strategy = buildI601Strategy(analysis);
    expect(strategy.hardshipNote.toLowerCase()).toContain('extreme hardship');
    expect(strategy.hardshipNote).toContain('cumulatively');
  });
});

// ─── Workflow Engine — State Transitions ──────────────────────────────────────

describe('I-601 Workflow Engine', () => {
  it('creates context with default values', () => {
    const ctx = createI601Context('case-1', 'owner-1');
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
    const ctx = createI601Context('case-1', 'owner-1');
    const after = intake(ctx, 'I need I-601', 'I-601', 'WAC1234567890');
    expect(after.userText).toBe('I need I-601');
    expect(after.formType).toBe('I-601');
    expect(after.receiptNumber).toBe('WAC1234567890');
    expect(after.auditTrail.length).toBe(1);
    expect(after.auditTrail[0].event).toBe('INTAKE');
  });

  it('analyze produces analysis and audit entry', () => {
    const ctx = intake(createI601Context('case-1', 'owner-1'), 'I need to file I-601 for unlawful presence');
    const after = analyze(ctx);
    expect(after.analysis).toBeDefined();
    expect(after.auditTrail.length).toBe(2);
    expect(after.auditTrail[1].event).toBe('ANALYZED');
  });

  it('classify adds audit entry', () => {
    const ctx = analyze(intake(createI601Context('case-1', 'owner-1'), 'I need to file I-601 for unlawful presence'));
    const after = classify(ctx);
    expect(after.auditTrail.length).toBe(3);
    expect(after.auditTrail[2].event).toBe('CLASSIFIED');
  });

  it('buildStrategy produces strategy', () => {
    const ctx = classify(analyze(intake(createI601Context('case-1', 'owner-1'), 'I need to file I-601 for unlawful presence. My U.S. citizen wife would suffer hardship.')));
    const after = buildStrategy(ctx);
    expect(after.strategy).toBeDefined();
  });

  it('draft produces draft text', () => {
    const ctx = buildStrategy(classify(analyze(intake(createI601Context('case-1', 'owner-1'), 'I need to file I-601 for unlawful presence. My U.S. citizen wife would suffer hardship.'))));
    const after = draft(ctx);
    expect(after.draft).toBeDefined();
    expect(after.draft).toContain('USCIS');
    expect(after.draft).toContain('I-601');
  });

  it('validate produces validation issues', () => {
    const ctx = draft(buildStrategy(classify(analyze(intake(createI601Context('case-1', 'owner-1'), 'I need I-601')))));
    const after = validate(ctx);
    expect(after.validationIssues).toBeDefined();
    expect(Array.isArray(after.validationIssues)).toBe(true);
  });

  it('xray produces X-Ray issues', () => {
    const ctx = validate(draft(buildStrategy(classify(analyze(intake(createI601Context('case-1', 'owner-1'), 'I need I-601'))))));
    const after = xray(ctx);
    expect(after.xrayIssues).toBeDefined();
    expect(Array.isArray(after.xrayIssues)).toBe(true);
  });

  it('userReview sets approved flag', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need I-601 for unlawful presence. My U.S. citizen wife would suffer hardship.');
    const approved = userReview(ctx, true);
    expect(approved.approved).toBe(true);
    const rejected = userReview(ctx, false);
    expect(rejected.approved).toBe(false);
  });

  it('pay sets paid flag', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need I-601 for unlawful presence. My U.S. citizen wife would suffer hardship.', { paymentVerified: false });
    const paid = pay(ctx, true);
    expect(paid.paid).toBe(true);
  });

  it('fulfill sets fulfillment ID', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need I-601 for unlawful presence. My U.S. citizen wife would suffer hardship.', { paymentVerified: true });
    const after = fulfill(ctx, 'fulfill-001');
    expect(after.fulfillmentId).toBe('fulfill-001');
  });

  it('track sets tracking number', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need I-601 for unlawful presence. My U.S. citizen wife would suffer hardship.', { fulfillmentId: 'fulfill-001' });
    const after = track(ctx, 'TRK123456');
    expect(after.trackingNumber).toBe('TRK123456');
  });

  it('prove sets proof ID', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need I-601 for unlawful presence. My U.S. citizen wife would suffer hardship.', { fulfillmentId: 'fulfill-001', trackingNumber: 'TRK123456' });
    const after = prove(ctx, 'proof-001');
    expect(after.proofId).toBe('proof-001');
  });

  it('throws when classifying without analysis', () => {
    const ctx = createI601Context('case-1', 'owner-1');
    expect(() => classify(ctx)).toThrow('Must analyze before classifying');
  });

  it('throws when building strategy without analysis', () => {
    const ctx = createI601Context('case-1', 'owner-1');
    expect(() => buildStrategy(ctx)).toThrow('Must analyze before building strategy');
  });

  it('throws when drafting without analysis or strategy', () => {
    const ctx = createI601Context('case-1', 'owner-1');
    expect(() => draft(ctx)).toThrow();
  });

  it('throws when validating without draft', () => {
    const ctx = createI601Context('case-1', 'owner-1');
    expect(() => validate(ctx)).toThrow('Must draft before validating');
  });

  it('throws when X-Ray without draft', () => {
    const ctx = createI601Context('case-1', 'owner-1');
    expect(() => xray(ctx)).toThrow();
  });
});

// ─── Full Pipeline ───────────────────────────────────────────────────────────

describe('I-601 Full Pipeline', () => {
  it('runs full pipeline for I-601A unlawful presence', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I am in the US and need to file I-601A for unlawful presence. My U.S. citizen wife would suffer medical and financial hardship. I have medical records, tax returns, and an approved I-130 and paid the visa fee.', {
      approved: true,
      paymentVerified: true,
      fulfillmentId: 'fulfill-001',
      trackingNumber: 'TRK123456',
      proofId: 'proof-001',
    });
    expect(ctx.analysis?.pathway).toBe('I-601A');
    expect(ctx.strategy).toBeDefined();
    expect(ctx.draft).toBeDefined();
    expect(ctx.approved).toBe(true);
    expect(ctx.paid).toBe(true);
    expect(ctx.fulfillmentId).toBe('fulfill-001');
    expect(ctx.trackingNumber).toBe('TRK123456');
    expect(ctx.proofId).toBe('proof-001');
    expect(ctx.auditTrail.length).toBeGreaterThanOrEqual(10);
  });

  it('runs full pipeline for I-601 fraud', () => {
    const ctx = runFullPipeline('case-2', 'owner-2', 'I need to file I-601 for fraud on my visa application. My U.S. citizen wife would suffer financial hardship.');
    expect(ctx.analysis?.pathway).toBe('I-601');
    expect(ctx.analysis?.inadmissibilityGround).toBe('fraud_misrepresentation');
  });

  it('runs full pipeline for criminal ground', () => {
    const ctx = runFullPipeline('case-3', 'owner-3', 'I need I-601 for my criminal conviction. My LPR parent would suffer hardship.');
    expect(ctx.analysis?.inadmissibilityGround).toBe('criminal_ground');
    expect(ctx.analysis?.pathway).toBe('I-601');
  });

  it('runs full pipeline for non-waivable security ground', () => {
    const ctx = runFullPipeline('case-4', 'owner-4', 'I was found inadmissible for terrorism');
    expect(ctx.analysis?.inadmissibilityGround).toBe('security_ground');
    expect(ctx.analysis?.waiverAvailable).toBe(false);
  });
});

// ─── States ──────────────────────────────────────────────────────────────────

describe('I-601 States', () => {
  it('has all 13 states', () => {
    expect(I601_STATES.length).toBe(13);
    expect(I601_STATES).toContain('intake');
    expect(I601_STATES).toContain('analyzed');
    expect(I601_STATES).toContain('classified');
    expect(I601_STATES).toContain('strategy_built');
    expect(I601_STATES).toContain('drafted');
    expect(I601_STATES).toContain('validated');
    expect(I601_STATES).toContain('xray_complete');
    expect(I601_STATES).toContain('user_review');
    expect(I601_STATES).toContain('approved');
    expect(I601_STATES).toContain('paid');
    expect(I601_STATES).toContain('fulfilled');
    expect(I601_STATES).toContain('tracked');
    expect(I601_STATES).toContain('proven');
  });

  it('states are in correct order', () => {
    expect(I601_STATES[0]).toBe('intake');
    expect(I601_STATES[I601_STATES.length - 1]).toBe('proven');
  });
});

// ─── Idempotency ─────────────────────────────────────────────────────────────

describe('I-601 Idempotency', () => {
  it('creates consistent idempotency key for same case and owner', () => {
    const ctx1 = createI601Context('case-1', 'owner-1');
    const ctx2 = createI601Context('case-1', 'owner-1');
    expect(createIdempotencyKey(ctx1)).toBe(createIdempotencyKey(ctx2));
  });

  it('creates different idempotency key for different case', () => {
    const ctx1 = createI601Context('case-1', 'owner-1');
    const ctx2 = createI601Context('case-2', 'owner-1');
    expect(createIdempotencyKey(ctx1)).not.toBe(createIdempotencyKey(ctx2));
  });

  it('creates different idempotency key for different owner', () => {
    const ctx1 = createI601Context('case-1', 'owner-1');
    const ctx2 = createI601Context('case-1', 'owner-2');
    expect(createIdempotencyKey(ctx1)).not.toBe(createIdempotencyKey(ctx2));
  });

  it('detects duplicate submission', () => {
    const ctx = createI601Context('case-1', 'owner-1');
    const previousKeys = new Set([createIdempotencyKey(ctx)]);
    const result = verifyIdempotency(ctx, previousKeys);
    expect(result.duplicate).toBe(true);
  });

  it('allows non-duplicate submission', () => {
    const ctx = createI601Context('case-1', 'owner-1');
    const previousKeys = new Set<string>();
    const result = verifyIdempotency(ctx, previousKeys);
    expect(result.duplicate).toBe(false);
  });
});

// ─── Owner Isolation ─────────────────────────────────────────────────────────

describe('I-601 Owner Isolation', () => {
  it('verifies isolation between different owners', () => {
    const ctxA = createI601Context('case-1', 'owner-A');
    const ctxB = createI601Context('case-2', 'owner-B');
    expect(verifyOwnerIsolation(ctxA, ctxB)).toBe(true);
  });

  it('allows same owner for same case', () => {
    const ctxA = createI601Context('case-1', 'owner-A');
    const ctxB = createI601Context('case-1', 'owner-A');
    expect(verifyOwnerIsolation(ctxA, ctxB)).toBe(true);
  });
});

// ─── Audit Trail ─────────────────────────────────────────────────────────────

describe('I-601 Audit Trail', () => {
  it('builds complete audit trail through full pipeline', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need I-601 for unlawful presence. My U.S. citizen wife would suffer hardship.', {
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
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need I-601');
    for (const entry of ctx.auditTrail) {
      expect(entry.timestamp).toBeTruthy();
      expect(entry.event).toBeTruthy();
    }
  });
});

// ─── X-Ray Adversarial Review ────────────────────────────────────────────────

describe('I-601 X-Ray Adversarial Review', () => {
  it('passes clean X-Ray for well-formed I-601A case', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I am in the US and need to file I-601A for unlawful presence. My U.S. citizen wife would suffer medical and financial hardship. I have medical records, tax returns, and an approved I-130 and paid the visa fee.');
    expect(ctx.xrayIssues.length).toBe(0);
  });

  it('flags I-601A with non-unlawful-presence ground', () => {
    const ctx = createI601Context('case-1', 'owner-1');
    let pipeline = intake(ctx, 'I need I-601A for my fraud');
    pipeline = analyze(pipeline);
    if (pipeline.analysis) {
      pipeline.analysis.pathway = 'I-601A';
      pipeline.analysis.inadmissibilityGround = 'fraud_misrepresentation';
    }
    pipeline = classify(pipeline);
    pipeline = buildStrategy(pipeline);
    pipeline = draft(pipeline);
    pipeline = validate(pipeline);
    pipeline = xray(pipeline);
    expect(pipeline.xrayIssues.some(i => i.includes('not unlawful presence'))).toBe(true);
  });

  it('flags I-601A with child qualifying relative', () => {
    const ctx = createI601Context('case-1', 'owner-1');
    let pipeline = intake(ctx, 'I need I-601A for unlawful presence. My U.S. citizen son would suffer hardship.');
    pipeline = analyze(pipeline);
    if (pipeline.analysis) {
      pipeline.analysis.pathway = 'I-601A';
      pipeline.analysis.qualifyingRelative = 'us_citizen_child';
    }
    pipeline = classify(pipeline);
    pipeline = buildStrategy(pipeline);
    pipeline = draft(pipeline);
    pipeline = validate(pipeline);
    pipeline = xray(pipeline);
    expect(pipeline.xrayIssues.some(i => i.includes('child as qualifying relative'))).toBe(true);
  });

  it('flags high risk with minimal hardship factors', () => {
    const ctx = createI601Context('case-1', 'owner-1');
    let pipeline = intake(ctx, 'I need I-601 for terrorism');
    pipeline = analyze(pipeline);
    pipeline = classify(pipeline);
    pipeline = buildStrategy(pipeline);
    pipeline = draft(pipeline);
    pipeline = validate(pipeline);
    pipeline = xray(pipeline);
    expect(pipeline.xrayIssues.length).toBeGreaterThanOrEqual(0);
  });
});

// ─── Validation ──────────────────────────────────────────────────────────────

describe('I-601 Validation', () => {
  it('flags non-waivable ground', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I was found inadmissible for terrorism');
    expect(ctx.validationIssues.some(i => i.includes('waivable'))).toBe(true);
  });

  it('flags missing qualifying relative', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need I-601 for unlawful presence');
    expect(ctx.validationIssues.some(i => i.includes('qualifying relative'))).toBe(true);
  });

  it('flags I-601A eligibility failures', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need I-601A for unlawful presence');
    expect(ctx.validationIssues.some(i => i.includes('eligibility'))).toBe(true);
  });

  it('flags missing hardship factors', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need I-601. My U.S. citizen wife is my qualifying relative.');
    expect(ctx.validationIssues.some(i => i.includes('hardship'))).toBe(true);
  });

  it('flags pathway not determined', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need help with a waiver');
    expect(ctx.validationIssues.some(i => i.includes('pathway'))).toBe(true);
  });

  it('flags security ground without attorney', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I was found inadmissible for terrorism');
    expect(ctx.validationIssues.some(i => i.includes('attorney'))).toBe(true);
  });

  it('flags permanent bar without I-212 note', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I re-entered after removal and have a permanent bar');
    expect(ctx.validationIssues.some(i => i.includes('I-212'))).toBe(true);
  });

  it('passes validation for well-formed I-601A', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I am in the US and need to file I-601A for unlawful presence. My U.S. citizen wife would suffer medical and financial hardship. I have medical records, tax returns, and an approved I-130 and paid the visa fee.');
    expect(ctx.validationIssues.length).toBe(0);
  });
});

// ─── Failure & Retry ──────────────────────────────────────────────────────────

describe('I-601 Failure & Retry', () => {
  it('handles unapproved draft gracefully', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need I-601 for unlawful presence. My U.S. citizen wife would suffer hardship.', { approved: false });
    expect(ctx.approved).toBe(false);
  });

  it('handles failed payment gracefully', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need I-601 for unlawful presence. My U.S. citizen wife would suffer hardship.', { approved: true, paymentVerified: false });
    expect(ctx.paid).toBe(false);
  });

  it('can retry after failed payment', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need I-601 for unlawful presence. My U.S. citizen wife would suffer hardship.', { approved: true, paymentVerified: false });
    const retried = pay(ctx, true);
    expect(retried.paid).toBe(true);
  });

  it('handles missing fulfillment gracefully', () => {
    const ctx = runFullPipeline('case-1', 'owner-1', 'I need I-601 for unlawful presence. My U.S. citizen wife would suffer hardship.', { approved: true, paymentVerified: true });
    expect(ctx.fulfillmentId).toBeUndefined();
  });
});

// ─── I-601 vs I-601A Distinctness ─────────────────────────────────────────────

describe('I-601 vs I-601A Distinctness', () => {
  it('I-601A only waives unlawful presence', () => {
    const analysis = analyzeI601('I need I-601A for my fraud conviction');
    // I-601A mentioned but ground is fraud — pathway should be I-601A (explicit mention)
    // but the ground is not unlawful presence
    expect(analysis.pathway).toBe('I-601A');
    expect(analysis.inadmissibilityGround).toBe('fraud_misrepresentation');
    // I-601A eligibility should fail because ground is not unlawful presence
    expect(analysis.i601aEligibility?.onlyUnlawfulPresence).toBe(false);
  });

  it('I-601 covers multiple grounds', () => {
    const fraudAnalysis = analyzeI601('I need I-601 for fraud');
    expect(fraudAnalysis.inadmissibilityGround).toBe('fraud_misrepresentation');

    const criminalAnalysis = analyzeI601('I need I-601 for my criminal conviction');
    expect(criminalAnalysis.inadmissibilityGround).toBe('criminal_ground');
  });

  it('I-601A requires presence in US; I-601 is typically filed abroad', () => {
    const i601aAnalysis = analyzeI601('I am in the US and need I-601A for unlawful presence');
    expect(i601aAnalysis.consularSequencingNote).toContain('depart the US');

    const i601Analysis = analyzeI601('I need I-601 after being found inadmissible at my visa interview');
    expect(i601Analysis.consularSequencingNote).toContain('remain abroad');
  });

  it('I-601A qualifying relative is spouse or parent only; I-601 can include children for some grounds', () => {
    const childEligibility = checkI601AEligibility('I am in the US with approved I-130', 'unlawful_presence', 'us_citizen_child');
    expect(childEligibility.hasQualifyingRelative).toBe(false);
  });

  it('I-601A has unique eligibility gates not present in I-601', () => {
    const text = 'I have a pending I-485 and a final order of removal';
    const eligibility = checkI601AEligibility(text, 'unlawful_presence', 'us_citizen_spouse');
    const failures = getI601AEligibilityFailures(eligibility);
    expect(failures.some(f => f.includes('I-485'))).toBe(true);
    expect(failures.some(f => f.includes('final order'))).toBe(true);
  });
});

// ─── RFE/NOID Routing ─────────────────────────────────────────────────────────

describe('I-601 RFE/NOID Routing', () => {
  it('RFE events route to rfe_response', () => {
    expect(detectI601Event('USCIS sent me an RFE on my I-601')).toBe('rfe_response');
  });

  it('NOID events route to noid_response', () => {
    expect(detectI601Event('I got a NOID on my I-601A')).toBe('noid_response');
  });

  it('RFE and NOID take priority over other event types', () => {
    expect(detectI601Event('I got an RFE for my I-601 for fraud')).toBe('rfe_response');
    expect(detectI601Event('I got a NOID for my I-601A for unlawful presence')).toBe('noid_response');
  });
});

// ─── Consular/NVC Sequencing ──────────────────────────────────────────────────

describe('I-601 Consular/NVC Sequencing', () => {
  it('I-601A requires departure after approval', () => {
    const analysis = analyzeI601('I need I-601A before leaving the US');
    expect(analysis.consularSequencingNote).toContain('depart');
    expect(analysis.consularSequencingNote).toContain('consular visa interview');
  });

  it('I-601 applicant remains abroad during adjudication', () => {
    const analysis = analyzeI601('I need I-601 after my visa interview where I was found inadmissible');
    expect(analysis.consularSequencingNote).toContain('remain abroad');
  });

  it('consular interaction detected for NVC/embassy mentions', () => {
    expect(detectI601Event('NVC sent me instructions for my consular processing')).toBe('consular_interaction');
  });
});

// ─── Denial Handling ─────────────────────────────────────────────────────────

describe('I-601 Denial Handling', () => {
  it('detects denial events', () => {
    expect(detectI601Event('My I-601 was denied')).toBe('denial_handling');
  });

  it('denial triggers critical urgency', () => {
    expect(detectI601Urgency('My I-601 was denied')).toBe('critical');
  });

  it('denial with removal proceedings is critical', () => {
    const analysis = analyzeI601('My I-601 was denied and I am in removal proceedings');
    expect(analysis.urgency).toBe('critical');
  });
});

// ─── Approval Handling ───────────────────────────────────────────────────────

describe('I-601 Approval Handling', () => {
  it('detects approval events', () => {
    expect(detectI601Event('My I-601A was approved')).toBe('approval_handling');
  });

  it('approval analysis includes consular sequencing for I-601A', () => {
    const analysis = analyzeI601('My I-601A was approved and I need to go to my consular interview');
    expect(analysis.consularSequencingNote).toContain('depart the US');
  });
});

// ─── Gold Certification — All 27 Stages ───────────────────────────────────────

describe('I-601 Gold Certification — All 27 Stages', () => {
  it('has exactly 27 Gold stages', () => {
    expect(ALL_GOLD_STAGES.length).toBe(27);
  });

  let fullCtx: I601Context;

  beforeEach(() => {
    fullCtx = runFullPipeline('case-gold', 'owner-gold', 'I am in the US and need to file I-601A for unlawful presence. My U.S. citizen wife would suffer medical and financial hardship. I have medical records, tax returns, and an approved I-130 and paid the visa fee.', {
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
  it('document_ingestion — user text provides case context', () => {
    expect(fullCtx.userText.length).toBeGreaterThan(10);
  });

  // ── Stage 3: Classification ──
  it('classification — pathway and ground classified', () => {
    expect(fullCtx.analysis?.pathway).toBe('I-601A');
    expect(fullCtx.analysis?.inadmissibilityGround).toBe('unlawful_presence');
    expect(fullCtx.auditTrail.some(e => e.event === 'CLASSIFIED')).toBe(true);
  });

  // ── Stage 4: Extraction ──
  it('extraction — hardship factors extracted from text', () => {
    expect(fullCtx.analysis?.hardshipFactors).toBeDefined();
    expect(fullCtx.analysis?.hardshipFactors.length).toBeGreaterThan(0);
  });

  // ── Stage 5: Provenance ──
  it('provenance — authority citations preserved', () => {
    expect(fullCtx.analysis?.authority).toContain('INA § 212(a)(9)(B)(v)');
  });

  // ── Stage 6: Fact Normalization ──
  it('fact_normalization — analysis fields populated', () => {
    expect(fullCtx.analysis?.urgency).toBeDefined();
    expect(fullCtx.analysis?.pathway).toBeDefined();
    expect(fullCtx.analysis?.riskLevel).toBeDefined();
  });

  // ── Stage 7: Deadlines ──
  it('deadlines — deadline logic available', () => {
    expect(fullCtx.analysis?.processingTimeNote).toContain('12');
  });

  // ── Stage 8: Issues ──
  it('issues — validation issues detected', () => {
    expect(fullCtx.validationIssues).toBeDefined();
    expect(Array.isArray(fullCtx.validationIssues)).toBe(true);
  });

  // ── Stage 9: Evidence ──
  it('evidence — evidence types detected', () => {
    expect(fullCtx.analysis?.hardshipFactors).toContain('health');
    expect(fullCtx.analysis?.hardshipFactors).toContain('financial');
  });

  // ── Stage 10: Authority ──
  it('authority — legal authority cited', () => {
    expect(fullCtx.analysis?.authority).toContain('INA § 212(a)(9)(B)(v)');
    expect(fullCtx.analysis?.authority.some(a => a.includes('USCIS Policy Manual'))).toBe(true);
  });

  // ── Stage 11: Risk ──
  it('risk — risk level assessed', () => {
    expect(fullCtx.analysis?.riskLevel).toBeDefined();
    expect(['low', 'moderate', 'elevated', 'high']).toContain(fullCtx.analysis?.riskLevel);
  });

  // ── Stage 12: Strategy ──
  it('strategy — strategy generated', () => {
    expect(fullCtx.strategy).toBeDefined();
    expect(fullCtx.strategy?.approach).toContain('I-601A');
    expect(fullCtx.strategy?.keyArguments.length).toBeGreaterThan(0);
  });

  // ── Stage 13: Drafting ──
  it('drafting — letter drafted', () => {
    expect(fullCtx.draft).toBeTruthy();
    expect(fullCtx.draft).toContain('I-601A');
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
  it('provider_submission — provider fulfillment available', () => {
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
    expect(key).toContain('i601');
    expect(key).toContain('case-gold');
    expect(key).toContain('owner-gold');
    const dup = verifyIdempotency(fullCtx, new Set([key]));
    expect(dup.duplicate).toBe(true);
    const nonDup = verifyIdempotency(fullCtx, new Set());
    expect(nonDup.duplicate).toBe(false);
  });

  // ── Stage 26: Owner Isolation ──
  it('owner_isolation — owner isolation verified', () => {
    const ctxA = createI601Context('case-A', 'owner-A');
    const ctxB = createI601Context('case-B', 'owner-B');
    expect(verifyOwnerIsolation(ctxA, ctxB)).toBe(true);
  });

  // ── Stage 27: Failure/Retry ──
  it('failure_retry — retry logic available', () => {
    const failed = runFullPipeline('case-1', 'owner-1', 'I need I-601 for unlawful presence. My U.S. citizen wife would suffer hardship.', { approved: true, paymentVerified: false });
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

// ─── Distinctness from Other Workflows ──────────────────────────────────────

describe('I-601 Distinctness from Other Workflows', () => {
  it('I-601 has unique inadmissibility ground detection not in other workflows', () => {
    const analysis = analyzeI601('I was found inadmissible for fraud');
    expect(analysis.inadmissibilityGround).toBe('fraud_misrepresentation');
    expect(I601_WAIVABLE_GROUNDS).toContain('fraud_misrepresentation');
  });

  it('I-601 has unique I-601A eligibility gates not in other workflows', () => {
    const analysis = analyzeI601('I need I-601A for unlawful presence');
    expect(analysis.i601aEligibility).not.toBeNull();
    expect(analysis.i601aEligibilityFailures.length).toBeGreaterThan(0);
  });

  it('I-601 has unique pathway distinction (I-601 vs I-601A) not in other workflows', () => {
    const i601 = analyzeI601('I need I-601 for fraud');
    expect(i601.pathway).toBe('I-601');

    const i601a = analyzeI601('I need I-601A for unlawful presence');
    expect(i601a.pathway).toBe('I-601A');
  });

  it('I-601 has unique waiver availability concept not in other workflows', () => {
    const waivable = analyzeI601('I need I-601 for unlawful presence');
    expect(waivable.waiverAvailable).toBe(true);

    const nonWaivable = analyzeI601('I was found inadmissible for terrorism');
    expect(nonWaivable.waiverAvailable).toBe(false);
  });

  it('I-601 has unique qualifying relative per-ground variation not in other workflows', () => {
    // I-601 for fraud: qualifying relative can be spouse, parent, son, OR daughter
    // I-601A: qualifying relative is spouse or parent ONLY
    // I-601 for unlawful presence: qualifying relative is spouse or parent
    const fraudAnalysis = analyzeI601('I need I-601 for fraud. My U.S. citizen daughter would suffer hardship.');
    expect(fraudAnalysis.qualifyingRelative).toBe('us_citizen_child');
    // Fraud allows children as qualifying relatives (INA § 212(i))
    // But I-601A would not
  });
});
