import { describe, it, expect } from 'vitest';
import {
  detectNOIDFormType,
  detectDenialGrounds,
  analyzeProceduralIssues,
  assessOverallRisk,
  shouldRecommendAttorney,
  analyzeNOID,
  buildEvidenceRequirements,
  buildNOIDStrategy,
  type NOIDFormType,
} from './noid-model';

const NOID_TEXT = `U.S. Citizenship and Immigration Services
Notice of Intent to Deny
I-485 Application to Register Permanent Residence
Receipt Number: MSC1234567890
You must respond no later than December 15, 2026

USCIS finds that the applicant is inadmissible under INA § 212(a)(6)(C)(i) for willful misrepresentation of a material fact. The applicant misrepresented their marital status on the original application. This finding is based on a comparison of the application with the applicant's divorce records.

Additionally, USCIS has determined that the evidence of bona fide marriage is insufficient. The documents submitted do not adequately establish that the marriage was entered in good faith.

The applicant may submit a response within 33 days of the date of this notice.`;

const NOID_INSUFFICIENT = `U.S. Citizenship and Immigration Services
Notice of Intent to Deny
I-130 Petition for Alien Relative
Receipt: WAC9876543210
You must respond no later than November 30, 2026

USCIS finds that the evidence of the bona fide marriage is insufficient. The documents submitted do not establish that the marriage was entered in good faith.`;

const NOID_PUBLIC_CHARGE = `U.S. Citizenship and Immigration Services
Notice of Intent to Deny
I-485 Application to Register Permanent Residence
Receipt: LIN1234567890
within 33 days

USCIS finds that the applicant is likely to become a public charge. The Affidavit of Support submitted is insufficient.`;

describe('NOID Form Type Detection', () => {
  it('detects I-485', () => {
    expect(detectNOIDFormType(NOID_TEXT)).toBe('I-485');
  });

  it('detects I-130', () => {
    expect(detectNOIDFormType(NOID_INSUFFICIENT)).toBe('I-130');
  });

  it('returns generic for unknown form', () => {
    expect(detectNOIDFormType('This is a random document')).toBe('generic');
  });
});

describe('NOID Denial Ground Detection', () => {
  it('detects fraud/misrepresentation', () => {
    const grounds = detectDenialGrounds(NOID_TEXT);
    const fraud = grounds.find(g => g.category === 'fraud_misrepresentation');
    expect(fraud).toBeDefined();
    expect(fraud!.severity).toBe('critical');
    expect(fraud!.statutoryBasis).toContain('212(a)(6)(C)(i)');
    expect(fraud!.rebuttable).toBe(true);
    expect(fraud!.legalArgumentRequired).toBe(true);
  });

  it('detects insufficient evidence', () => {
    const grounds = detectDenialGrounds(NOID_TEXT);
    const insufficient = grounds.find(g => g.category === 'insufficient_evidence');
    expect(insufficient).toBeDefined();
    expect(insufficient!.severity).toBe('low');
  });

  it('detects public charge', () => {
    const grounds = detectDenialGrounds(NOID_PUBLIC_CHARGE);
    const pc = grounds.find(g => g.category === 'public_charge');
    expect(pc).toBeDefined();
    expect(pc!.statutoryBasis).toContain('212(a)(4)');
  });

  it('assigns recommendations based on severity', () => {
    const grounds = detectDenialGrounds(NOID_TEXT);
    const fraud = grounds.find(g => g.category === 'fraud_misrepresentation');
    expect(fraud!.recommendation).toBe('attorney_required');
  });
});

describe('NOID Procedural Analysis', () => {
  it('finds no procedural issues in well-formed NOID', () => {
    const issues = analyzeProceduralIssues(NOID_TEXT);
    expect(issues.length).toBe(0);
  });

  it('detects missing required language', () => {
    const issues = analyzeProceduralIssues('We are going to deny your application because of issues.');
    expect(issues.some(i => i.type === 'missing_required_language')).toBe(true);
  });

  it('detects missing deadline', () => {
    const issues = analyzeProceduralIssues('Notice of Intent to Deny. USCIS finds that the applicant is inadmissible.');
    expect(issues.some(i => i.type === 'missing_finding' && i.description.includes('deadline'))).toBe(true);
  });
});

