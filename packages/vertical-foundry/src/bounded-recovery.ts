/**
 * Bounded Automatic Recovery — controlled retry/repair loop with
 * finite budgets, exponential backoff, and checkpoint preservation.
 *
 * Flow:
 *   FAILURE → CLASSIFY → RETRY? → YES: RETRY → PASS? → YES: NEXT / NO: REPAIR → RETRY
 *                                → NO:  DIAGNOSE → ESCALATE
 *
 * Invariants:
 * - Finite retry budget (no infinite loops)
 * - Exponential backoff where appropriate
 * - Checkpoint before recovery attempt
 * - Checkpoint after successful recovery
 * - Original failure preserved
 * - All repair attempts recorded
 * - Deterministic failures (auth, policy, budget, integrity) are NOT retried
 */

import type { RetryPolicy } from './retry-policy.js'
import type { FailureRecord, FailureCategory } from './failure-diagnosis.js'
import { diagnoseFailure, isDeterministicFailure } from './failure-diagnosis.js'
import type { GateName } from './vertical-manifest.js'
import type { FoundryCheckpoint } from './checkpoint.js'
import { createCheckpoint } from './checkpoint.js'
import { retryDelay } from './retry-policy.js'

// ── Recovery Record ──────────────────────────────────────────────────────────

export interface RecoveryAttempt {
  attemptNumber: number
  failure: FailureRecord
  action: 'retry' | 'repair' | 'escalate' | 'abort'
  succeeded: boolean
  durationMs: number
  checkpointBefore?: FoundryCheckpoint
  checkpointAfter?: FoundryCheckpoint
  error?: string
}

export interface RecoveryResult<T> {
  success: boolean
  result?: T
  attempts: RecoveryAttempt[]
  totalRetries: number
  totalRepairs: number
  finalFailure?: FailureRecord
  checkpoints: FoundryCheckpoint[]
}

export interface RecoveryConfig {
  runId: string
  verticalId: string
  stage: GateName | string
  retryPolicy: RetryPolicy
  repairFn?: (failure: FailureRecord) => Promise<boolean>
  maxRepairs: number
  backoffBaseMs: number
  backoffMaxMs: number
  provider?: string
}

// ── Sleep helper ─────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ── Recovery Loop ────────────────────────────────────────────────────────────

