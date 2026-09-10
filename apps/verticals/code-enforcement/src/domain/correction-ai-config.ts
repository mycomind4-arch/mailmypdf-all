/**
 * Correction AI Provider Config — Workflow 2 routing policy.
 *
 * Claude is primary. OpenAI is first fallback and independent reviewer;
 * Gemini remains an additional fallback. Deterministic reconciliation,
 * authority, validation, and human-authorization gates remain authoritative.
 */

import type { AIProvider, TaskRoutingConfig, CETask } from './ai-provider';

export type CorrectionTask = Extract<CETask,
  | 'correction_issue_extraction'
  | 'recipient_reconciliation'
  | 'property_reconciliation'
  | 'case_identifier_reconciliation'
  | 'scope_reconciliation'
  | 'deadline_reconciliation'
  | 'authority_reconciliation'
  | 'correction_strategy'
  | 'correction_draft_generation'
  | 'correction_draft_critique'
  | 'correction_final_validation'>;

function route(
  task: CorrectionTask,
  timeoutMs: number,
  requiresIndependentReview = false,
): TaskRoutingConfig {
  return {
    task,
    preferredProvider: 'claude',
    preferredModel: 'claude-sonnet-5',
    fallbackProviders: ['openai', 'gemini'],
    requiresIndependentReview,
    independentReviewProvider: requiresIndependentReview ? 'openai' : undefined,
    maxRetries: 2,
    timeoutMs,
  };
}

export const CORRECTION_TASK_CONFIG: Record<CorrectionTask, TaskRoutingConfig> = {
  correction_issue_extraction: route('correction_issue_extraction', 25000),
  recipient_reconciliation: route('recipient_reconciliation', 25000, true),
  property_reconciliation: route('property_reconciliation', 25000),
  case_identifier_reconciliation: route('case_identifier_reconciliation', 20000),
  scope_reconciliation: route('scope_reconciliation', 20000),
  deadline_reconciliation: route('deadline_reconciliation', 20000, true),
  authority_reconciliation: route('authority_reconciliation', 30000, true),
  correction_strategy: route('correction_strategy', 30000, true),
  correction_draft_generation: route('correction_draft_generation', 45000),
  correction_draft_critique: route('correction_draft_critique', 30000),
  correction_final_validation: route('correction_final_validation', 20000),
};

export const CORRECTION_INDEPENDENT_REVIEW_TASKS: CorrectionTask[] = [
  'recipient_reconciliation',
  'deadline_reconciliation',
  'authority_reconciliation',
  'correction_strategy',
];

export interface CorrectionModelDisagreement {
  task: CorrectionTask;
  providerA: AIProvider;
  modelA: string;
  resultA: string;
  providerB: AIProvider;
  modelB: string;
  resultB: string;
  sourceEvidence: string;
  disagreementType: string;
  severity: 'high' | 'medium' | 'low';
  requiresHumanReview: boolean;
}

export function createCorrectionDisagreement(input: {
  task: CorrectionTask;
  providerA: AIProvider;
  modelA: string;
  resultA: string;
  providerB: AIProvider;
  modelB: string;
  resultB: string;
  sourceEvidence: string;
  disagreementType: string;
  severity: 'high' | 'medium' | 'low';
}): CorrectionModelDisagreement {
  return {
    ...input,
    requiresHumanReview: input.severity === 'high',
  };
}
