import { beforeEach, describe, expect, it } from 'vitest';
import { identifyJurisdiction } from '../domain/jurisdiction';
import {
  HUMBOLDT_FAIRPROCESS_PACK,
  buildAttorneyPacketManifest,
  clearJurisdictionPacksForTests,
  ensureFairProcessJurisdictions,
  resolveFairProcessPackForJurisdiction,
  resolveJurisdictionPack,
  type AttorneyPacketInput,
} from './index';

function completePacketInput(): AttorneyPacketInput {
  const notice = {
    evidenceId: 'evidence-notice-1',
    label: 'County notice',
    page: 1,
    sha256: 'abc123',
  };

  return {
    caseId: 'case-1',
    caseName: 'Property code enforcement matter',
    caseNumber: 'CE-2026-0001',
    generatedAt: '2026-09-07T22:00:00-07:00',
    jurisdiction: HUMBOLDT_FAIRPROCESS_PACK,
    property: {
      address: '123 Example Rd, McKinleyville, CA',
      apn: '000-000-000',
    },
    proceduralPosture: 'Inspection request received; owner response under preparation.',
    nextDeadline: '2026-09-15',
    evidence: [notice],
    facts: [
      {
        id: 'fact-1',
        statement: 'The county sent an inspection request.',
        status: 'agency_assertion',
        sourceRefs: [notice],
      },
    ],
    timeline: [
      {
        id: 'event-1',
        date: '2026-09-01',
        title: 'Inspection request received',
        description: 'Owner received county correspondence.',
        sourceRefs: [notice],
      },
    ],
    allegations: [
      {
        id: 'allegation-1',
        allegation: 'Unpermitted structure',
        status: 'unknown',
        supportingEvidence: [notice],
        contraryEvidence: [],
        missingEvidence: ['Permit history', 'inspection evidence'],
      },
    ],
    findings: [],
  };
}

describe('FairProcess jurisdiction registry', () => {
  beforeEach(() => clearJurisdictionPacksForTests());

  it('resolves the Humboldt pack from an identified McKinleyville jurisdiction', () => {
    const jurisdiction = identifyJurisdiction({ locationName: 'McKinleyville' });
    const pack = resolveFairProcessPackForJurisdiction(jurisdiction);

    expect(pack?.id).toBe('us-ca-humboldt');
    expect(pack?.policy.status).toBe('legal_review_required');
    expect(pack?.allowJurisdictionSpecificLegalConclusions).toBe(false);
  });

  it('does not select Humboldt merely because the state is California', () => {
    ensureFairProcessJurisdictions();
    expect(resolveJurisdictionPack({ state: 'California' })).toBeUndefined();
  });

  it('does not select Humboldt for a different county', () => {
    ensureFairProcessJurisdictions();
    expect(resolveJurisdictionPack({ state: 'California', county: 'Sonoma' })).toBeUndefined();
  });
});

describe('FairProcess attorney packet', () => {
  it('builds a sourced, attorney-handoff-ready manifest', () => {
    const manifest = buildAttorneyPacketManifest(completePacketInput());

    expect(manifest.packetType).toBe('fairprocess-attorney-handoff');
    expect(manifest.readiness.readyForAttorneyHandoff).toBe(true);
    expect(manifest.readiness.score).toBeGreaterThanOrEqual(70);
    expect(manifest.sourceEvidenceIds).toEqual(['evidence-notice-1']);
    expect(manifest.sections.find((section) => section.id === 'allegation_matrix')?.ready).toBe(true);
    expect(manifest.disclaimers.some((value) => value.includes('acted unlawfully'))).toBe(true);
  });

  it('blocks handoff when property identity, evidence, and chronology are missing', () => {
    const input = completePacketInput();
    input.property = undefined;
    input.evidence = [];
    input.timeline = [];
    input.facts = [];
    input.allegations = [];
    input.nextDeadline = undefined;

    const manifest = buildAttorneyPacketManifest(input);

    expect(manifest.readiness.readyForAttorneyHandoff).toBe(false);
    expect(manifest.readiness.blockingIssues.length).toBeGreaterThanOrEqual(3);
    expect(manifest.readiness.score).toBeLessThan(70);
  });

  it('flags findings backed by an unreviewed jurisdiction policy pack', () => {
    const input = completePacketInput();
    input.findings = [
      {
        id: 'finding-1',
        title: 'Timing question',
        detail: 'Counsel should verify the controlling notice period.',
        severity: 'high',
        status: 'open',
        sourceRefs: input.evidence,
        policyStatus: 'legal_review_required',
        counselReviewRequired: true,
      },
    ];

    const manifest = buildAttorneyPacketManifest(input);

    expect(manifest.readiness.warnings.some((value) => value.includes('requires legal review'))).toBe(true);
    expect(manifest.sections.find((section) => section.id === 'counsel_review')?.itemCount).toBe(1);
  });
});
