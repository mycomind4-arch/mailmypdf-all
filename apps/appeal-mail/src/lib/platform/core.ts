/**
 * @platform/core — Stable primitives shared across the MailMyPDF ecosystem.
 *
 * Adapted from mailmypdf-platform/packages/core with Appeal Mail-specific integration.
 * Zero runtime dependencies. Framework-agnostic. Pure TypeScript.
 */

// ── Branded Types ─────────────────────────────────────────────────────────────

export type Brand<T, B extends string> = T & { readonly __brand: B };

export type PlatformId = Brand<string, "PlatformId">;

export function createId(value: string): PlatformId {
  if (!value.trim()) throw new Error("Platform IDs cannot be empty");
  return value as PlatformId;
}

export type Confidence = Brand<number, "Confidence">;

export function confidence(value: number): Confidence {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error("Confidence must be between 0 and 1");
  }
  return value as Confidence;
}

// ── Result Type ───────────────────────────────────────────────────────────────

export type Result<T, E = PlatformError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw result.error;
}

export function mapResult<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

// ── Typed Error Hierarchy ─────────────────────────────────────────────────────

export type ErrorCategory =
  | "validation"
  | "not_found"
  | "unauthorized"
  | "forbidden"
  | "conflict"
  | "rate_limit"
  | "upstream"
  | "internal"
  | "security";

interface PlatformErrorOptions {
  category: ErrorCategory;
  code: string;
  retryable?: boolean | undefined;
  details?: Record<string, unknown> | undefined;
  cause?: unknown | undefined;
}

export class PlatformError extends Error {
  readonly category: ErrorCategory;
  readonly code: string;
  readonly retryable: boolean;
  readonly details: Record<string, unknown> | undefined;

  constructor(message: string, options: PlatformErrorOptions) {
    super(message);
    this.name = "PlatformError";
    this.category = options.category;
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.details = options.details;
    if (options.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

function buildOpts(
  category: ErrorCategory,
  code: string,
  details: Record<string, unknown> | undefined,
  retryable?: boolean,
): PlatformErrorOptions {
  return { category, code, retryable, details };
}

export class ValidationError extends PlatformError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, buildOpts("validation", "VALIDATION_ERROR", details));
  }
}

export class NotFoundError extends PlatformError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, buildOpts("not_found", "NOT_FOUND", details));
  }
}

export class UnauthorizedError extends PlatformError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, buildOpts("unauthorized", "UNAUTHORIZED", details));
  }
}

export class ForbiddenError extends PlatformError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, buildOpts("forbidden", "FORBIDDEN", details));
  }
}

export class ConflictError extends PlatformError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, buildOpts("conflict", "CONFLICT", details));
  }
}

export class RateLimitError extends PlatformError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, buildOpts("rate_limit", "RATE_LIMIT", details, true));
  }
}

export class UpstreamError extends PlatformError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, buildOpts("upstream", "UPSTREAM_ERROR", details, true));
  }
}

export class SecurityError extends PlatformError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, buildOpts("security", "SECURITY_VIOLATION", details));
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

export type ValidationResult = Result<void, ValidationError>;

export function validateNonEmpty(value: string, field: string): ValidationResult {
  if (!value || !value.trim()) {
    return err(new ValidationError(`${field} must not be empty`));
  }
  return ok(undefined);
}

export function validateRange(
  value: number,
  field: string,
  min: number,
  max: number,
): ValidationResult {
  if (!Number.isFinite(value) || value < min || value > max) {
    return err(
      new ValidationError(`${field} must be between ${min} and ${max}`, { value, min, max }),
    );
  }
  return ok(undefined);
}

export function validateOneOf<T>(
  value: T,
  field: string,
  allowed: readonly T[],
): ValidationResult {
  if (!allowed.includes(value)) {
    return err(
      new ValidationError(`${field} must be one of: ${allowed.join(", ")}`, {
        value,
        allowed,
      }),
    );
  }
  return ok(undefined);
}

export function validateMaxLength(
  value: string,
  field: string,
  maxLen: number,
): ValidationResult {
  if (value.length > maxLen) {
    return err(
      new ValidationError(`${field} must not exceed ${maxLen} characters`, {
        length: value.length,
        maxLen,
      }),
    );
  }
  return ok(undefined);
}

// ── Date/Time Utilities ───────────────────────────────────────────────────────

