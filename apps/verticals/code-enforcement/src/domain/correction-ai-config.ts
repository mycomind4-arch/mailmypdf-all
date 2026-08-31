/**
 * Correction AI Provider Config — Extended tasks for Workflow 2
 *
 * Adds correction-specific tasks to the existing AI task routing.
 * Gemini remains default. OpenAI/Claude remain fallback/independent-review.
 */

import type { AIProvider, TaskRoutingConfig, CETask } from './ai-provider';

// ─── Correction-Specific Tasks ───────────────────────────────────────────────

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

export const CORRECTION_TASK_CONFIG: Record<CorrectionTask, TaskRoutingConfig> = {
  correction_issue_extraction: {
    task: 'correction_issue_extraction', // Extends CETask
    preferredProvider: 'gemini',
    fallbackProviders: ['openai'],
    requiresIndependentReview: false,
    maxRetries: 2,
    timeoutMs: 25000,
  },
  recipient_reconciliation: {
    task: 'recipient_reconciliation',
    preferredProvider: 'gemini',
    fallbackProviders: ['claude'],
    requiresIndependentReview: true,
    independentReviewProvider: 'claude',
    maxRetries: 2,
    timeoutMs: 25000,
  },
  property_reconciliation: {
    task: 'property_reconciliation',
    preferredProvider: 'gemini',
    fallbackProviders: ['claude'],
    requiresIndependentReview: false,
    maxRetries: 2,
    timeoutMs: 25000,
  },
  case_identifier_reconciliation: {
    task: 'case_identifier_reconciliation',
    preferredProvider: 'gemini',
    fallbackProviders: ['openai'],
    requiresIndependentReview: false,
    maxRetries: 2,
    timeoutMs: 20000,
  },
  scope_reconciliation: {
    task: 'scope_reconciliation',
    preferredProvider: 'gemini',
    fallbackProviders: ['openai'],
    requiresIndependentReview: false,
    maxRetries: 2,
    timeoutMs: 20000,
  },
  deadline_reconciliation: {
    task: 'deadline_reconciliation',
    preferredProvider: 'gemini',
    fallbackProviders: ['openai'],
    requiresIndependentReview: true,
    independentReviewProvider: 'claude',
    maxRetries: 2,
    timeoutMs: 20000,
  },
  authority_reconciliation: {
    task: 'authority_reconciliation',
    preferredProvider: 'gemini',
    fallbackProviders: ['claude'],
    requiresIndependentReview: true,
    independentReviewProvider: 'claude',
    maxRetries: 2,
    timeoutMs: 30000,
  },
  correction_strategy: {
    task: 'correction_strategy',
    preferredProvider: 'gemini',
    fallbackProviders: ['claude'],
    requiresIndependentReview: true,
    independentReviewProvider: 'claude',
    maxRetries: 2,
    timeoutMs: 30000,
  },
  correction_draft_generation: {
    task: 'correction_draft_generation',
    preferredProvider: 'gemini',
    fallbackProviders: ['claude'],
    requiresIndependentReview: false,
    maxRetries: 2,
    timeoutMs: 45000,
  },
  correction_draft_critique: {
    task: 'correction_draft_critique',
    preferredProvider: 'claude',
    fallbackProviders: ['openai'],
    requiresIndependentReview: false,
    maxRetries: 2,
    timeoutMs: 30000,
  },
  correction_final_validation: {
    task: 'correction_final_validation',
    preferredProvider: 'claude',
    fallbackProviders: ['openai'],
    requiresIndependentReview: false,
    maxRetries: 2,
    timeoutMs: 20000,
  },
};

// ─── Independent Review Requirements for Correction Tasks ─────────────────────

export const CORRECTION_INDEPENDENT_REVIEW_TASKS: CorrectionTask[] = [
  'recipient_reconciliation',
  'deadline_reconciliation',
  'authority_reconciliation',
  'correction_strategy',
];

// ─── Correction Model Disagreement ───────────────────────────────────────────

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
