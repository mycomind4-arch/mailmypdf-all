/**
 * Structured request logging for external API calls.
 *
 * Replaces ad-hoc console.log/console.error calls with structured
 * log entries that include request context (provider, method, URL,
 * duration, status, order ID).
 *
 * This module is the foundation for Task 8 (Observability) — for now
 * it logs to console, but the interface is designed to be swapped
 * for a real logging backend (e.g., Logtail, Cloudflare Logpush).
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogEntry = {
  timestamp: string;
  level: LogLevel;
  provider: string;
  operation: string;
  orderId?: string;
  method?: string;
  url?: string;
  status?: number;
  durationMs?: number;
  attempt?: number;
  message: string;
  error?: string;
  metadata?: Record<string, unknown>;
};

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Minimum log level — can be overridden via env
const MIN_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ?? (process.env.NODE_ENV === "production" ? "info" : "debug");

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

function formatEntry(entry: LogEntry): string {
  // Structured JSON for production, readable for dev
  if (process.env.NODE_ENV === "production") {
    return JSON.stringify(entry);
  }
  const parts = [
    `[${entry.timestamp}]`,
    entry.level.toUpperCase(),
    `[${entry.provider}:${entry.operation}]`,
    entry.orderId ? `order=${entry.orderId}` : "",
    entry.method ? `${entry.method}` : "",
    entry.url ?? "",
    entry.status ? `→ ${entry.status}` : "",
    entry.durationMs != null ? `(${entry.durationMs}ms)` : "",
    entry.attempt != null ? `attempt=${entry.attempt}` : "",
    entry.message,
  ].filter(Boolean);
  return parts.join(" ");
}

function log(entry: Omit<LogEntry, "timestamp">): void {
  const fullEntry: LogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };
  if (!shouldLog(fullEntry.level)) return;
  const formatted = formatEntry(fullEntry);
  if (fullEntry.level === "error") {
    console.error(formatted);
  } else if (fullEntry.level === "warn") {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}

/**
 * Log an external API request lifecycle.
 * Use `logRequest.start()` and `logRequest.end()` to measure duration.
 */
export const logRequest = {
  start(opts: {
    provider: string;
    operation: string;
    method?: string;
    url?: string;
    orderId?: string;
    attempt?: number;
  }): { startedAt: number; opts: typeof opts } {
    const startedAt = Date.now();
    log({
      level: "debug",
      provider: opts.provider,
      operation: opts.operation,
      method: opts.method,
      url: opts.url,
      orderId: opts.orderId,
      attempt: opts.attempt,
      message: "request started",
    });
    return { startedAt, opts };
  },

  end(
    ctx: { startedAt: number; opts: Record<string, unknown> },
    result: {
      status?: number;
      message?: string;
      error?: string;
      metadata?: Record<string, unknown>;
    },
  ): void {
    const durationMs = Date.now() - ctx.startedAt;
    const level: LogLevel = result.error ? "error" : "info";
    log({
      level,
      provider: ctx.opts.provider as string,
      operation: ctx.opts.operation as string,
      method: ctx.opts.method as string,
      url: ctx.opts.url as string,
      orderId: ctx.opts.orderId as string,
      status: result.status,
      durationMs,
      message: result.message ?? (result.error ? "request failed" : "request completed"),
      error: result.error,
      metadata: result.metadata,
    });
  },

  retry(opts: {
    provider: string;
    operation: string;
    attempt: number;
    error: unknown;
    delayMs: number;
    orderId?: string;
  }): void {
    const errorMsg = opts.error instanceof Error ? opts.error.message : String(opts.error);
    log({
      level: "warn",
      provider: opts.provider,
      operation: opts.operation,
      orderId: opts.orderId,
      attempt: opts.attempt,
      message: `retrying after ${opts.delayMs}ms: ${errorMsg}`,
      error: errorMsg,
    });
  },
};

/**
 * Log a webhook event.
 */
export function logWebhook(opts: {
  provider: string;
  eventType: string;
  orderId?: string;
  externalId?: string;
  message: string;
  level?: LogLevel;
  metadata?: Record<string, unknown>;
}): void {
  log({
    level: opts.level ?? "info",
    provider: opts.provider,
    operation: `webhook:${opts.eventType}`,
    orderId: opts.orderId,
    message: opts.message,
    metadata: {
      externalId: opts.externalId,
      ...opts.metadata,
    },
  });
}

/**
 * Log an address validation result.
 */
export function logAddressValidation(opts: {
  orderId: string;
  addressType: "to" | "from";
  level: string;
  isDeliverable: boolean;
  warnings: string[];
  corrections?: unknown;
}): void {
  log({
    level: opts.isDeliverable ? "info" : "warn",
    provider: "lob",
    operation: "address_validation",
    orderId: opts.orderId,
    message: `address (${opts.addressType}): ${opts.level} — ${opts.isDeliverable ? "deliverable" : "NOT deliverable"}`,
    metadata: {
      addressType: opts.addressType,
      level: opts.level,
      warnings: opts.warnings,
      corrections: opts.corrections,
    },
  });
}
