/**
 * Failure Diagnosis — classifies pipeline failures into categories and
 * produces structured failure records with recommended next actions.
 *
 * Built on top of the existing retry-policy, checkpoint, and audit-record
 * infrastructure. When a stage fails, the pipeline calls diagnoseFailure()
 * to get a structured record instead of propagating an opaque exception.
 */

import type { GateName } from './vertical-manifest.js'
import type { FoundryCheckpoint } from './checkpoint.js'

// ── Failure Categories ───────────────────────────────────────────────────────

export type FailureCategory =
  | 'provider_failure'
  | 'auth_failure'
  | 'repository_failure'
  | 'build_failure'
  | 'test_failure'
  | 'security_failure'
  | 'qa_failure'
  | 'deployment_failure'
  | 'registration_failure'
  | 'policy_failure'
  | 'budget_failure'
  | 'integrity_failure'
  | 'transient_infrastructure_failure'

// ── Recommended Actions ──────────────────────────────────────────────────────

export type RecommendedAction =
  | 'retry'
  | 'repair_and_retry'
  | 'request_human_approval'
  | 'escalate'
  | 'abort'
  | 'fix_credentials'
  | 'fix_code'
  | 'fix_config'
  | 'increase_budget'
  | 'wait_and_retry'

// ── Structured Failure Record ────────────────────────────────────────────────

export interface FailureRecord {
  runId: string
  verticalId: string
  stage: GateName | string
  provider?: string
  error: string
  category: FailureCategory
  retryable: boolean
  recommendedAction: RecommendedAction
  checkpoint?: FoundryCheckpoint
  timestamp: string
  attemptNumber?: number
  originalError?: unknown
}

// ── Classification Rules ─────────────────────────────────────────────────────

interface ClassificationRule {
  test: (error: string, context: { stage: string; provider: string }) => boolean
  category: FailureCategory
  retryable: boolean
  recommendedAction: RecommendedAction
}

const rules: ClassificationRule[] = [
  // Auth failures — not retryable without fixing credentials
  {
    test: (e) => /401|unauthorized|invalid.*token|expired.*token|bad.*credentials|authentication/i.test(e),
    category: 'auth_failure',
    retryable: false,
    recommendedAction: 'fix_credentials',
  },
  // Rate limiting — transient, retryable with backoff
  {
    test: (e) => /429|rate.?limit|too many requests|throttl/i.test(e),
    category: 'transient_infrastructure_failure',
    retryable: true,
    recommendedAction: 'wait_and_retry',
  },
  // Network/transient errors — retryable
  {
    test: (e) => /ECONNRESET|ETIMEDOUT|ENOTFOUND|fetch failed|network|timeout|socket hang up|503|502|500/i.test(e),
    category: 'transient_infrastructure_failure',
    retryable: true,
    recommendedAction: 'retry',
  },
  // Build failures — need code fix
  {
    test: (e) => /build failed|compilation error|tsc.*error|webpack.*error|module not found|cannot find module|syntax error/i.test(e),
    category: 'build_failure',
    retryable: true,
    recommendedAction: 'fix_code',
  },
  // Repository not found / access denied
  {
    test: (e) => /404|repository.*not.*exist|access.*denied|forbidden|403/i.test(e),
    category: 'repository_failure',
    retryable: false,
    recommendedAction: 'fix_config',
  },
  // Test failures — need code fix
  {
    test: (e) => /test.*fail|assertion|expected.*to.*equal|tests? did not pass/i.test(e),
    category: 'test_failure',
    retryable: true,
    recommendedAction: 'fix_code',
  },
  // Security failures — not retryable without changing the condition
  {
    test: (e) => /security.*fail|vulnerability|CVE|secret.*leak|credential.*leak|injection|xss|csrf/i.test(e),
    category: 'security_failure',
    retryable: false,
    recommendedAction: 'fix_code',
  },
  // QA failures — repairable
  {
    test: (e) => /qa.*fail|quality.*gate|quality.*score|blocker/i.test(e),
    category: 'qa_failure',
    retryable: true,
    recommendedAction: 'repair_and_retry',
  },
  // Deployment failures
  {
    test: (e) => /deploy.*fail|deployment.*fail|pages.*error|preview.*fail/i.test(e),
    category: 'deployment_failure',
    retryable: true,
    recommendedAction: 'retry',
  },
  // Registration failures
  {
    test: (e) => /regist.*fail|already.*registered|registry.*error/i.test(e),
    category: 'registration_failure',
    retryable: false,
    recommendedAction: 'fix_config',
  },
  // Policy failures — not retryable
  {
    test: (e) => /policy.*violation|not.*allowed|prohibited|excluded.*repository|domain.*policy/i.test(e),
    category: 'policy_failure',
    retryable: false,
    recommendedAction: 'escalate',
  },
  // Budget failures — need budget increase
  {
    test: (e) => /budget.*exceed|cost.*limit|too.*expensive|budget.*overflow/i.test(e),
    category: 'budget_failure',
    retryable: false,
    recommendedAction: 'increase_budget',
  },
  // Integrity failures
  {
    test: (e) => /integrity|hash.*mismatch|tamper|checksum/i.test(e),
    category: 'integrity_failure',
    retryable: false,
    recommendedAction: 'escalate',
  },
]

/**
 * Classify a failure into a structured record with recommended action.
 */
export function diagnoseFailure(
  error: Error | string,
  context: {
    runId: string
    verticalId: string
    stage: GateName | string
    provider?: string
    checkpoint?: FoundryCheckpoint
    attemptNumber?: number
  },
): FailureRecord {
  const errorMessage = error instanceof Error ? error.message : String(error)

  // Try each rule in order — first match wins
  for (const rule of rules) {
    if (rule.test(errorMessage, { stage: String(context.stage), provider: context.provider ?? '' })) {
      const record: FailureRecord = {
        runId: context.runId,
        verticalId: context.verticalId,
        stage: context.stage,
        error: errorMessage,
        category: rule.category,
        retryable: rule.retryable,
        recommendedAction: rule.recommendedAction,
        timestamp: new Date().toISOString(),
        originalError: error,
      }
      if (context.provider) record.provider = context.provider
      if (context.attemptNumber !== undefined) record.attemptNumber = context.attemptNumber
      if (context.checkpoint) record.checkpoint = context.checkpoint
      return record
    }
  }

  // Default: provider failure if a provider was specified, otherwise unknown
  const record: FailureRecord = {
    runId: context.runId,
    verticalId: context.verticalId,
    stage: context.stage,
    error: errorMessage,
    category: context.provider ? 'provider_failure' : 'transient_infrastructure_failure',
    retryable: context.provider ? true : false,
    recommendedAction: context.provider ? 'retry' : 'escalate',
    timestamp: new Date().toISOString(),
    originalError: error,
  }
  if (context.provider) record.provider = context.provider
  if (context.attemptNumber !== undefined) record.attemptNumber = context.attemptNumber
  if (context.checkpoint) record.checkpoint = context.checkpoint
  return record
}

/**
 * Check if a failure category should NOT be retried (deterministic failures).
 */
export function isDeterministicFailure(category: FailureCategory): boolean {
  return ['auth_failure', 'policy_failure', 'budget_failure', 'integrity_failure'].includes(category)
}
