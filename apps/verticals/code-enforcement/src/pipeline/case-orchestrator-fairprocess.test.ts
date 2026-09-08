import { describe, expect, it } from 'vitest';
import { extractNotice } from '../domain/notice-extraction';
import { HUMBOLDT_FAIRPROCESS_PACK } from '../fairprocess/jurisdictions/humboldt';
import {
  buildRecordsInvestigationPlan,
  type SourceRequirement,
} from '../fairprocess/source-requirements';
import { runCaseOrchestrator } from './case-orchestrator';

const NOTICE = `
NOTICE OF VIOLATION
Case Number: CE-2026-0042
Property: 123 Example Road, McKinleyville, CA 95519
APN: 123-456-789
Notice Date: August 15, 2026
Response Deadline: September 15, 2026
The matter concerns an alleged unpermitted structure.
`;

function sourceRequirement(): SourceRequirement {
  return {
    id: 'humboldt-current-ce-status',
    category: 'current_case_status',
    title: 'Obtain the current code-enforcement case status',
    reason: 'The current case status is not verified.',
    status: 'missing',
    priority: 'critical',
    blocks: ['current_case_assessment', 'attorney_packet'],
    acquisitionOptions: [
      {
        method: 'public_records_request',
        connectorId: 'humboldt-public-records',
        label: 'Request current case file and chronology',
      },
    ],
    satisfiedByEvidenceIds: [],
    freshness: { required: 'current' },
    notes: [],
  };
}

describe('Workflow 0 FairProcess → Records Request integration', () => {
  it('emits a ready code-enforcement-records handoff when required case facts are known', () => {
    const extraction = extractNotice(NOTICE, 'notice.txt');
    const sourceRequirementPlan = buildRecordsInvestigationPlan({
      caseId: 'case-1',
      generatedAt: '2026-09-08T02:00:00-07:00',
      requirements: [sourceRequirement()],
    });

    const result = runCaseOrchestrator({
      extraction,
      timelineEvents: [],
      evidence: [],
      sourceRequirementPlan,
      jurisdictionPack: HUMBOLDT_FAIRPROCESS_PACK,
      recordsRequestContext: {
        propertyAddress: '123 Example Road, McKinleyville, CA 95519',
        parcelNumber: '123-456-789',
        caseNumber: 'CE-2026-0042',
        dateStart: '2026-01-01',
        dateEnd: '2026-09-08',
        subjectMatter: 'Code-enforcement investigation concerning an alleged unpermitted structure.',
      },
    });

    expect(result.recordsRequestHandoffs).toHaveLength(1);
    const [handoff] = result.recordsRequestHandoffs ?? [];
    expect(handoff.workflowId).toBe('code-enforcement-records');
    expect(handoff.readyForBuild).toBe(true);
    expect(handoff.source.caseId).toBe('case-1');
    expect(handoff.source.requirementIds).toEqual(['humboldt-current-ce-status']);
    expect(handoff.intake.categories).toEqual(
      expect.arrayContaining(['case-file', 'enforcement-actions']),
    );
  });

  it('returns a blocked handoff instead of inventing missing request facts', () => {
    const extraction = extractNotice(NOTICE, 'notice.txt');
    const sourceRequirementPlan = buildRecordsInvestigationPlan({
      caseId: 'case-1',
      generatedAt: '2026-09-08T02:00:00-07:00',
      requirements: [sourceRequirement()],
    });

    const result = runCaseOrchestrator({
      extraction,
      timelineEvents: [],
      evidence: [],
      sourceRequirementPlan,
      jurisdictionPack: HUMBOLDT_FAIRPROCESS_PACK,
      recordsRequestContext: {},
    });

    const [handoff] = result.recordsRequestHandoffs ?? [];
    expect(handoff.readyForBuild).toBe(false);
    expect(handoff.blockers).toEqual(
      expect.arrayContaining([
        'Records start date is required by the Records Request workflow.',
        'Records end date is required by the Records Request workflow.',
        'A plain-English subject matter is required before building the request.',
        'Provide a property address or code-enforcement case number so the custodian can identify the matter.',
      ]),
    );
  });
});
