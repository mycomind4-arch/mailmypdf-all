import type { CreateRequestInput } from '../request-service';
import {
  CODE_ENFORCEMENT_RECORD_CATEGORIES,
  buildCodeEnforcementRequest,
} from './code-enforcement-records';

export interface FairProcessCodeEnforcementHandoffSource {
  system: 'fairprocess';
  caseId: string;
  jurisdictionPackId: string;
  jurisdictionPackVersion: string;
  batchId: string;
  requirementIds: string[];
}

export interface FairProcessCodeEnforcementHandoff {
  contractVersion: 1;
  targetVertical: 'records-request';
  workflowId: 'code-enforcement-records';
  source: FairProcessCodeEnforcementHandoffSource;
  intake: Record<string, unknown> & {
    fairProcessSource?: FairProcessCodeEnforcementHandoffSource;
  };
  readyForBuild: boolean;
  blockers: string[];
}

export interface FairProcessRequestDraft {
  workflowId: 'code-enforcement-records';
  source: FairProcessCodeEnforcementHandoffSource;
  request: CreateRequestInput;
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) return undefined;
  return value.map((entry) => entry.trim()).filter(Boolean);
}

function sameSource(
  left: FairProcessCodeEnforcementHandoffSource,
  right: FairProcessCodeEnforcementHandoffSource,
): boolean {
  return left.system === right.system &&
    left.caseId === right.caseId &&
    left.jurisdictionPackId === right.jurisdictionPackId &&
    left.jurisdictionPackVersion === right.jurisdictionPackVersion &&
    left.batchId === right.batchId &&
    JSON.stringify([...left.requirementIds].sort()) === JSON.stringify([...right.requirementIds].sort());
}

function parseSource(input: Record<string, unknown>): FairProcessCodeEnforcementHandoffSource {
  if (input.system !== 'fairprocess') throw new Error('FAIRPROCESS_HANDOFF_SOURCE_INVALID');
  const requirementIds = stringArray(input.requirementIds) ?? [];
  const source: FairProcessCodeEnforcementHandoffSource = {
    system: 'fairprocess',
    caseId: stringValue(input.caseId),
    jurisdictionPackId: stringValue(input.jurisdictionPackId),
    jurisdictionPackVersion: stringValue(input.jurisdictionPackVersion),
    batchId: stringValue(input.batchId),
    requirementIds,
  };
  if (!source.caseId || !source.jurisdictionPackId || !source.jurisdictionPackVersion || !source.batchId) {
    throw new Error('FAIRPROCESS_HANDOFF_SOURCE_INCOMPLETE');
  }
  if (source.requirementIds.length === 0) throw new Error('FAIRPROCESS_HANDOFF_REQUIREMENTS_MISSING');
  return source;
}

function validateIntakeReadiness(intake: Record<string, unknown>): string[] {
  const issues: string[] = [];
  const agency = stringValue(intake.agency);
  const department = stringValue(intake.department);
  const propertyAddress = stringValue(intake.propertyAddress);
  const caseNumber = stringValue(intake.caseNumber);
  const dateStart = stringValue(intake.dateStart);
  const dateEnd = stringValue(intake.dateEnd);
  const subjectMatter = stringValue(intake.subjectMatter);

  if (!agency) issues.push('Agency is required.');
  if (!department) issues.push('Records custodian or department is required.');
  if (!dateStart) issues.push('Records start date is required.');
  if (!dateEnd) issues.push('Records end date is required.');
  if (dateStart && dateEnd && dateStart > dateEnd) issues.push('Records end date cannot be before start date.');
  if (!subjectMatter) issues.push('Subject matter is required.');
  if (!propertyAddress && !caseNumber) issues.push('Property address or case number is required.');

  return issues;
}

export function parseFairProcessCodeEnforcementHandoff(
  input: unknown,
): FairProcessCodeEnforcementHandoff {
  const root = objectValue(input);
  if (!root) throw new Error('FAIRPROCESS_HANDOFF_INVALID');
  if (root.contractVersion !== 1) throw new Error('FAIRPROCESS_HANDOFF_VERSION_UNSUPPORTED');
  if (root.targetVertical !== 'records-request') throw new Error('FAIRPROCESS_HANDOFF_TARGET_INVALID');
  if (root.workflowId !== 'code-enforcement-records') throw new Error('FAIRPROCESS_HANDOFF_WORKFLOW_INVALID');

  const rawSource = objectValue(root.source);
  if (!rawSource) throw new Error('FAIRPROCESS_HANDOFF_SOURCE_INVALID');
  const source = parseSource(rawSource);

  const intake = objectValue(root.intake);
  if (!intake) throw new Error('FAIRPROCESS_HANDOFF_INTAKE_INVALID');
  const embeddedSource = objectValue(intake.fairProcessSource);
  if (!embeddedSource) throw new Error('FAIRPROCESS_HANDOFF_EMBEDDED_SOURCE_MISSING');
  const parsedEmbedded = parseSource(embeddedSource);
  if (!sameSource(source, parsedEmbedded)) throw new Error('FAIRPROCESS_HANDOFF_SOURCE_MISMATCH');

  const categories = stringArray(intake.categories);
  const allowedCategories = new Set<string>(CODE_ENFORCEMENT_RECORD_CATEGORIES);
  if (!categories?.length || categories.some((category) => !allowedCategories.has(category))) {
    throw new Error('FAIRPROCESS_HANDOFF_CATEGORIES_INVALID');
  }

  const declaredBlockers = stringArray(root.blockers) ?? [];
  const receiverIssues = validateIntakeReadiness(intake);
  const blockers = [...new Set([...declaredBlockers, ...receiverIssues])];
  const readyForBuild = root.readyForBuild === true;
  if (!readyForBuild || blockers.length > 0) {
    throw new Error(`FAIRPROCESS_HANDOFF_NOT_READY:${blockers.join('|') || 'handoff is not marked ready'}`);
  }

  return {
    contractVersion: 1,
    targetVertical: 'records-request',
    workflowId: 'code-enforcement-records',
    source,
    intake: { ...intake, categories, fairProcessSource: source },
    readyForBuild: true,
    blockers: [],
  };
}

function attachFairProcessScope(
  request: CreateRequestInput,
  source: FairProcessCodeEnforcementHandoffSource,
): CreateRequestInput {
  let existingScope: Record<string, unknown> = {};
  if (request.scope) {
    try {
      const parsed = JSON.parse(request.scope);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        existingScope = parsed as Record<string, unknown>;
      }
    } catch {
      existingScope = { legacyScope: request.scope };
    }
  }

  return {
    ...request,
    scope: JSON.stringify({
      ...existingScope,
      fairProcess: {
        ...source,
        provenanceTrust: 'case_linkage_only',
        note: 'FairProcess source IDs preserve case/request lineage. They do not independently verify the truth of requested records.',
      },
    }),
  };
}

/**
 * Converts a ready FairProcess source-gap handoff into the existing Records
 * Request draft contract. This function never approves, submits, pays for, or
 * mails the request.
 */
export function buildCodeEnforcementRequestFromFairProcessHandoff(
  input: unknown,
): FairProcessRequestDraft {
  const handoff = parseFairProcessCodeEnforcementHandoff(input);
  const request = buildCodeEnforcementRequest(handoff.intake);
  return {
    workflowId: 'code-enforcement-records',
    source: handoff.source,
    request: attachFairProcessScope(request, handoff.source),
  };
}