export async function withRecovery<T>(
  fn: () => Promise<T>,
  config: RecoveryConfig,
): Promise<RecoveryResult<T>> {
  const attempts: RecoveryAttempt[] = []
  const checkpoints: FoundryCheckpoint[] = []
  let totalRetries = 0
  let totalRepairs = 0
  let lastFailure: FailureRecord | undefined

  let attemptNumber = 0
  const maxTotalAttempts = 1 + config.retryPolicy.maxAttempts + config.maxRepairs

  while (attemptNumber < maxTotalAttempts) {
    attemptNumber++

    try {
      const result = await fn()

      // Success — checkpoint after recovery
      if (attemptNumber > 1) {
        const cp = createCheckpoint(config.runId, `${config.stage}-recovered`, {
          attemptNumber,
          totalRetries,
          totalRepairs,
        })
        checkpoints.push(cp)
      }

      return {
        success: true,
        result,
        attempts,
        totalRetries,
        totalRepairs,
        checkpoints,
      }
    } catch (error) {
      const diagContext: {
        runId: string
        verticalId: string
        stage: string
        provider?: string
        attemptNumber: number
        checkpoint?: import('./checkpoint.js').FoundryCheckpoint
      } = {
        runId: config.runId,
        verticalId: config.verticalId,
        stage: String(config.stage),
        attemptNumber,
      }
      if (config.provider) diagContext.provider = config.provider
      if (lastFailure?.checkpoint) diagContext.checkpoint = lastFailure.checkpoint
      const failure = diagnoseFailure(error instanceof Error ? error : String(error), diagContext)

      lastFailure = failure

      // Checkpoint before recovery attempt
      const cpBefore = createCheckpoint(config.runId, `${config.stage}-failure-${attemptNumber}`, {
        error: failure.error,
        category: failure.category,
        retryable: failure.retryable,
      })
      checkpoints.push(cpBefore)

      // If deterministic failure, don't retry
      if (isDeterministicFailure(failure.category)) {
        attempts.push({
          attemptNumber,
          failure,
          action: 'abort',
          succeeded: false,
          durationMs: 0,
          checkpointBefore: cpBefore,
          error: `Deterministic failure: ${failure.category}`,
        })
        const result: RecoveryResult<T> = {
          success: false,
          attempts,
          totalRetries,
          totalRepairs,
          checkpoints,
        }
        result.finalFailure = failure
        return result
      }

      // If not retryable and no repair function, escalate
      if (!failure.retryable && !config.repairFn) {
        attempts.push({
          attemptNumber,
          failure,
          action: 'escalate',
          succeeded: false,
          durationMs: 0,
          checkpointBefore: cpBefore,
          error: 'Non-retryable failure with no repair function',
        })
        const result: RecoveryResult<T> = {
          success: false,
          attempts,
          totalRetries,
          totalRepairs,
          checkpoints,
        }
        result.finalFailure = failure
        return result
      }

      // Decide: retry or repair?
      const shouldRepair = failure.recommendedAction === 'repair_and_retry' ||
        (failure.retryable && config.repairFn && totalRepairs < config.maxRepairs)

      if (shouldRepair && config.repairFn) {
        totalRepairs++
        const repairStart = Date.now()
        let repairSucceeded = false
        try {
          repairSucceeded = await config.repairFn(failure)
        } catch (repairError) {
          // Repair itself failed — record and continue
          repairSucceeded = false
        }
        const repairDuration = Date.now() - repairStart

        const repairAttempt: RecoveryAttempt = {
          attemptNumber,
          failure,
          action: 'repair',
          succeeded: repairSucceeded,
          durationMs: repairDuration,
          checkpointBefore: cpBefore,
        }
        if (!repairSucceeded) repairAttempt.error = 'Repair did not resolve the issue'
        attempts.push(repairAttempt)

        if (!repairSucceeded) {
          // Repair failed — if we still have retries left, try again
          if (totalRetries >= config.retryPolicy.maxAttempts) {
            return {
              success: false,
              attempts,
              totalRetries,
              totalRepairs,
              finalFailure: failure,
              checkpoints,
            }
          }
        }

        // After repair, retry with backoff
        totalRetries++
        const delay = Math.min(
          retryDelay(totalRetries, { ...config.retryPolicy, backoffMs: config.backoffBaseMs }),
          config.backoffMaxMs,
        )
        await sleep(delay)
        continue
      }

      // Simple retry
      if (totalRetries >= config.retryPolicy.maxAttempts) {
        attempts.push({
          attemptNumber,
          failure,
          action: 'abort',
          succeeded: false,
          durationMs: 0,
          checkpointBefore: cpBefore,
          error: 'Retry budget exhausted',
        })
        const result: RecoveryResult<T> = {
          success: false,
          attempts,
          totalRetries,
          totalRepairs,
          checkpoints,
        }
        result.finalFailure = failure
        return result
      }

      totalRetries++
      const delay = Math.min(
        retryDelay(totalRetries, { ...config.retryPolicy, backoffMs: config.backoffBaseMs }),
        config.backoffMaxMs,
      )

      attempts.push({
        attemptNumber,
        failure,
        action: 'retry',
        succeeded: false,
        durationMs: delay,
        checkpointBefore: cpBefore,
      })

      await sleep(delay)
    }
  }

  // Exhausted all attempts
  const finalResult: RecoveryResult<T> = {
    success: false,
    attempts,
    totalRetries,
    totalRepairs,
    checkpoints,
  }
  if (lastFailure) finalResult.finalFailure = lastFailure
  return finalResult
}
