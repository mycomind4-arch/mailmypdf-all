export interface RetryPolicy { maxAttempts: number; backoffMs: number }

export function shouldRetry(attempt: number, policy: RetryPolicy): boolean {
  return attempt < policy.maxAttempts
}

export function retryDelay(attempt: number, policy: RetryPolicy): number {
  return Math.max(0, policy.backoffMs * Math.pow(2, Math.max(0, attempt - 1)))
}
