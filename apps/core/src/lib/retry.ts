/**
 * Retry utility with exponential backoff for external API calls.
 *
 * Used by provider adapters to handle transient failures (network errors,
 * 429 rate limits, 5xx server errors) without losing data.
 *
 * Non-retryable errors (4xx client errors, validation failures) are
 * thrown immediately — retrying those would be wasteful and potentially
 * harmful (e.g., duplicate charges).
 */

export type RetryOptions = {
  /** Maximum number of attempts (including the first). Default: 3. */
  maxAttempts?: number;
  /** Base delay in ms for the first retry. Default: 1000. */
  baseDelayMs?: number;
  /** Maximum delay between retries. Default: 30000. */
  maxDelayMs?: number;
  /** Multiplier for exponential backoff. Default: 2. */
  backoffMultiplier?: number;
  /** Jitter factor (0-1) to add randomness. Default: 0.25. */
  jitter?: number;
  /** Timeout per attempt in ms. Default: 15000. */
  timeoutMs?: number;
  /** Predicate to decide if an error is retryable. Default: isRetryableError. */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Optional callback for logging retry attempts. */
  onRetry?: (info: { attempt: number; error: unknown; delayMs: number }) => void;
};

/** Default: retry on network errors, 429, and 5xx status codes. */
export function isRetryableError(error: unknown): boolean {
  // Timeout / abort errors are retryable
  if (error instanceof DOMException && error.name === "TimeoutError") return true;

  // RetryableError instances (from fetchWithRetry)
  if (error instanceof RetryableError) return true;

  // Network errors (TypeError: fetch failed)
  if (error instanceof TypeError && error.message.includes("fetch")) return true;

  // Check for status code property
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status: number }).status;
    return status === 429 || (status >= 500 && status < 600);
  }

  return false;
}

/** Error thrown when all retry attempts are exhausted. */
export class RetryableError extends Error {
  readonly status?: number;
  readonly isRetryable: boolean;

  constructor(message: string, opts?: { status?: number; isRetryable?: boolean }) {
    super(message);
    this.name = "RetryableError";
    this.status = opts?.status;
    this.isRetryable = opts?.isRetryable ?? true;
  }
}

/** Error thrown when all retry attempts are exhausted. */
export class RetryExhaustedError extends Error {
  readonly attempts: number;
  readonly lastError: unknown;

  constructor(message: string, attempts: number, lastError: unknown) {
    super(message);
    this.name = "RetryExhaustedError";
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

function calculateDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  multiplier: number,
  jitter: number,
): number {
  const exponential = baseDelayMs * Math.pow(multiplier, attempt - 1);
  const capped = Math.min(exponential, maxDelayMs);
  const jitterAmount = capped * jitter * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(capped + jitterAmount));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry and exponential backoff.
 *
 * @param fn - The async function to execute. If it throws a retryable
 *   error, it will be retried up to maxAttempts times.
 * @param options - Retry configuration.
 * @returns The result of the successful function call.
 * @throws {RetryExhaustedError} If all attempts fail.
 * @throws {Error} If the function throws a non-retryable error.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 1000;
  const maxDelayMs = options?.maxDelayMs ?? 30000;
  const backoffMultiplier = options?.backoffMultiplier ?? 2;
  const jitter = options?.jitter ?? 0.25;
  const shouldRetry = options?.shouldRetry ?? isRetryableError;
  const onRetry = options?.onRetry;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;

      // If this was the last attempt, don't retry
      if (attempt >= maxAttempts) break;

      // Check if the error is retryable
      if (!shouldRetry(error, attempt)) break;

      const delayMs = calculateDelay(
        attempt,
        baseDelayMs,
        maxDelayMs,
        backoffMultiplier,
        jitter,
      );

      if (onRetry) {
        onRetry({ attempt, error, delayMs });
      }

      await sleep(delayMs);
    }
  }

  // All attempts exhausted
  const message =
    lastError instanceof Error
      ? `All ${maxAttempts} attempts failed. Last error: ${lastError.message}`
      : `All ${maxAttempts} attempts failed.`;
  throw new RetryExhaustedError(message, maxAttempts, lastError);
}

/**
 * Fetch with retry, timeout, and backoff.
 *
 * Wraps the standard fetch API with automatic retry on transient failures.
 * Uses AbortSignal.timeout for per-attempt timeouts.
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit & { retryOptions?: RetryOptions },
): Promise<Response> {
  const { retryOptions, ...fetchInit } = init ?? {};
  const timeoutMs = retryOptions?.timeoutMs ?? 15000;

  return withRetry(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Combine existing signal with our timeout
    const existingSignal = fetchInit.signal;
    if (existingSignal) {
      // If the caller already provided a signal, listen to it too
      existingSignal.addEventListener("abort", () => controller.abort());
    }

    try {
      const response = await fetch(url, {
        ...fetchInit,
        signal: controller.signal,
      });

      // Always read the body so we can reconstruct the Response
      const body = await response.text();

      // Wrap non-ok responses in a RetryableError so withRetry can evaluate them
      if (!response.ok) {
        const status = response.status;
        const isRetryable = status === 429 || (status >= 500 && status < 600);
        throw new RetryableError(
          `HTTP ${status}: ${body.slice(0, 500)}`,
          { status, isRetryable },
        );
      }

      // Return a new Response with the body already read
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }, retryOptions);
}
