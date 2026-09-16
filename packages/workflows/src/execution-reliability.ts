export type WorkflowActionStatus = "pending" | "running" | "succeeded" | "failed";

export interface WorkflowRetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryable?: (error: unknown) => boolean;
}

export const DEFAULT_WORKFLOW_RETRY_POLICY: WorkflowRetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 10_000,
};

export interface IdempotencyRecord<T = unknown> {
  key: string;
  status: WorkflowActionStatus;
  attempts: number;
  result?: T;
  error?: string;
  updatedAt: string;
}

export interface WorkflowIdempotencyStore {
  load<T>(key: string): Promise<IdempotencyRecord<T> | null>;
  claim(key: string, now: string): Promise<boolean>;
  succeed<T>(key: string, result: T, attempts: number, now: string): Promise<void>;
  fail(key: string, error: string, attempts: number, now: string): Promise<void>;
}

export function retryDelayMs(attempt: number, policy: WorkflowRetryPolicy): number {
  const safeAttempt = Math.max(1, Math.floor(attempt));
  const delay = policy.baseDelayMs * 2 ** (safeAttempt - 1);
  return Math.min(policy.maxDelayMs, Math.max(0, delay));
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Canonical idempotent action runner for external/consequential workflow work.
 * Concurrent callers race on store.claim(); only one is allowed to execute.
 */
export async function runIdempotentWorkflowAction<T>(input: {
  key: string;
  store: WorkflowIdempotencyStore;
  action: (attempt: number) => Promise<T>;
  policy?: WorkflowRetryPolicy;
  now?: () => string;
  sleep?: (ms: number) => Promise<void>;
}): Promise<{ result: T; replayed: boolean; attempts: number }> {
  if (!input.key.trim()) throw new Error("Idempotency key is required");
  const policy = input.policy ?? DEFAULT_WORKFLOW_RETRY_POLICY;
  if (!Number.isInteger(policy.maxAttempts) || policy.maxAttempts < 1 || policy.maxAttempts > 10) {
    throw new Error("maxAttempts must be between 1 and 10");
  }
  const existing = await input.store.load<T>(input.key);
  if (existing?.status === "succeeded" && existing.result !== undefined) {
    return { result: existing.result, replayed: true, attempts: existing.attempts };
  }
  if (!(await input.store.claim(input.key, (input.now ?? (() => new Date().toISOString()))()))) {
    const afterClaim = await input.store.load<T>(input.key);
    if (afterClaim?.status === "succeeded" && afterClaim.result !== undefined) {
      return { result: afterClaim.result, replayed: true, attempts: afterClaim.attempts };
    }
    throw new Error("Workflow action is already in progress");
  }

  const now = input.now ?? (() => new Date().toISOString());
  const sleep = input.sleep ?? wait;
  let lastError: unknown;
  let attemptsUsed = 0;
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    attemptsUsed = attempt;
    try {
      const result = await input.action(attempt);
      await input.store.succeed(input.key, result, attempt, now());
      return { result, replayed: false, attempts: attempt };
    } catch (error) {
      lastError = error;
      const retryable = policy.retryable ? policy.retryable(error) : true;
      if (!retryable || attempt === policy.maxAttempts) break;
      await sleep(retryDelayMs(attempt, policy));
    }
  }
  const message = lastError instanceof Error ? lastError.message : String(lastError);
  await input.store.fail(input.key, message, attemptsUsed, now());
  throw lastError instanceof Error ? lastError : new Error(message);
}
