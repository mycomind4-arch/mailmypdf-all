import type { JurisdictionPack } from './types';
import type {
  PublicRecordsRequestBatch,
  RecordsInvestigationTaskPlan,
} from './records-investigation';

export type RecordsRequestCodeEnforcementCategory =
  | 'case-file'
  | 'violations'
  | 'complaints'
  | 'inspections'
  | 'notices-and-orders'
  | 'photographs-and-video'
  | 'correspondence'
  | 'enforcement-actions'
  | 'abatement-and-compliance'
  | 'permits-and-related-records';

export interface FairProcessRecordsRequestHandoffContext {
  agency?: string;
  jurisdiction?: string;
  propertyAddress?: string;
  parcelNumber?: string;
  caseNumber?: string;
  violationNumber?: string;
  relatedParty?: string;
  dateStart?: string;
  dateEnd?: string;
  subjectMatter?: string;
}

export interface FairProcessRecordsRequestHandoff {
  contractVersion: 1;
  targetVertical: 'records-request';
  workflowId: 'code-enforcement-records';
  source: {
    system: 'fairprocess';
    caseId: string;
    jurisdictionPackId: string;
    jurisdictionPackVersion: string;
    batchId: string;
    requirementIds: string[];
  };
  intake: {
    agency: string;
    department: string;
    jurisdiction: string;
    propertyAddress?: string;
    parcelNumber?: string;
    caseNumber?: string;
    violationNumber?: string;
    relatedParty?: string;
    dateStart: string;
    dateEnd: string;
    subjectMatter: string;
    purpose: string;
    categories: RecordsRequestCodeEnforcementCategory[];
    fairProcessSource: FairProcessRecordsRequestHandoff['source'];
  };
  readyForBuild: boolean;
  blockers: string[];
}

const CATEGORY_MAP: Record<string, RecordsRequestCodeEnforcementCategory[]> = {
  property_identity: ['case-file', 'permits-and-related-records'],
  current_case_status: ['case-file', 'enforcement-actions'],
  current_allegations: ['violations', 'notices-and-orders'],
  complaint_record: ['complaints'],
  inspection_record: ['inspections'],
  notice_and_service: ['notices-and-orders'],
  permit_history: ['permits-and-related-records'],
  agency_communications: ['correspondence'],
  photos_and_media: ['photographs-and-video'],
  hearing_and_appeal: ['enforcement-actions', 'notices-and-orders'],
  abatement_and_costs: ['abatement-and-compliance', 'enforcement-actions'],
  other: ['case-file'],
};

function requiredText(value: string | undefined): string {
  return value?.trim() ?? '';
}

function categoriesForBatch(
  taskPlan: RecordsInvestigationTaskPlan,
  batch: PublicRecordsRequestBatch,
): RecordsRequestCodeEnforcementCategory[] {
  const taskByRequirement = new Map(
    taskPlan.tasks.map((task) => [task.requirementId, task] as const),
  );
  const categories = batch.requirementIds.flatMap((requirementId) => {
    const task = taskByRequirement.get(requirementId);
    return task ? CATEGORY_MAP[task.category] ?? ['case-file'] : ['case-file'];
  });
  return [...new Set(categories)].sort();
}

export function buildFairProcessRecordsRequestHandoff(input: {
  taskPlan: RecordsInvestigationTaskPlan;
  batch: PublicRecordsRequestBatch;
  jurisdiction: JurisdictionPack;
  context: FairProcessRecordsRequestHandoffContext;
}): FairProcessRecordsRequestHandoff {
  const { taskPlan, batch, jurisdiction, context } = input;
  if (taskPlan.caseId !== batch.caseId) {
    throw new Error('Records request batch does not belong to the supplied investigation plan.');
  }
  if (taskPlan.jurisdictionPackId !== jurisdiction.id || batch.jurisdictionPackId !== jurisdiction.id) {
    throw new Error('Records request handoff jurisdiction does not match the active FairProcess pack.');
  }

  const agency = requiredText(context.agency) || jurisdiction.name;
  const jurisdictionLabel = requiredText(context.jurisdiction) || jurisdiction.name;
  const department = batch.custodianLabel.trim();
  const dateStart = requiredText(context.dateStart);
  const dateEnd = requiredText(context.dateEnd);
  const subjectMatter = requiredText(context.subjectMatter);
  const propertyAddress = requiredText(context.propertyAddress) || undefined;
  const caseNumber = requiredText(context.caseNumber) || undefined;
  const blockers: string[] = [];

  if (batch.routingRequired) {
    blockers.push('Confirm the exact records custodian before building the request.');
  }
  if (!dateStart) blockers.push('Records start date is required by the Records Request workflow.');
  if (!dateEnd) blockers.push('Records end date is required by the Records Request workflow.');
  if (dateStart && dateEnd && dateStart > dateEnd) {
    blockers.push('Records end date cannot be before the records start date.');
  }
  if (!subjectMatter) blockers.push('A plain-English subject matter is required before building the request.');
  if (!propertyAddress && !caseNumber) {
    blockers.push('Provide a property address or code-enforcement case number so the custodian can identify the matter.');
  }

  const source: FairProcessRecordsRequestHandoff['source'] = {
    system: 'fairprocess',
    caseId: taskPlan.caseId,
    jurisdictionPackId: jurisdiction.id,
    jurisdictionPackVersion: jurisdiction.version,
    batchId: batch.id,
    requirementIds: [...batch.requirementIds].sort(),
  };

  return {
    contractVersion: 1,
    targetVertical: 'records-request',
    workflowId: 'code-enforcement-records',
    source,
    intake: {
      agency,
      department,
      jurisdiction: jurisdictionLabel,
      propertyAddress,
      parcelNumber: requiredText(context.parcelNumber) || undefined,
      caseNumber,
      violationNumber: requiredText(context.violationNumber) || undefined,
      relatedParty: requiredText(context.relatedParty) || undefined,
      dateStart,
      dateEnd,
      subjectMatter,
      purpose: 'Obtain and verify source records needed to evaluate the code-enforcement matter and preserve a sourced case record.',
      categories: categoriesForBatch(taskPlan, batch),
      fairProcessSource: source,
    },
    readyForBuild: blockers.length === 0,
    blockers,
  };
}

export function buildFairProcessRecordsRequestHandoffs(input: {
  taskPlan: RecordsInvestigationTaskPlan;
  batches: PublicRecordsRequestBatch[];
  jurisdiction: JurisdictionPack;
  context: FairProcessRecordsRequestHandoffContext;
}): FairProcessRecordsRequestHandoff[] {
  return input.batches.map((batch) =>
    buildFairProcessRecordsRequestHandoff({
      taskPlan: input.taskPlan,
      batch,
      jurisdiction: input.jurisdiction,
      context: input.context,
    }),
  );
}
