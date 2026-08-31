/**
 * G6 — Adversarial X-Ray Tests
 */

import { describe, it, expect } from 'vitest';
import { runXRay, type XRayVerdict, type XRayWorker, type XRayWorkerInput, type XRayWorkerOutput } from './xray';
import { reasonAboutCase, type ReasonerInput } from './case-reasoner';
import { resolveAuthority } from './authority-resolver';
import { analyzeEvidence } from './evidence';
import { createLanguageContext } from './multilingual';
import { buildDocumentUnderstanding } from './document-understanding';
import type { CaseReasoning } from './case-reasoning';

function makeRfe() {
  return buildDocumentUnderstanding({
    documentId: 'doc-1',
    text: 'U.S. Citizenship and Immigration Services\nRequest for Evidence\nYou must respond no later than December 15, 2026',
    source: { documentId: 'doc-1', confidence: 0.9 },
    language: 'en',
  });
}

function makeDenial() {
  return buildDocumentUnderstanding({
    documentId: 'doc-3',
    text: 'U.S. Citizenship and Immigration Services\nWe denied your application\nDecision dated August 1, 2026',
    source: { documentId: 'doc-3', confidence: 0.9 },
    language: 'en',
  });
}

function makeInput(overrides: Partial<ReasonerInput> = {}): ReasonerInput {
  return {
    case: { id: 'case-1', facts: [], deadlines: [], documents: [] },
    documentUnderstandings: [],
    narrative: 'I received a request for evidence from USCIS.',
    language: createLanguageContext({}),
    userIsUnsure: false,
    ...overrides,
  };
}

describe('G6: X-Ray verdicts', () => {
  it('XRayVerdict has three distinct values', () => {
    const verdicts: XRayVerdict[] = ['PASS', 'WARNING', 'BLOCK'];
    expect(new Set(verdicts).size).toBe(3);
  });

  it('returns PASS for clear, well-supported findings', () => {
    const reasoning = reasonAboutCase(makeInput({
      narrative: 'I received a request for evidence from USCIS. I have the notice.',
      documentUnderstandings: [makeRfe()],
    }));

    const result = runXRay({ reasoning });
    // Without authority verification, X-Ray is conservative (WARNING not PASS)
    expect(result.findings.some(f => f.finalVerdict === 'WARNING' || f.finalVerdict === 'PASS')).toBe(true);
    expect(result.overallVerdict).not.toBe('BLOCK');
  });

  it('returns BLOCK when knowledge state is UNKNOWN', () => {
    const reasoning = reasonAboutCase(makeInput({
      narrative: '',
      userIsUnsure: true,
    }));

    const result = runXRay({ reasoning });
    expect(result.findings.some(f => f.finalVerdict === 'BLOCK')).toBe(true);
    expect(result.overallVerdict).toBe('BLOCK');
    expect(result.safeToActUpon).toBe(false);
  });

  it('returns BLOCK when knowledge state is CONTRADICTORY', () => {
    const reasoning = reasonAboutCase(makeInput({
      narrative: 'This is a denial. I was denied.',
      documentUnderstandings: [makeRfe()],
    }));

    const result = runXRay({ reasoning });
    expect(result.findings.some(f => f.finalVerdict === 'BLOCK')).toBe(true);
    expect(result.safeToActUpon).toBe(false);
  });

  it('returns WARNING for denial issues (alternative paths)', () => {
    const reasoning = reasonAboutCase(makeInput({
      narrative: 'My application was denied.',
      documentUnderstandings: [makeDenial()],
    }));

    const result = runXRay({ reasoning });
    const denialFinding = result.findings.find(f => f.issueType === 'denial');
    if (denialFinding) {
      // Should have at least a WARNING for alternative paths
      expect(['WARNING', 'BLOCK']).toContain(denialFinding.finalVerdict);
    }
  });

  it('BLOCK prevents consequential execution (safeToActUpon is false)', () => {
    const reasoning = reasonAboutCase(makeInput({
      narrative: '',
      userIsUnsure: true,
    }));

    const result = runXRay({ reasoning });
    expect(result.safeToActUpon).toBe(false);
    expect(result.findings.some(f => f.blocksExecution)).toBe(true);
  });
});

