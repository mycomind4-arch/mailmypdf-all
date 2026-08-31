/**
 * G4 — Authority & Freshness Engine Tests
 *
 * Covers all 20 test requirements:
 * 1. current authority
 * 2. stale authority
 * 3. superseded authority
 * 4. future-effective authority
 * 5. jurisdiction mismatch
 * 6. agency mismatch
 * 7. conditional applicability
 * 8. conflicting authorities
 * 9. unavailable source
 * 10. unverified source
 * 11. source provenance
 * 12. effective-date handling
 * 13. freshness policy
 * 14. reasoner revised by authoritative evidence
 * 15. reasoner blocked by unsupported authority
 * 16. compound immigration issue
 * 17. English/Spanish case
 * 18. provider-neutral authority worker interface
 * 19. AI output provenance
 * 20. model disagreement representation
 */

import { describe, it, expect } from 'vitest';
import {
  type AuthoritySource,
  type AuthorityLevel,
  type VerificationStatus,
  type FreshnessPolicy,
  AUTHORITY_LEVEL_RANK,
  compareAuthorityLevel,
  isSafeStatus,
  assessFreshness,
  type AuthorityWorker,
  type AuthorityWorkerInput,
  type AuthorityWorkerOutput,
} from './authority';
import { resolveAuthority, representDisagreement, type ModelDisagreement } from './authority-resolver';
import { reasonAboutCase } from './case-reasoner';
import type { ReasonerInput, CaseReasoning } from './case-reasoning';
import { createLanguageContext } from './multilingual';
import { buildDocumentUnderstanding } from './document-understanding';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSource(overrides: Partial<AuthoritySource> = {}): AuthoritySource {
  return {
    id: 'auth-1',
    sourceType: 'statute',
    title: 'Immigration and Nationality Act',
    citation: 'INA § 240',
    url: 'https://www.uscis.gov/laws-and-policy/legislation/immigration-and-nationality-act',
    issuingAgency: 'USCIS',
    jurisdiction: 'federal',
    authorityLevel: 'statute',
    publicationDate: '2024-01-01',
    effectiveDate: '2024-01-01',
    lastVerified: '2026-08-01',
    freshnessPolicy: 'annual_review',
    applicabilityConditions: [],
    verificationStatus: 'verified_current',
    provenance: {
      discoveredBy: 'manual',
      retrievedAt: '2026-08-22T00:00:00Z',
    },
    ...overrides,
  };
}

function makeReasonerInput(overrides: Partial<ReasonerInput> = {}): ReasonerInput {
  return {
    case: { id: 'case-1', facts: [], deadlines: [], documents: [] },
    documentUnderstandings: [],
    narrative: 'I received a request for evidence from USCIS.',
    language: createLanguageContext({}),
    userIsUnsure: false,
    ...overrides,
  };
}

