import { describe, expect, it } from 'vitest';
import type { InvestigationState } from '../investigation/types';
import {
  HUMBOLDT_FAIRPROCESS_PACK,
  buildAttorneyPacketManifest,
  investigationToAttorneyPacketInput,
} from './index';

function investigationFixture(): InvestigationState {
  return {
    id: 'investigation-1',
    question: 'What does the record establish about the code enforcement notice?',
    phase: 'EVIDENCE_ANALYSIS',
    hypotheses: new Map(),
    claims: new Map([
      [
        'claim-1',
        {
          id: 'claim-1',
          text: 'The notice alleges an unpermitted structure.',
          type: 'FACTUAL',
          supportingEvidence: ['evidence-1'],
          contradictingEvidence: [],
          status: 'UNVERIFIED',
          createdBy: 'extraction-pipeline',
          createdAt: 1,
        },
      ],
    ]),
    evidence: new Map([
      [
        'evidence-1',
        {
          id: 'evidence-1',
          text: 'Notice allegation: unpermitted structure',
          type: 'DOCUMENTED_EVENT',
          sourceId: 'source-1',
          extractedBy: 'extraction-pipeline',
          extractedAt: 1,
          supportsClaimId: 'claim-1',
          independentConfirmation: false,
          rootSourceIds: ['source-1'],
        },
      ],
    ]),
    sources: new Map([
      [
        'source-1',
        {
          id: 'source-1',
          title: 'Humboldt County notice',
          sourceType: 'GOVERNMENT_RECORD',
          quality: {
            authority: 0.8,
            proximity: 0.9,
            specificity: 0.8,
            independence: 0.6,
            transparency: 0.7,
            recency: 0.9,
            trackRecord: 0.7,
          },
          citedBy: [],
          cites: [],
          isPrimary: true,
          addedBy: 'test',
          addedAt: 1,
        },
      ],
    ]),
    contradictions: new Map(),
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('FairProcess investigation adapter', () => {
  it('preserves a government-record claim as an agency assertion rather than a verified fact', () => {
    const input = investigationToAttorneyPacketInput(investigationFixture(), {
      caseName: 'Code enforcement matter',
      generatedAt: '2026-09-07T22:00:00-07:00',
      jurisdiction: HUMBOLDT_FAIRPROCESS_PACK,
      property: { address: '123 Example Rd, McKinleyville, CA' },
      proceduralPosture: 'Notice received.',
      nextDeadline: '2026-09-15',
      timeline: [
        {
          id: 'event-1',
          date: '2026-09-01',
          title: 'Notice received',
          description: 'County notice received.',
          sourceRefs: [{ evidenceId: 'evidence-1', label: 'Humboldt County notice' }],
        },
      ],
      allegations: [
        {
          id: 'allegation-1',
          allegation: 'Unpermitted structure',
          status: 'unknown',
          supportingEvidence: [{ evidenceId: 'evidence-1', label: 'Humboldt County notice' }],
          contraryEvidence: [],
          missingEvidence: ['Permit history', 'inspection evidence'],
        },
      ],
    });

    expect(input.facts[0]?.status).toBe('agency_assertion');
    expect(input.evidence[0]?.evidenceId).toBe('evidence-1');

    const manifest = buildAttorneyPacketManifest(input);
    expect(manifest.readiness.readyForAttorneyHandoff).toBe(true);
    expect(manifest.sourceEvidenceIds).toContain('evidence-1');
  });
});