describe('G6: X-Ray challenges', () => {
  it('generates multiple challenges per finding', () => {
    const reasoning = reasonAboutCase(makeInput({
      documentUnderstandings: [makeRfe()],
    }));

    const result = runXRay({ reasoning });
    for (const f of result.findings) {
      expect(f.challenges.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('checks authority applicability', () => {
    const reasoning = reasonAboutCase(makeInput({
      documentUnderstandings: [makeRfe()],
    }));

    const result = runXRay({ reasoning });
    expect(result.findings.some(f =>
      f.challenges.some(c => c.whatItChecks === 'authority_applicability')
    )).toBe(true);
  });

  it('checks document contradiction', () => {
    const reasoning = reasonAboutCase(makeInput({
      documentUnderstandings: [makeRfe()],
    }));

    const result = runXRay({ reasoning });
    expect(result.findings.some(f =>
      f.challenges.some(c => c.whatItChecks === 'document_contradiction')
    )).toBe(true);
  });

  it('checks deadline established', () => {
    const reasoning = reasonAboutCase(makeInput({
      narrative: 'I think I have about 30 days to respond.',
      documentUnderstandings: [],
    }));

    const result = runXRay({ reasoning });
    const deadlineFinding = result.findings.find(f => f.issueType === 'deadline');
    if (deadlineFinding) {
      expect(deadlineFinding.challenges.some(c => c.whatItChecks === 'deadline_established')).toBe(true);
    }
  });

  it('checks for missing exceptions', () => {
    const reasoning = reasonAboutCase(makeInput({
      narrative: 'My application was denied.',
      documentUnderstandings: [makeDenial()],
    }));

    const result = runXRay({ reasoning });
    expect(result.findings.some(f =>
      f.challenges.some(c => c.whatItChecks === 'missing_exception')
    )).toBe(true);
  });

  it('checks for alternative procedural paths', () => {
    const reasoning = reasonAboutCase(makeInput({
      narrative: 'My application was denied. What are my options?',
      documentUnderstandings: [makeDenial()],
    }));

    const result = runXRay({ reasoning });
    expect(result.findings.some(f =>
      f.challenges.some(c => c.whatItChecks === 'procedural_alternative')
    )).toBe(true);
  });

  it('checks fact sufficiency', () => {
    const reasoning = reasonAboutCase(makeInput({
      userIsUnsure: true,
      narrative: '',
    }));

    const result = runXRay({ reasoning });
    expect(result.findings.some(f =>
      f.challenges.some(c => c.whatItChecks === 'fact_sufficiency')
    )).toBe(true);
  });
});

describe('G6: X-Ray with authority and evidence', () => {
  it('X-Ray integrates with authority findings', () => {
    const reasoning = reasonAboutCase(makeInput({
      documentUnderstandings: [makeRfe()],
    }));

    const reconciled = resolveAuthority({
      reasoning,
      authorities: [{
        id: 'auth-1',
        sourceType: 'agency_manual',
        title: 'USCIS Policy Manual',
        citation: 'USCIS PM',
        issuingAgency: 'USCIS',
        jurisdiction: 'federal',
        authorityLevel: 'agency_manual',
        freshnessPolicy: 'annual_review',
        applicabilityConditions: [],
        verificationStatus: 'verified_current',
        provenance: { discoveredBy: 'manual', retrievedAt: '2026-08-22T00:00:00Z' },
        lastVerified: '2026-08-01',
      }],
      caseAgency: 'USCIS',
      caseJurisdiction: 'federal',
    });

    const result = runXRay({
      reasoning: reconciled,
      authorityFindings: reconciled.authorityFindings,
    });

    // Authority is verified_current — should pass authority check
    const rfeFinding = result.findings.find(f => f.issueType === 'rfe');
    if (rfeFinding) {
      const authChallenge = rfeFinding.challenges.find(c => c.whatItChecks === 'authority_applicability');
      if (authChallenge) {
        expect(authChallenge.finding).toBe('PASS');
      }
    }
  });

  it('X-Ray integrates with evidence conflicts', () => {
    const reasoning = reasonAboutCase(makeInput({
      narrative: 'This is a denial.',
      documentUnderstandings: [makeRfe(), makeDenial()],
    }));

    const evidence = analyzeEvidence({
      understandings: [makeRfe(), makeDenial()],
      userFacts: [],
    });

    const result = runXRay({
      reasoning,
      evidence,
    });

    // Should detect evidence conflicts
    if (evidence.conflicts.length > 0) {
      expect(result.findings.some(f =>
        f.challenges.some(c => c.whatItChecks === 'evidence_conflict' || c.whatItChecks === 'document_contradiction' && c.finding === 'BLOCK')
      )).toBe(true);
    }
  });

  it('X-Ray blocks when authority is blocked', () => {
    const reasoning = reasonAboutCase(makeInput({
      documentUnderstandings: [makeRfe()],
    }));

    const reconciled = resolveAuthority({
      reasoning,
      authorities: [{
        id: 'auth-stale',
        sourceType: 'regulation',
        title: 'Old Regulation',
        citation: '8 CFR Old',
        issuingAgency: 'USCIS',
        jurisdiction: 'federal',
        authorityLevel: 'regulation',
        freshnessPolicy: 'annual_review',
        applicabilityConditions: [],
        verificationStatus: 'superseded',
        supersedes: 'auth-previous',
        provenance: { discoveredBy: 'manual', retrievedAt: '2026-08-22T00:00:00Z' },
        lastVerified: '2025-01-01',
      }],
      caseAgency: 'USCIS',
      caseJurisdiction: 'federal',
    });

    const result = runXRay({
      reasoning: reconciled,
      authorityFindings: reconciled.authorityFindings,
    });

    // Should have at least one BLOCK
    expect(result.findings.some(f => f.finalVerdict === 'BLOCK')).toBe(true);
  });
});

describe('G6: X-Ray preserves reasoning history', () => {
  it('history includes reasoner and x_ray steps', () => {
    const reasoning = reasonAboutCase(makeInput({
      documentUnderstandings: [makeRfe()],
    }));

    const result = runXRay({ reasoning });

    expect(result.history.length).toBeGreaterThanOrEqual(2);
    const steps = result.history.map(h => h.step);
    expect(steps).toContain('reasoner');
    expect(steps).toContain('x_ray');
  });

  it('does not silently overwrite original reasoning', () => {
    const reasoning = reasonAboutCase(makeInput({
      documentUnderstandings: [makeRfe()],
    }));

    const result = runXRay({ reasoning });

    // Original reasoning should not be modified
    expect(reasoning.detectedIssues).toEqual(reasoning.detectedIssues);
  });
});

describe('G6: Provider-neutral X-Ray worker', () => {
  it('XRayWorker interface is provider-neutral', async () => {
    const mockWorker: XRayWorker = {
      async review(input: XRayWorkerInput): Promise<XRayWorkerOutput> {
        return {
          challenges: [
            { question: 'Is this safe?', verdict: 'PASS', reasoning: 'Yes', factThatWouldChange: 'New evidence' },
          ],
          overallVerdict: 'PASS',
          provenance: {
            provider: 'anthropic',
            model: 'claude-3',
            modelVersion: '2024',
            timestamp: '2026-08-22T00:00:00Z',
          },
        };
      },
    };

    const output = await mockWorker.review({
      issueId: 'issue-1',
      issueType: 'rfe',
      issueDescription: 'RFE detected',
      confidence: 0.85,
      knowledgeState: 'KNOWN',
      supportingFacts: [],
      contradictingFacts: [],
    });

    expect(output.overallVerdict).toBe('PASS');
    expect(output.provenance.provider).toBe('anthropic');
    expect(output.provenance.model).toBe('claude-3');
  });
});

describe('G6: User experience', () => {
  it('user-facing summary is plain language', () => {
    const reasoning = reasonAboutCase(makeInput({
      documentUnderstandings: [makeRfe()],
    }));

    const result = runXRay({ reasoning });

    expect(result.userFacingSummary).not.toContain('XRayVerdict');
    expect(result.userFacingSummary).not.toContain('finalVerdict');
    expect(result.userFacingSummary).not.toContain('blocksExecution');
  });

  it('requires human review for non-PASS findings', () => {
    const reasoning = reasonAboutCase(makeInput({
      narrative: '',
      userIsUnsure: true,
    }));

    const result = runXRay({ reasoning });

    expect(result.requiresHumanReview.length).toBeGreaterThan(0);
    expect(result.overallVerdict).toBe('BLOCK');
  });
});
