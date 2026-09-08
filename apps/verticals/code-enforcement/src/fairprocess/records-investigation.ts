import type {
  AttorneyPacketSourceReadiness,
  JurisdictionPack,
  JurisdictionRecordsCategory,
  PacketAllegation,
} from './types';
import {
  satisfySourceRequirement,
  verifySourceRequirement,
  type RecordsInvestigationPlan,
  type SourceRequirement,
  type SourceRequirementCategory,
} from './source-requirements';

export type RecordsInvestigationTaskStatus =
  | 'ready'
  | 'requested'
  | 'received'
  | 'verified'
  | 'blocked';

export interface RecordsInvestigationTask {
  id: string;
  requirementId: string;
  category: SourceRequirementCategory;
  priority: SourceRequirement['priority'];
  acquisitionMethods: SourceRequirement['acquisitionOptions'][number]['method'][];
  status: RecordsInvestigationTaskStatus;
  objective: string;
  reason: string;
  custodianKey?: string;
  custodianLabel?: string;
  custodianConnectorId?: string;
  evidenceIds: string[];
  blockers: string[];
  notes: string[];
  publicRecordsRequestEligible: boolean;
  publicRecordsRequestLabel?: string;
}

export interface RecordsInvestigationTaskPlan {
  caseId: string;
  generatedAt: string;
  jurisdictionPackId: string;
  tasks: RecordsInvestigationTask[];
  unresolvedCriticalCount: number;
  unresolvedHighCount: number;
  publicRecordsRequestCount: number;
  attorneyPacketBlocked: boolean;
  currentAssessmentBlocked: boolean;
}

export interface PublicRecordsRequestBatch {
  id: string;
  caseId: string;
  generatedAt: string;
  jurisdictionPackId: string;
  custodianKey: string;
  custodianLabel: string;
  connectorId?: string;
  routingRequired: boolean;
  requirementIds: string[];
  requestedRecords: string[];
  reasons: string[];
  status: 'draft';
}

const PRIORITY_RANK: Record<SourceRequirement['priority'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const ALLEGATION_EVIDENCE_CATEGORIES = new Set<SourceRequirementCategory>([
  'current_case_status',
  'current_allegations',
  'complaint_record',
  'inspection_record',
  'photos_and_media',
  'notice_and_service',
  'permit_history',
  'agency_communications',
]);

export function isSourceRequirementResolved(requirement: SourceRequirement): boolean {
  return requirement.status === 'verified' || requirement.status === 'not_applicable';
}

function taskStatus(requirement: SourceRequirement): RecordsInvestigationTaskStatus {
  if (requirement.status === 'verified') return 'verified';
  if (requirement.status === 'received') return 'received';
  if (requirement.status === 'requested') return 'requested';
  if (requirement.status === 'not_applicable') return 'verified';
  return requirement.acquisitionOptions.length > 0 ? 'ready' : 'blocked';
}

function findCustodian(
  requirement: SourceRequirement,
  jurisdiction: JurisdictionPack,
): JurisdictionPack['recordsCustodians'] extends Array<infer T> | undefined ? T | undefined : never {
  return jurisdiction.recordsCustodians?.find((route) =>
    route.categories.includes(requirement.category as JurisdictionRecordsCategory),
  ) as never;
}

export function buildRecordsInvestigationTaskPlan(
  sourcePlan: RecordsInvestigationPlan,
  jurisdiction: JurisdictionPack,
): RecordsInvestigationTaskPlan {
  const tasks = sourcePlan.requirements
    .filter((requirement) => requirement.status !== 'not_applicable')
    .map((requirement): RecordsInvestigationTask => {
      const publicRecordsOption = requirement.acquisitionOptions.find(
        (option) => option.method === 'public_records_request',
      );
      const custodian = findCustodian(requirement, jurisdiction);
      const blockers: string[] = [];

      if (requirement.status === 'missing' && requirement.acquisitionOptions.length === 0) {
        blockers.push('No acquisition route is configured for this source requirement.');
      }

      if (publicRecordsOption && !custodian) {
        blockers.push('The jurisdiction pack has not resolved a records custodian for this category.');
      }

      return {
        id: `records-task:${sourcePlan.caseId}:${requirement.id}`,
        requirementId: requirement.id,
        category: requirement.category,
        priority: requirement.priority,
        acquisitionMethods: [...new Set(requirement.acquisitionOptions.map((option) => option.method))],
        status: taskStatus(requirement),
        objective: requirement.title,
        reason: requirement.reason,
        custodianKey: custodian?.key,
        custodianLabel: custodian?.label,
        custodianConnectorId: custodian?.connectorId,
        evidenceIds: [...requirement.satisfiedByEvidenceIds].sort(),
        blockers,
        notes: [...requirement.notes],
        publicRecordsRequestEligible: Boolean(publicRecordsOption) && !isSourceRequirementResolved(requirement),
        publicRecordsRequestLabel: publicRecordsOption?.label,
      };
    })
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.id.localeCompare(b.id));

  const unresolved = sourcePlan.requirements.filter((requirement) => !isSourceRequirementResolved(requirement));

  return {
    caseId: sourcePlan.caseId,
    generatedAt: sourcePlan.generatedAt,
    jurisdictionPackId: jurisdiction.id,
    tasks,
    unresolvedCriticalCount: unresolved.filter((requirement) => requirement.priority === 'critical').length,
    unresolvedHighCount: unresolved.filter((requirement) => requirement.priority === 'high').length,
    publicRecordsRequestCount: tasks.filter((task) => task.publicRecordsRequestEligible).length,
    attorneyPacketBlocked: unresolved.some((requirement) => requirement.blocks.includes('attorney_packet')),
    currentAssessmentBlocked: unresolved.some((requirement) =>
      requirement.blocks.includes('current_case_assessment'),
    ),
  };
}

