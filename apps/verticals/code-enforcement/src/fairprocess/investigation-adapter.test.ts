import { describe, expect, it } from 'vitest';
import type { InvestigationState } from '../investigation/types';
import {
  HUMBOLDT_FAIRPROCESS_PACK,
  buildAttorneyPacketManifest,
  buildRecordsInvestigationPlan,
  investigationToAttorneyPacketInput,
  type SourceRequirement,
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

function currentStatusRequirement(status: SourceRequirement['status']): SourceRequirement {
  return {
    id: 'humboldt-current-ce-status',
    category: 'current_case_status',
    title: 'Obtain the current code-enforcement case status',
    reason: 'Current status must be established from current records.',
    status,
    priority: 'critical',
    blocks: ['current_case_assessment', 'attorney_packet'],
    acquisitionOptions: [
      {
        method: 'public_records_request',
        connectorId: 'humboldt-public-records',
        label: 'Request current case file',
      },
    ],
    satisfiedByEvidenceIds: status === 'verified' ? ['evidence-1'] : [],
    freshness: { required: 'current' },
    notes: [],
  };
}

const baseContext = {
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
};

describe('FairProcess investigation adapter', () => {
  it('preserves a government-record claim as an agency assertion rather than a verified fact', () => {
    const input = investigationToAttorneyPacketInput(investigationFixture(), {
      ...baseContext,
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

  it('automatically carries unresolved source gaps into the allegation matrix and packet gate', () => {
    const sourceRequirementPlan = buildRecordsInvestigationPlan({
      caseId: 'investigation-1',
      generatedAt: baseContext.generatedAt,
      requirements: [currentStatusRequirement('missing')],
    });

    const input = investigationToAttorneyPacketInput(investigationFixture(), {
      ...baseContext,
      sourceRequirementPlan,
      allegations: [
        {
          id: 'allegation-1',
          allegation: 'Unpermitted structure',
          status: 'unsupported_by_current_record',
          supportingEvidence: [],
          contraryEvidence: [],
          missingEvidence: [],
        },
      ],
    });

    expect(input.allegations[0]?.status).toBe('unknown');
    expect(input.allegations[0]?.missingEvidence).toContain(
      'Source gap: Obtain the current code-enforcement case status',
    );
    expect(input.sourceReadiness?.currentAssessmentBlocked).toBe(true);

    const manifest = buildAttorneyPacketManifest(input);
    expect(manifest.readiness.readyForAttorneyHandoff).toBe(false);
    expect(manifest.readiness.blockingIssues.join(' ')).toMatch(/unresolved source requirement/i);
  });

  it('preserves unsupported-by-current-record only after blocking source requirements are verified', () => {
    const sourceRequirementPlan = buildRecordsInvestigationPlan({
      caseId: 'investigation-1',
      generatedAt: baseContext.generatedAt,
      requirements: [currentStatusRequirement('verified')],
    });

    const input = investigationToAttorneyPacketInput(investigationFixture(), {
      ...baseContext,
      sourceRequirementPlan,
      allegations: [
        {
          id: 'allegation-1',
          allegation: 'Unpermitted structure',
          status: 'unsupported_by_current_record',
          supportingEvidence: [],
          contraryEvidence: [],
          missingEvidence: [],
        },
      ],
    });

    expect(input.allegations[0]?.status).toBe('unsupported_by_current_record');
    expect(input.sourceReadiness?.attorneyPacketBlocked).toBe(false);
  });
});