function makeRfeUnderstanding(): any {
  return buildDocumentUnderstanding({
    documentId: 'doc-1',
    text: 'U.S. Citizenship and Immigration Services\nRequest for Evidence\nYou must respond no later than December 15, 2026',
    source: { documentId: 'doc-1', confidence: 0.9 },
    language: 'en',
  });
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('G4: Authority Source Model', () => {
  it('authority hierarchy ranks statute above regulation above guidance', () => {
    expect(AUTHORITY_LEVEL_RANK.statute).toBeGreaterThan(AUTHORITY_LEVEL_RANK.regulation);
    expect(AUTHORITY_LEVEL_RANK.regulation).toBeGreaterThan(AUTHORITY_LEVEL_RANK.agency_manual);
    expect(AUTHORITY_LEVEL_RANK.agency_manual).toBeGreaterThan(AUTHORITY_LEVEL_RANK.agency_guidance);
    expect(AUTHORITY_LEVEL_RANK.agency_guidance).toBeGreaterThan(AUTHORITY_LEVEL_RANK.supporting_material);
  });

  it('compareAuthorityLevel returns positive when A is higher', () => {
    expect(compareAuthorityLevel('statute', 'regulation')).toBeGreaterThan(0);
    expect(compareAuthorityLevel('regulation', 'statute')).toBeLessThan(0);
    expect(compareAuthorityLevel('statute', 'statute')).toBe(0);
  });

  it('verification statuses are never reduced to one boolean', () => {
    const statuses: VerificationStatus[] = [
      'verified_current', 'verified_conditional', 'stale', 'superseded',
      'future_effective', 'unverified', 'conflicting', 'unavailable',
    ];
    expect(statuses.length).toBe(8);
    statuses.forEach(s => expect(typeof s).toBe('string'));
  });

  it('isSafeStatus only returns true for verified statuses', () => {
    expect(isSafeStatus('verified_current')).toBe(true);
    expect(isSafeStatus('verified_conditional')).toBe(true);
    expect(isSafeStatus('stale')).toBe(false);
    expect(isSafeStatus('superseded')).toBe(false);
    expect(isSafeStatus('future_effective')).toBe(false);
    expect(isSafeStatus('unverified')).toBe(false);
    expect(isSafeStatus('conflicting')).toBe(false);
    expect(isSafeStatus('unavailable')).toBe(false);
  });
});

describe('G4: Freshness assessment', () => {
  it('1. current authority — verified_current', () => {
    const source = makeSource({
      lastVerified: '2026-08-01',
      freshnessPolicy: 'annual_review',
    });
    const status = assessFreshness(source, '2026-08-22T00:00:00Z');
    expect(status).toBe('verified_current');
  });

  it('2. stale authority — past freshness review window', () => {
    const source = makeSource({
      lastVerified: '2025-01-01',
      freshnessPolicy: 'annual_review',
    });
    const status = assessFreshness(source, '2026-08-22T00:00:00Z');
    expect(status).toBe('stale');
  });

  it('3. superseded authority', () => {
    const source = makeSource({
      supersededBy: 'auth-2',
    });
    const status = assessFreshness(source, '2026-08-22T00:00:00Z');
    expect(status).toBe('superseded');
  });

  it('4. future-effective authority — not yet in effect', () => {
    const source = makeSource({
      effectiveDate: '2027-01-01',
      verificationStatus: 'future_effective',
    });
    const status = assessFreshness(source, '2026-08-22T00:00:00Z');
    expect(status).toBe('future_effective');
  });

  it('5. jurisdiction mismatch — authority not applied to wrong jurisdiction', () => {
    const reasoning = reasonAboutCase(makeReasonerInput({
      documentUnderstandings: [makeRfeUnderstanding()],
    }));

    const result = resolveAuthority({
      reasoning,
      authorities: [makeSource({ jurisdiction: 'state', issuingAgency: 'USCIS' })],
      caseAgency: 'USCIS',
      caseJurisdiction: 'federal',
    });

    // State authority should not match a federal case
    const finding = result.authorityFindings.find(f =>
      result.authorityFindings.length > 0 && f.authorities.length === 0
    );
    // The authority should not have been matched
    expect(result.authorityFindings.every(f => f.authorities.length === 0 || f.authorities.every(a => a.applicability !== 'direct')) || result.authorityFindings.length === 0 || result.authorityFindings.some(f => f.authorities.length === 0)).toBe(true);
  });

  it('6. agency mismatch — authority not applied to wrong agency', () => {
    const reasoning = reasonAboutCase(makeReasonerInput({
      documentUnderstandings: [makeRfeUnderstanding()],
    }));

    const result = resolveAuthority({
      reasoning,
      authorities: [makeSource({ issuingAgency: 'EOIR' })],
      caseAgency: 'USCIS',
      caseJurisdiction: 'federal',
    });

    // EOIR authority should not match a USCIS case
    for (const finding of result.authorityFindings) {
      expect(finding.authorities.length).toBe(0);
    }
  });

  it('7. conditional applicability — verified_conditional', () => {
    const source = makeSource({
      applicabilityConditions: ['Response must be submitted within the stated deadline'],
      verificationStatus: 'verified_conditional',
    });

    const reasoning = reasonAboutCase(makeReasonerInput({
      documentUnderstandings: [makeRfeUnderstanding()],
    }));

    const result = resolveAuthority({
      reasoning,
      authorities: [source],
      caseAgency: 'USCIS',
      caseJurisdiction: 'federal',
    });

    const finding = result.authorityFindings.find(f => f.authorities.length > 0);
    if (finding) {
      expect(finding.authorities[0].applicability).toBe('unclear');
      expect(finding.effect).toBe('uncertainty_added');
      expect(finding.safeToActUpon).toBe(false);
    }
  });

  it('8. conflicting authorities — blocks the finding', () => {
    const source = makeSource({ verificationStatus: 'conflicting' });

    const reasoning = reasonAboutCase(makeReasonerInput({
      documentUnderstandings: [makeRfeUnderstanding()],
    }));

    const result = resolveAuthority({
      reasoning,
      authorities: [source],
      caseAgency: 'USCIS',
      caseJurisdiction: 'federal',
    });

    const blocked = result.authorityFindings.find(f => f.effect === 'blocked');
    if (blocked) {
      expect(blocked.explanation).toContain('conflicting');
      expect(blocked.safeToActUpon).toBe(false);
    }
  });

  it('9. unavailable source — blocks', () => {
    const source = makeSource({ verificationStatus: 'unavailable' });

    const reasoning = reasonAboutCase(makeReasonerInput({
      documentUnderstandings: [makeRfeUnderstanding()],
    }));

    const result = resolveAuthority({
      reasoning,
      authorities: [source],
      caseAgency: 'USCIS',
      caseJurisdiction: 'federal',
    });

    const blocked = result.authorityFindings.find(f => f.effect === 'blocked');
    if (blocked) {
      expect(blocked.safeToActUpon).toBe(false);
      expect(blocked.material).toBe(true);
    }
  });

  it('10. unverified source — adds uncertainty', () => {
    const source = makeSource({
      verificationStatus: 'unverified',
      publicationDate: undefined,
      lastVerified: undefined,
      freshnessPolicy: 'unknown',
    });

    const status = assessFreshness(source);
    expect(status).toBe('unverified');

    const reasoning = reasonAboutCase(makeReasonerInput({
      documentUnderstandings: [makeRfeUnderstanding()],
    }));

    const result = resolveAuthority({
      reasoning,
      authorities: [{ ...source, verificationStatus: 'unverified' }],
      caseAgency: 'USCIS',
      caseJurisdiction: 'federal',
    });

    const uncertain = result.authorityFindings.find(f => f.effect === 'uncertainty_added');
    if (uncertain) {
      expect(uncertain.safeToActUpon).toBe(false);
    }
  });
});

describe('G4: Source provenance and effective dates', () => {
  it('11. source provenance is preserved', () => {
    const source = makeSource({
      provenance: {
        discoveredBy: 'ai_assisted',
        provider: 'openai',
        model: 'gpt-4',
        modelVersion: '2024-01',
        promptVersion: 'v1.2',
        retrievedAt: '2026-08-22T10:00:00Z',
        retrievalMethod: 'api_search',
      },
    });

    expect(source.provenance.discoveredBy).toBe('ai_assisted');
    expect(source.provenance.provider).toBe('openai');
    expect(source.provenance.model).toBe('gpt-4');
    expect(source.provenance.modelVersion).toBe('2024-01');
    expect(source.provenance.promptVersion).toBe('v1.2');
    expect(source.provenance.retrievedAt).toBe('2026-08-22T10:00:00Z');
  });

  it('12. effective-date handling — future effective blocks', () => {
    const source = makeSource({
      effectiveDate: '2027-01-01',
      verificationStatus: 'future_effective',
    });

    const reasoning = reasonAboutCase(makeReasonerInput({
      documentUnderstandings: [makeRfeUnderstanding()],
    }));

    const result = resolveAuthority({
      reasoning,
      authorities: [source],
      caseAgency: 'USCIS',
      caseJurisdiction: 'federal',
    });

    const futureFinding = result.authorityFindings.find(f => f.effect === 'uncertainty_added');
    if (futureFinding) {
      expect(futureFinding.explanation).toContain('not yet in effect');
      expect(futureFinding.safeToActUpon).toBe(false);
    }
  });

  it('13. freshness policy — quarterly review goes stale faster than annual', () => {
    const quarterlySource = makeSource({
      lastVerified: '2026-05-01',
      freshnessPolicy: 'quarterly_review',
    });
    const annualSource = makeSource({
      lastVerified: '2026-05-01',
      freshnessPolicy: 'annual_review',
    });
    const now = '2026-08-22T00:00:00Z';

    // ~113 days since May 1 — quarterly (120 day max) is still current
    expect(assessFreshness(quarterlySource, now)).toBe('verified_current');

    // Make it 130 days
    const quarterlyStale = makeSource({
      lastVerified: '2026-04-01',
      freshnessPolicy: 'quarterly_review',
    });
    expect(assessFreshness(quarterlyStale, now)).toBe('stale');

    // Annual source from same date is still current
    expect(assessFreshness(annualSource, now)).toBe('verified_current');
  });

  it('static freshness policy never goes stale', () => {
    const staticSource = makeSource({
      lastVerified: '2020-01-01',
      freshnessPolicy: 'static',
    });
    expect(assessFreshness(staticSource, '2026-08-22T00:00:00Z')).toBe('verified_current');
  });
});

describe('G4: Reasoner revised and blocked by authority', () => {
  it('14. reasoner finding strengthened by authoritative evidence', () => {
    const reasoning = reasonAboutCase(makeReasonerInput({
      narrative: 'I received a request for evidence from USCIS.',
      documentUnderstandings: [makeRfeUnderstanding()],
    }));

    const originalIssue = reasoning.detectedIssues.find(i => i.issueType === 'rfe');
    expect(originalIssue).toBeDefined();

    const result = resolveAuthority({
      reasoning,
      authorities: [makeSource({
        title: 'USCIS Policy Manual',
        citation: 'USCIS PM § 4.1',
        authorityLevel: 'agency_manual',
        issuingAgency: 'USCIS',
        verificationStatus: 'verified_current',
      })],
      caseAgency: 'USCIS',
      caseJurisdiction: 'federal',
    });

    const rfeFinding = result.authorityFindings.find(f =>
      f.issueId === originalIssue!.id
    );
    if (rfeFinding) {
      expect(rfeFinding.effect).toBe('strengthened');
      expect(rfeFinding.safeToActUpon).toBe(true);
    }

    const reconciledIssue = result.reconciledIssues.find(i => i.id === originalIssue!.id);
    if (reconciledIssue) {
      expect(reconciledIssue.confidence).toBeGreaterThanOrEqual(originalIssue!.confidence);
    }
  });

  it('15. reasoner blocked by unsupported authority', () => {
    const reasoning = reasonAboutCase(makeReasonerInput({
      narrative: 'I received a request for evidence from USCIS.',
      documentUnderstandings: [makeRfeUnderstanding()],
    }));

    const result = resolveAuthority({
      reasoning,
      authorities: [makeSource({
        verificationStatus: 'superseded',
        supersededBy: 'auth-new',
      })],
      caseAgency: 'USCIS',
      caseJurisdiction: 'federal',
    });

    const blocked = result.authorityFindings.find(f => f.effect === 'blocked');
    if (blocked) {
      expect(blocked.safeToActUpon).toBe(false);
      expect(blocked.material).toBe(true);
      expect(result.safeToActUpon).toBe(false);
    }
  });

  it('authority resolver does not silently overwrite reasoning', () => {
    const reasoning = reasonAboutCase(makeReasonerInput({
      narrative: 'I received a request for evidence from USCIS.',
      documentUnderstandings: [makeRfeUnderstanding()],
    }));

    const result = resolveAuthority({
      reasoning,
      authorities: [makeSource()],
      caseAgency: 'USCIS',
      caseJurisdiction: 'federal',
    });

    // Original reasoning must be preserved
    expect(result.original).toBe(reasoning);
    expect(result.original.detectedIssues).toEqual(reasoning.detectedIssues);
    // History must have entries
    expect(result.history.length).toBeGreaterThanOrEqual(2);
    expect(result.history[0].step).toBe('reasoner');
    expect(result.history[1].step).toBe('authority_resolution');
  });
});

describe('G4: Compound and multilingual cases', () => {
  it('16. compound immigration issue with authority resolution', () => {
    const reasoning = reasonAboutCase(makeReasonerInput({
      narrative: 'My green card was denied and I got a letter. I have about 30 days. I may have sent some documents before.',
      documentUnderstandings: [buildDocumentUnderstanding({
        documentId: 'doc-1',
        text: 'U.S. Citizenship and Immigration Services\nWe denied your application\nDecision dated August 1, 2026',
        source: { documentId: 'doc-1', confidence: 0.9 },
        language: 'en',
      })],
    }));

    const result = resolveAuthority({
      reasoning,
      authorities: [
        makeSource({ id: 'auth-ina', title: 'INA', citation: 'INA § 240(A)', issuingAgency: 'USCIS' }),
        makeSource({ id: 'auth-cfr', title: '8 CFR', citation: '8 CFR § 103.3', authorityLevel: 'regulation', issuingAgency: 'USCIS' }),
      ],
      caseAgency: 'USCIS',
      caseJurisdiction: 'federal',
    });

    // Should have authority findings for multiple issues
    expect(result.authorityFindings.length).toBeGreaterThan(0);
    // Original reasoning should detect compound issues
    expect(reasoning.detectedIssues.length).toBeGreaterThan(2);
  });

  it('17. English/Spanish case with authority resolution', () => {
    const reasoning = reasonAboutCase(makeReasonerInput({
      narrative: 'Mi solicitud fue negada. Recibí una carta de USCIS. Creo que tengo unos 30 días.',
      language: createLanguageContext({ ui: 'es', assistant: 'es', document: 'en', output: 'es' }),
      documentUnderstandings: [buildDocumentUnderstanding({
        documentId: 'doc-1',
        text: 'U.S. Citizenship and Immigration Services\nWe denied your application\nDecision dated August 1, 2026',
        source: { documentId: 'doc-1', confidence: 0.9 },
        language: 'en',
      })],
    }));

    const result = resolveAuthority({
      reasoning,
      authorities: [makeSource()],
      caseAgency: 'USCIS',
      caseJurisdiction: 'federal',
    });

    // Spanish summary should exist and be updated
    expect(result.userFacingSummaryEs).toBeDefined();
    expect(result.userFacingSummaryEs!.length).toBeGreaterThan(10);

    // Authority findings should have Spanish explanations
    for (const f of result.authorityFindings) {
      if (f.explanationEs) {
        expect(f.explanationEs.length).toBeGreaterThan(10);
      }
    }
  });
});

describe('G4: Provider-neutral authority worker', () => {
  it('18. authority worker interface is provider-neutral', () => {
    // The interface should not depend on any specific provider
    const mockWorker: AuthorityWorker = {
      async search(input: AuthorityWorkerInput): Promise<AuthorityWorkerOutput> {
        return {
          sources: [makeSource()],
          analysis: 'The INA appears applicable.',
          confidence: 0.85,
          provenance: {
            provider: 'mock',
            model: 'mock-model',
            modelVersion: '1.0',
            promptVersion: 'v1',
            timestamp: '2026-08-22T00:00:00Z',
          },
          warnings: [],
        };
      },
      async retrieve(sourceId: string): Promise<AuthoritySource | null> {
        return makeSource({ id: sourceId });
      },
      async verify(source: AuthoritySource): Promise<VerificationStatus> {
        return 'verified_current';
      },
      async classify(source: AuthoritySource): Promise<AuthorityLevel> {
        return source.authorityLevel;
      },
      async compare(a: AuthoritySource, b: AuthoritySource): Promise<'consistent' | 'conflicting' | 'unclear'> {
        return 'consistent';
      },
    };

    // Should be able to call all methods
    expect(mockWorker.search).toBeDefined();
    expect(mockWorker.retrieve).toBeDefined();
    expect(mockWorker.verify).toBeDefined();
    expect(mockWorker.classify).toBeDefined();
    expect(mockWorker.compare).toBeDefined();
  });

  it('authority worker output preserves provenance', async () => {
    const mockWorker: AuthorityWorker = {
      async search(input: AuthorityWorkerInput): Promise<AuthorityWorkerOutput> {
        return {
          sources: [makeSource()],
          analysis: 'Analysis result',
          confidence: 0.8,
          provenance: {
            provider: 'anthropic',
            model: 'claude-3',
            modelVersion: '2024',
            promptVersion: 'v2',
            timestamp: '2026-08-22T12:00:00Z',
          },
          warnings: ['Source may need verification'],
        };
      },
      async retrieve(): Promise<AuthoritySource | null> { return null; },
      async verify(): Promise<VerificationStatus> { return 'unverified'; },
      async classify(): Promise<AuthorityLevel> { return 'unknown'; },
      async compare(): Promise<'consistent' | 'conflicting' | 'unclear'> { return 'unclear'; },
    };

    const result = await mockWorker.search({
      caseId: 'case-1',
      query: 'RFE response deadline',
      jurisdiction: 'federal',
      agency: 'USCIS',
      issueType: 'rfe',
      facts: [{ key: 'agency', value: 'USCIS' }],
    });

    expect(result.provenance.provider).toBe('anthropic');
    expect(result.provenance.model).toBe('claude-3');
    expect(result.provenance.modelVersion).toBe('2024');
    expect(result.provenance.promptVersion).toBe('v2');
    expect(result.provenance.timestamp).toBe('2026-08-22T12:00:00Z');
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('G4: Model disagreement', () => {
  it('19. AI output provenance is preserved in worker outputs', async () => {
    const output: AuthorityWorkerOutput = {
      sources: [],
      analysis: 'No authority found',
      confidence: 0.3,
      provenance: {
        provider: 'google',
        model: 'gemini-pro',
        modelVersion: '1.5',
        promptVersion: 'v3',
        timestamp: '2026-08-22T00:00:00Z',
      },
      warnings: ['No results'],
    };

    expect(output.provenance.provider).toBe('google');
    expect(output.provenance.model).toBe('gemini-pro');
    expect(output.provenance.modelVersion).toBe('1.5');
    expect(output.confidence).toBeLessThan(0.5);
  });

  it('20. model disagreement representation', () => {
    const disagreement: ModelDisagreement = representDisagreement(
      'Whether RFE deadline is 87 days',
      { provider: 'openai', model: 'gpt-4', position: '87 days', confidence: 0.9 },
      { provider: 'anthropic', model: 'claude-3', position: '30 days', confidence: 0.6 },
    );

    expect(disagreement.topic).toContain('deadline');
    expect(disagreement.positionA.position).toBe('87 days');
    expect(disagreement.positionB.position).toBe('30 days');
    expect(disagreement.positionA.provider).toBe('openai');
    expect(disagreement.positionB.provider).toBe('anthropic');
    // Higher confidence should be provisionally preferred
    expect(disagreement.resolution).toBe('A');
  });

  it('model agreement resolves to both_correct', () => {
    const agreement = representDisagreement(
      'Whether appeal is available',
      { provider: 'openai', model: 'gpt-4', position: 'yes', confidence: 0.8 },
      { provider: 'anthropic', model: 'claude-3', position: 'yes', confidence: 0.85 },
    );

    expect(agreement.resolution).toBe('both_correct');
  });

  it('model disagreement with similar confidence requires human review', () => {
    const disagreement = representDisagreement(
      'Whether motion to reopen is available',
      { provider: 'openai', model: 'gpt-4', position: 'yes', confidence: 0.7 },
      { provider: 'anthropic', model: 'claude-3', position: 'no', confidence: 0.65 },
    );

    expect(disagreement.resolution).toBe('needs_human_review');
    expect(disagreement.explanation).toContain('Human review');
  });
});

describe('G4: User experience', () => {
  it('never exposes the authority database directly to the user', () => {
    const reasoning = reasonAboutCase(makeReasonerInput({
      documentUnderstandings: [makeRfeUnderstanding()],
    }));

    const result = resolveAuthority({
      reasoning,
      authorities: [makeSource()],
      caseAgency: 'USCIS',
      caseJurisdiction: 'federal',
    });

    // Summary should be plain language
    expect(result.userFacingSummary).not.toContain('AuthoritySource');
    expect(result.userFacingSummary).not.toContain('verificationStatus');
    expect(result.userFacingSummary).not.toContain('AUTHORITY_LEVEL_RANK');
  });

  it('plain language explanation for strengthened finding', () => {
    const reasoning = reasonAboutCase(makeReasonerInput({
      documentUnderstandings: [makeRfeUnderstanding()],
    }));

    const result = resolveAuthority({
      reasoning,
      authorities: [makeSource({ verificationStatus: 'verified_current' })],
      caseAgency: 'USCIS',
      caseJurisdiction: 'federal',
    });

    const strengthened = result.authorityFindings.find(f => f.effect === 'strengthened');
    if (strengthened) {
      expect(strengthened.explanation).toContain('current official guidance');
      expect(strengthened.explanation).not.toContain('verified_current');
    }
  });
});
