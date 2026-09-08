import { describe, expect, it } from 'vitest';
import { buildAttorneyPacketManifest } from './attorney-packet';
import { HUMBOLDT_FAIRPROCESS_PACK } from './jurisdictions/humboldt';
import {
  applyInvestigationEvidence,
  applySourceReadinessToAllegations,
  buildPublicRecordsRequestBatches,
  buildRecordsInvestigationTaskPlan,
  markSourceRequirementRequested,
  toAttorneyPacketSourceReadiness,
} from './records-investigation';
import {
  buildRecordsInvestigationPlan,
  type SourceRequirement,
} from './source-requirements';
import type { AttorneyPacketInput, PacketAllegation } from './types';

function requirement(
  overrides: Partial<SourceRequirement> & Pick<SourceRequirement, 'id' | 'category' | 'title'>,
): SourceRequirement {
  return {
    id: overrides.id,
    category: overrides.category,
    title: overrides.title,
    reason: overrides.reason ?? `Need ${overrides.title}`,
    status: overrides.status ?? 'missing',
    priority: overrides.priority ?? 'high',
    blocks: overrides.blocks ?? [],
    acquisitionOptions:
      overrides.acquisitionOptions ?? [
        {
          method: 'public_records_request',
          connectorId: 'humboldt-public-records',
          label: `Request ${overrides.title}`,
        },
      ],
    satisfiedByEvidenceIds: overrides.satisfiedByEvidenceIds ?? [],
    freshness: overrides.freshness,
    notes: overrides.notes ?? [],
  };
}

function sourcePlan(requirements: SourceRequirement[]) {
  return buildRecordsInvestigationPlan({
    caseId: 'case-1',
    generatedAt: '2026-09-08T01:30:00-07:00',
    requirements,
  });
}

function allegation(status: PacketAllegation['status']): PacketAllegation {
  return {
    id: `allegation-${status}`,
    allegation: 'Unpermitted structure',
    status,
    supportingEvidence: [],
    contraryEvidence: [],
    missingEvidence: [],
  };
}

function packetInput(sourceReadiness: AttorneyPacketInput['sourceReadiness']): AttorneyPacketInput {
  const source = { evidenceId: 'evidence-notice', label: 'Current county notice' };
  return {
    caseId: 'case-1',
    caseName: 'Example Code Enforcement Matter',
    generatedAt: '2026-09-08T01:30:00-07:00',
    jurisdiction: HUMBOLDT_FAIRPROCESS_PACK,
    property: { address: '123 Example Rd', apn: '123-456-789' },
    proceduralPosture: 'Pre-hearing investigation',
    nextDeadline: '2026-09-20',
    facts: [{ id: 'fact-1', statement: 'A current notice exists.', status: 'agency_assertion', sourceRefs: [source] }],
    timeline: [
      {
        id: 'event-1',
        date: '2026-09-01',
        title: 'Notice received',
        description: 'Current notice entered into evidence.',
        sourceRefs: [source],
      },
    ],
    allegations: [allegation('unknown')],
    findings: [],
    evidence: [source],
    sourceReadiness,
  };
}