describe('NOID Risk Assessment', () => {
  it('assesses critical risk when fraud is present', () => {
    const grounds = detectDenialGrounds(NOID_TEXT);
    expect(assessOverallRisk(grounds)).toBe('critical');
  });

  it('assesses low risk for insufficient evidence only', () => {
    const grounds = detectDenialGrounds(NOID_INSUFFICIENT);
    expect(assessOverallRisk(grounds)).toBe('low');
  });

  it('recommends attorney for high risk', () => {
    const grounds = detectDenialGrounds(NOID_TEXT);
    expect(shouldRecommendAttorney(grounds, 'critical')).toBe(true);
  });

  it('does not recommend attorney for low risk', () => {
    const grounds = detectDenialGrounds(NOID_INSUFFICIENT);
    expect(shouldRecommendAttorney(grounds, 'low')).toBe(false);
  });
});

describe('Full NOID Analysis', () => {
  it('analyzes a complete NOID', () => {
    const analysis = analyzeNOID(NOID_TEXT);
    expect(analysis.formType).toBe('I-485');
    expect(analysis.receiptNumber).toBe('MSC1234567890');
    expect(analysis.denialGrounds.length).toBeGreaterThanOrEqual(2);
    expect(analysis.overallRisk).toBe('critical');
    expect(analysis.hasAttorneyRecommendation).toBe(true);
    expect(analysis.summaryEn).toContain('I-485');
    expect(analysis.summaryEs).toBeDefined();
    expect(analysis.recommendedActions.length).toBeGreaterThan(0);
  });

  it('extracts deadline date', () => {
    const analysis = analyzeNOID(NOID_TEXT);
    expect(analysis.deadline).toBe('December 15, 2026');
  });

  it('extracts deadline days when no date', () => {
    const analysis = analyzeNOID(NOID_PUBLIC_CHARGE);
    expect(analysis.deadlineDays).toBe(33);
  });

  it('includes attorney recommendation in actions', () => {
    const analysis = analyzeNOID(NOID_TEXT);
    expect(analysis.recommendedActions[0]).toContain('attorney');
  });
});

describe('NOID Evidence Requirements', () => {
  it('builds evidence requirements for each ground', () => {
    const analysis = analyzeNOID(NOID_TEXT);
    const reqs = buildEvidenceRequirements(analysis.denialGrounds);
    expect(reqs.length).toBe(analysis.denialGrounds.length);
    for (const req of reqs) {
      expect(req.evidenceTypes.length).toBeGreaterThan(0);
      expect(req.sufficiency).toBe('unknown');
    }
  });

  it('includes specific evidence types for fraud', () => {
    const grounds = detectDenialGrounds(NOID_TEXT);
    const reqs = buildEvidenceRequirements(grounds);
    const fraudReq = reqs.find(r => r.groundCategory === 'fraud_misrepresentation');
    expect(fraudReq!.evidenceTypes).toContain('affidavits');
    expect(fraudReq!.evidenceTypes).toContain('original documents');
  });
});

describe('NOID Strategy', () => {
  it('builds combined strategy for substantive + procedural', () => {
    const analysis = analyzeNOID(NOID_TEXT);
    const strategy = buildNOIDStrategy(analysis);
    expect(strategy.steps.length).toBeGreaterThan(0);
    expect(strategy.attorneyRequired).toBe(true);
  });

  it('supplement strategy for insufficient evidence only', () => {
    const analysis = analyzeNOID(NOID_INSUFFICIENT);
    const strategy = buildNOIDStrategy(analysis);
    expect(['supplement', 'rebut'].includes(strategy.type)).toBe(true);
  });

  it('low success likelihood for critical risk', () => {
    const analysis = analyzeNOID(NOID_TEXT);
    const strategy = buildNOIDStrategy(analysis);
    expect(strategy.successLikelihood).toBe('low');
  });

  it('strategy steps address each ground', () => {
    const analysis = analyzeNOID(NOID_TEXT);
    const strategy = buildNOIDStrategy(analysis);
    for (const ground of analysis.denialGrounds) {
      expect(strategy.steps.some(s => s.addresses === ground.id)).toBe(true);
    }
  });
});
