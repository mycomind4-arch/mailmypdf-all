import { describe, expect, it } from 'vitest';
import {
  buildCodeEnforcementRequestFromFairProcessHandoff,
  parseFairProcessCodeEnforcementHandoff,
} from './fairprocess-code-enforcement-handoff';

function handoff() {
  const source = {
    system: 'fairprocess' as const,
    caseId: 'case-1',
    jurisdictionPackId: 'us-ca-humboldt',
    jurisdictionPackVersion: '2026-09-08.1',
    batchId: 'prr-batch:case-1:planning-building-code-enforcement',
    requirementIds: ['current-status', 'inspection'],
  };
  return {
    contractVersion: 1 as const,
    targetVertical: 'records-request' as const,
    workflowId: 'code-enforcement-records' as const,
    source,
    intake: {
      agency: 'Humboldt County, California',
      department: 'Humboldt County Planning & Building — Code Enforcement',
      jurisdiction: 'Humboldt County, California',
      propertyAddress: '123 Example Rd, McKinleyville, CA',
      caseNumber: 'CE-123',
      dateStart: '2026-01-01',
      dateEnd: '2026-09-08',
      subjectMatter: 'Code-enforcement investigation concerning the identified property.',
      purpose: 'Obtain and verify source records needed to evaluate the code-enforcement matter.',
      categories: ['case-file', 'enforcement-actions', 'inspections'],
      fairProcessSource: source,
    },
    readyForBuild: true,
    blockers: [],
  };
}

describe('Records Request FairProcess handoff consumer', () => {
  it('builds the existing code-enforcement-records request without submitting it', () => {
    const draft = buildCodeEnforcementRequestFromFairProcessHandoff(handoff());

    expect(draft.workflowId).toBe('code-enforcement-records');
    expect(draft.request.agency).toBe('Humboldt County, California');
    expect(draft.request.items.map((item) => item.category)).toEqual([
      'case-file',
      'enforcement-actions',
      'inspections',
    ]);
    expect(draft.request.items.every((item) => item.custodian?.includes('Code Enforcement'))).toBe(true);

    const scope = JSON.parse(draft.request.scope ?? '{}');
    expect(scope.workflow).toBe('code-enforcement-records');
    expect(scope.fairProcess.caseId).toBe('case-1');
    expect(scope.fairProcess.requirementIds).toEqual(['current-status', 'inspection']);
    expect(scope.fairProcess.provenanceTrust).toBe('case_linkage_only');
  });

  it('rejects a handoff that has unresolved blockers', () => {
    const input = handoff();
    input.readyForBuild = false;
    input.blockers = ['Records start date is required.'];

    expect(() => buildCodeEnforcementRequestFromFairProcessHandoff(input)).toThrow(
      /FAIRPROCESS_HANDOFF_NOT_READY/,
    );
  });

  it('rejects source metadata that does not match the embedded intake lineage', () => {
    const input = handoff();
    input.intake.fairProcessSource = {
      ...input.source,
      caseId: 'different-case',
    };

    expect(() => parseFairProcessCodeEnforcementHandoff(input)).toThrow(
      'FAIRPROCESS_HANDOFF_SOURCE_MISMATCH',
    );
  });

  it('rejects unsupported record categories instead of widening the request', () => {
    const input = handoff();
    input.intake.categories = ['case-file', 'not-a-real-category'];

    expect(() => parseFairProcessCodeEnforcementHandoff(input)).toThrow(
      'FAIRPROCESS_HANDOFF_CATEGORIES_INVALID',
    );
  });
});