export type ISODateString = Brand<string, "ISODate">;

export function toISODate(date: Date): ISODateString {
  return date.toISOString() as ISODateString;
}

export function parseISODate(value: string): Result<ISODateString, ValidationError> {
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) {
    return err(new ValidationError(`Invalid ISO date: ${value}`));
  }
  return ok(parsed.toISOString() as ISODateString);
}

export function daysBetween(from: string, to: string): Result<number, ValidationError> {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return err(new ValidationError("Invalid date(s) provided to daysBetween"));
  }
  const ms = toDate.getTime() - fromDate.getTime();
  return ok(Math.floor(ms / 86_400_000));
}

export function addDays(date: string, days: number): Result<string, ValidationError> {
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    return err(new ValidationError(`Invalid date: ${date}`));
  }
  parsed.setDate(parsed.getDate() + days);
  return ok(parsed.toISOString());
}

export function isFuture(date: string): boolean {
  return new Date(date).getTime() > Date.now();
}

export function isPast(date: string): boolean {
  return new Date(date).getTime() < Date.now();
}

// ── Configuration Interface ───────────────────────────────────────────────────

export interface Config {
  get(key: string): string | undefined;
  require(key: string): string;
  getBoolean(key: string): boolean;
  getNumber(key: string): number | undefined;
}

export function createConfig(source: Record<string, string | undefined> = {}): Config {
  return {
    get(key: string): string | undefined {
      return source[key];
    },
    require(key: string): string {
      const value = source[key];
      if (value === undefined || value === "") {
        throw new Error(`Required config key "${key}" is not set`);
      }
      return value;
    },
    getBoolean(key: string): boolean {
      const value = source[key];
      return value === "true" || value === "1" || value === "yes";
    },
    getNumber(key: string): number | undefined {
      const value = source[key];
      if (value === undefined || value === "") return undefined;
      const num = Number(value);
      return Number.isFinite(num) ? num : undefined;
    },
  };
}

// ── Logging Interface ─────────────────────────────────────────────────────────

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export const noopLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};

export const consoleLogger: Logger = {
  debug(message, meta) {
    if (meta) console.debug(message, meta);
    else console.debug(message);
  },
  info(message, meta) {
    if (meta) console.info(message, meta);
    else console.info(message);
  },
  warn(message, meta) {
    if (meta) console.warn(message, meta);
    else console.warn(message);
  },
  error(message, meta) {
    if (meta) console.error(message, meta);
    else console.error(message);
  },
};

// ── Retry Utilities ───────────────────────────────────────────────────────────

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitter?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (info: { attempt: number; error: unknown; delayMs: number }) => void;
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof PlatformError) return error.retryable;
  if (error instanceof TypeError && error.message.includes("fetch")) return true;
  return false;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 200;
  const maxDelayMs = options.maxDelayMs ?? 2000;
  const backoffMultiplier = options.backoffMultiplier ?? 2;
  const jitter = options.jitter ?? 0.1;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) break;
      const shouldRetry = options.shouldRetry ?? isRetryableError;
      if (!shouldRetry(error, attempt)) break;

      const delayMs = Math.min(
        baseDelayMs * Math.pow(backoffMultiplier, attempt - 1),
        maxDelayMs,
      );
      const jitterMs = delayMs * jitter * (Math.random() * 2 - 1);
      const totalDelay = Math.max(0, delayMs + jitterMs);

      if (options.onRetry) {
        options.onRetry({ attempt, error, delayMs: totalDelay });
      }
      await new Promise((resolve) => setTimeout(resolve, totalDelay));
    }
  }
  throw lastError;
}

// ── Save State ────────────────────────────────────────────────────────────────

export type SaveState = "idle" | "saving" | "saved" | "failed" | "retrying";

export interface SaveStatus {
  state: SaveState;
  error?: string;
  lastSavedAt?: string;
  retryCount: number;
}

export function createSaveStatus(): SaveStatus {
  return { state: "idle", retryCount: 0 };
}

export function transitioning(status: SaveStatus, state: SaveState, error?: string): SaveStatus {
  return {
    state,
    error,
    lastSavedAt: state === "saved" ? new Date().toISOString() : status.lastSavedAt,
    retryCount: state === "retrying" ? status.retryCount + 1 : state === "saving" ? 0 : status.retryCount,
  };
}