export function buildPublicRecordsRequestBatches(
  plan: RecordsInvestigationTaskPlan,
): PublicRecordsRequestBatch[] {
  const groups = new Map<string, PublicRecordsRequestBatch>();

  for (const task of plan.tasks) {
    if (!task.publicRecordsRequestEligible) continue;
    if (task.status === 'received' || task.status === 'verified') continue;

    const custodianKey = task.custodianKey ?? 'routing-required';
    const custodianLabel = task.custodianLabel ?? 'Records custodian — routing required';
    const existing = groups.get(custodianKey) ?? {
      id: `prr-batch:${plan.caseId}:${custodianKey}`,
      caseId: plan.caseId,
      generatedAt: plan.generatedAt,
      jurisdictionPackId: plan.jurisdictionPackId,
      custodianKey,
      custodianLabel,
      connectorId: task.custodianConnectorId,
      routingRequired: !task.custodianKey,
      requirementIds: [],
      requestedRecords: [],
      reasons: [],
      status: 'draft' as const,
    };

    existing.requirementIds.push(task.requirementId);
    existing.requestedRecords.push(task.publicRecordsRequestLabel ?? task.objective);
    existing.reasons.push(task.reason);
    groups.set(custodianKey, existing);
  }

  return [...groups.values()]
    .map((batch) => ({
      ...batch,
      requirementIds: [...new Set(batch.requirementIds)].sort(),
      requestedRecords: [...new Set(batch.requestedRecords)].sort(),
      reasons: [...new Set(batch.reasons)].sort(),
    }))
    .sort((a, b) => a.custodianKey.localeCompare(b.custodianKey));
}

export function markSourceRequirementRequested(requirement: SourceRequirement): SourceRequirement {
  if (isSourceRequirementResolved(requirement)) return requirement;
  if (!requirement.acquisitionOptions.some((option) => option.method === 'public_records_request')) {
    throw new Error('Source requirement does not have a public-records-request acquisition route.');
  }

  return { ...requirement, status: 'requested' };
}

/**
 * Records can be attached as soon as they are received, but they do not close a
 * source gap until the provenance/integrity layer has verified them. Callers
 * must only pass verified=true after that independent verification succeeds.
 */
export function applyInvestigationEvidence(
  requirement: SourceRequirement,
  evidenceIds: string[],
  options: { verified: boolean },
): SourceRequirement {
  const received = satisfySourceRequirement(requirement, evidenceIds);
  return options.verified ? verifySourceRequirement(received) : received;
}

export function toAttorneyPacketSourceReadiness(
  sourcePlan: RecordsInvestigationPlan,
): AttorneyPacketSourceReadiness {
  const unresolved = sourcePlan.requirements
    .filter((requirement) => !isSourceRequirementResolved(requirement))
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.id.localeCompare(b.id));

  return {
    attorneyPacketBlocked: unresolved.some((requirement) => requirement.blocks.includes('attorney_packet')),
    currentAssessmentBlocked: unresolved.some((requirement) =>
      requirement.blocks.includes('current_case_assessment'),
    ),
    unresolvedCriticalCount: unresolved.filter((requirement) => requirement.priority === 'critical').length,
    unresolvedHighCount: unresolved.filter((requirement) => requirement.priority === 'high').length,
    unresolvedRequirementIds: unresolved.map((requirement) => requirement.id),
    unresolvedRequirementTitles: unresolved.map((requirement) => requirement.title),
  };
}

/**
 * "Unsupported by the current record" is not a safe final characterization if
 * material current government records have not yet been obtained. In that
 * situation FairProcess reports the allegation as unknown and lists the source
 * gaps. Existing supported/disputed conclusions are never downgraded here.
 */
export function applySourceReadinessToAllegations(
  allegations: PacketAllegation[],
  sourcePlan: RecordsInvestigationPlan,
): PacketAllegation[] {
  const unresolvedMaterialRequirements = sourcePlan.requirements.filter(
    (requirement) =>
      !isSourceRequirementResolved(requirement) &&
      (requirement.priority === 'critical' || requirement.priority === 'high') &&
      ALLEGATION_EVIDENCE_CATEGORIES.has(requirement.category),
  );

  if (unresolvedMaterialRequirements.length === 0) {
    return allegations.map((allegation) => ({ ...allegation, missingEvidence: [...allegation.missingEvidence] }));
  }

  return allegations.map((allegation) => {
    if (allegation.status !== 'unsupported_by_current_record') {
      return { ...allegation, missingEvidence: [...allegation.missingEvidence] };
    }

    const sourceGaps = unresolvedMaterialRequirements.map(
      (requirement) => `Source gap: ${requirement.title}`,
    );

    return {
      ...allegation,
      status: 'unknown',
      missingEvidence: [...new Set([...allegation.missingEvidence, ...sourceGaps])].sort(),
    };
  });
}