describe('FairProcess records investigation engine', () => {
  it('turns unresolved source requirements into jurisdiction-routed tasks', () => {
    const plan = sourcePlan([
      requirement({
        id: 'current-status',
        category: 'current_case_status',
        title: 'Current CE status',
        priority: 'critical',
        blocks: ['current_case_assessment', 'attorney_packet'],
      }),
      requirement({
        id: 'inspection',
        category: 'inspection_record',
        title: 'Inspection records',
      }),
      requirement({
        id: 'permit',
        category: 'permit_history',
        title: 'Permit history',
      }),
    ]);

    const taskPlan = buildRecordsInvestigationTaskPlan(plan, HUMBOLDT_FAIRPROCESS_PACK);
    const statusTask = taskPlan.tasks.find((task) => task.requirementId === 'current-status');
    const permitTask = taskPlan.tasks.find((task) => task.requirementId === 'permit');

    expect(statusTask?.status).toBe('ready');
    expect(statusTask?.custodianKey).toBe('planning-building-code-enforcement');
    expect(permitTask?.custodianKey).toBe('planning-building-permits');
    expect(taskPlan.attorneyPacketBlocked).toBe(true);
    expect(taskPlan.currentAssessmentBlocked).toBe(true);
  });

  it('groups public-records work by jurisdiction custodian', () => {
    const taskPlan = buildRecordsInvestigationTaskPlan(
      sourcePlan([
        requirement({ id: 'complaint', category: 'complaint_record', title: 'Complaint record' }),
        requirement({ id: 'inspection', category: 'inspection_record', title: 'Inspection record' }),
        requirement({ id: 'permit', category: 'permit_history', title: 'Permit history' }),
      ]),
      HUMBOLDT_FAIRPROCESS_PACK,
    );

    const batches = buildPublicRecordsRequestBatches(taskPlan);
    const codeEnforcementBatch = batches.find(
      (batch) => batch.custodianKey === 'planning-building-code-enforcement',
    );

    expect(batches).toHaveLength(2);
    expect(codeEnforcementBatch?.requirementIds).toEqual(['complaint', 'inspection']);
    expect(codeEnforcementBatch?.routingRequired).toBe(false);
  });

  it('keeps requested and received records unresolved until verification succeeds', () => {
    const currentStatus = requirement({
      id: 'current-status',
      category: 'current_case_status',
      title: 'Current CE status',
      priority: 'critical',
      blocks: ['current_case_assessment', 'attorney_packet'],
    });

    const requested = markSourceRequirementRequested(currentStatus);
    const received = applyInvestigationEvidence(requested, ['evidence-current-status'], { verified: false });
    const receivedReadiness = toAttorneyPacketSourceReadiness(sourcePlan([received]));

    expect(requested.status).toBe('requested');
    expect(received.status).toBe('received');
    expect(receivedReadiness.attorneyPacketBlocked).toBe(true);
    expect(receivedReadiness.currentAssessmentBlocked).toBe(true);

    const verified = applyInvestigationEvidence(requested, ['evidence-current-status'], { verified: true });
    const verifiedReadiness = toAttorneyPacketSourceReadiness(sourcePlan([verified]));

    expect(verified.status).toBe('verified');
    expect(verifiedReadiness.attorneyPacketBlocked).toBe(false);
    expect(verifiedReadiness.currentAssessmentBlocked).toBe(false);
  });

  it('does not call an allegation unsupported while material source gaps remain', () => {
    const plan = sourcePlan([
      requirement({
        id: 'inspection',
        category: 'inspection_record',
        title: 'Inspection records',
        priority: 'high',
      }),
    ]);

    const [updated] = applySourceReadinessToAllegations(
      [allegation('unsupported_by_current_record')],
      plan,
    );

    expect(updated.status).toBe('unknown');
    expect(updated.missingEvidence).toContain('Source gap: Inspection records');
  });

  it('preserves supported and disputed allegation conclusions', () => {
    const plan = sourcePlan([
      requirement({
        id: 'inspection',
        category: 'inspection_record',
        title: 'Inspection records',
        priority: 'high',
      }),
    ]);

    const updated = applySourceReadinessToAllegations(
      [allegation('supported'), allegation('disputed')],
      plan,
    );

    expect(updated.map((item) => item.status)).toEqual(['supported', 'disputed']);
  });

  it('blocks attorney-ready status until blocking source requirements are verified', () => {
    const currentStatus = requirement({
      id: 'current-status',
      category: 'current_case_status',
      title: 'Current CE status',
      priority: 'critical',
      blocks: ['current_case_assessment', 'attorney_packet'],
    });

    const blockedReadiness = toAttorneyPacketSourceReadiness(sourcePlan([currentStatus]));
    const blockedPacket = buildAttorneyPacketManifest(packetInput(blockedReadiness));

    expect(blockedPacket.readiness.readyForAttorneyHandoff).toBe(false);
    expect(blockedPacket.readiness.blockingIssues.join(' ')).toMatch(/unresolved source requirement/i);

    const verified = applyInvestigationEvidence(currentStatus, ['evidence-current-status'], { verified: true });
    const clearReadiness = toAttorneyPacketSourceReadiness(sourcePlan([verified]));
    const clearPacket = buildAttorneyPacketManifest(packetInput(clearReadiness));

    expect(clearReadiness.attorneyPacketBlocked).toBe(false);
    expect(clearPacket.readiness.blockingIssues).toEqual([]);
    expect(clearPacket.readiness.readyForAttorneyHandoff).toBe(true);
  });
});
