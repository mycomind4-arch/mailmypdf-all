import { describe, expect, it } from 'vitest';
import { HUMBOLDT_FAIRPROCESS_PACK } from './jurisdictions/humboldt';
import {
  buildPublicRecordsRequestBatches,
  buildRecordsInvestigationTaskPlan,
} from './records-investigation';
import { buildFairProcessRecordsRequestHandoffs } from './records-request-handoff';
import {
  buildRecordsInvestigationPlan,
  type SourceRequirement,
} from './source-requirements';

function requirement(input: Pick<SourceRequirement, 'id' | 'category' | 'title'>): SourceRequirement {
  return {
    ...input,
    reason: `Need ${input.title}`,
    status: 'missing',
    priority: 'high',
    blocks: [],
    acquisitionOptions: [
      {
        method: 'public_records_request',
        connectorId: 'humboldt-public-records',
        label: `Request ${input.title}`,
      },
    ],
    satisfiedByEvidenceIds: [],
    notes: [],
  };
}

describe('FairProcess → Records Request handoff', () => {
  it('maps source gaps into the existing code-enforcement-records workflow categories', () => {
    const sourcePlan = buildRecordsInvestigationPlan({
      caseId: 'case-1',
      generatedAt: '2026-09-08T01:50:00-07:00',
      requirements: [
        requirement({ id: 'current-status', category: 'current_case_status', title: 'Current case status' }),
        requirement({ id: 'complaint', category: 'complaint_record', title: 'Complaint record' }),
        requirement({ id: 'inspection', category: 'inspection_record', title: 'Inspection records' }),
        requirement({ id: 'communications', category: 'agency_communications', title: 'Agency communications' }),
      ],
    });
    const taskPlan = buildRecordsInvestigationTaskPlan(sourcePlan, HUMBOLDT_FAIRPROCESS_PACK);
    const batches = buildPublicRecordsRequestBatches(taskPlan);
    const handoffs = buildFairProcessRecordsRequestHandoffs({
      taskPlan,
      batches,
      jurisdiction: HUMBOLDT_FAIRPROCESS_PACK,
      context: {
        propertyAddress: '123 Example Rd, McKinleyville, CA',
        caseNumber: 'CE-123',
        dateStart: '2026-01-01',
        dateEnd: '2026-09-08',
        subjectMatter: 'Code-enforcement investigation concerning the identified property.',
      },
    });

    expect(handoffs).toHaveLength(1);
    const [handoff] = handoffs;
    expect(handoff.workflowId).toBe('code-enforcement-records');
    expect(handoff.readyForBuild).toBe(true);
    expect(handoff.intake.agency).toBe('Humboldt County, California');
    expect(handoff.intake.department).toMatch(/Code Enforcement/);
    expect(handoff.intake.categories).toEqual(
      expect.arrayContaining(['case-file', 'enforcement-actions', 'complaints', 'inspections', 'correspondence']),
    );
    expect(handoff.intake.fairProcessSource.requirementIds).toEqual(
      ['communications', 'complaint', 'current-status', 'inspection'],
    );
  });

  it('does not invent required dates, subject matter, or property identifiers', () => {
    const sourcePlan = buildRecordsInvestigationPlan({
      caseId: 'case-1',
      generatedAt: '2026-09-08T01:50:00-07:00',
      requirements: [
        requirement({ id: 'current-status', category: 'current_case_status', title: 'Current case status' }),
      ],
    });
    const taskPlan = buildRecordsInvestigationTaskPlan(sourcePlan, HUMBOLDT_FAIRPROCESS_PACK);
    const batches = buildPublicRecordsRequestBatches(taskPlan);
    const [handoff] = buildFairProcessRecordsRequestHandoffs({
      taskPlan,
      batches,
      jurisdiction: HUMBOLDT_FAIRPROCESS_PACK,
      context: {},
    });

    expect(handoff.readyForBuild).toBe(false);
    expect(handoff.intake.dateStart).toBe('');
    expect(handoff.intake.dateEnd).toBe('');
    expect(handoff.intake.subjectMatter).toBe('');
    expect(handoff.blockers).toEqual(
      expect.arrayContaining([
        'Records start date is required by the Records Request workflow.',
        'Records end date is required by the Records Request workflow.',
        'A plain-English subject matter is required before building the request.',
        'Provide a property address or code-enforcement case number so the custodian can identify the matter.',
      ]),
    );
  });

  it('blocks handoff when custodian routing still requires confirmation', () => {
    const sourcePlan = buildRecordsInvestigationPlan({
      caseId: 'case-1',
      generatedAt: '2026-09-08T01:50:00-07:00',
      requirements: [
        requirement({ id: 'unrouted', category: 'other', title: 'Other material record' }),
      ],
    });
    const taskPlan = buildRecordsInvestigationTaskPlan(
      sourcePlan,
      { ...HUMBOLDT_FAIRPROCESS_PACK, recordsCustodians: [] },
    );
    const batches = buildPublicRecordsRequestBatches(taskPlan);
    const [handoff] = buildFairProcessRecordsRequestHandoffs({
      taskPlan,
      batches,
      jurisdiction: HUMBOLDT_FAIRPROCESS_PACK,
      context: {
        propertyAddress: '123 Example Rd',
        dateStart: '2026-01-01',
        dateEnd: '2026-09-08',
        subjectMatter: 'Code-enforcement matter.',
      },
    });

    expect(handoff.readyForBuild).toBe(false);
    expect(handoff.blockers).toContain('Confirm the exact records custodian before building the request.');
  });
});
