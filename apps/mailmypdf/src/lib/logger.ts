/**
 * Unified structured logger for MailMyPDF.
 *
 * This is the single entry point for all logging in the application.
 * It replaces bare console.log/console.error/console.warn calls with
 * structured JSON output that includes request context, correlation IDs,
 * and metadata.
 *
 * Features:
 * - Structured JSON output in production, readable in development
 * - Request-scoped context (request ID, order ID, user ID)
 * - Log levels (debug, info, warn, error) with env-configurable minimum
 * - Child loggers for scoped context
 * - Metrics emission hook (logs are also available as metrics)
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info("Order created", { orderId: "..." });
 *
 *   const requestLogger = logger.child({ requestId: "abc-123" });
 *   requestLogger.info("Processing checkout", { orderId: "..." });
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  orderId?: string;
  userId?: string;
  provider?: string;
  operation?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  env: string;
  context: LogContext;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLevel(): LogLevel {
  const env = process.env.LOG_LEVEL as LogLevel | undefined;
  if (env && LOG_LEVELS[env] !== undefined) return env;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[getMinLevel()];
}

function formatEntry(entry: LogEntry): string {
  if (process.env.NODE_ENV === "production") {
    return JSON.stringify(entry);
  }
  const ctx = entry.context;
  const ctxStr = Object.entries(ctx)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
  const parts = [
    `[${entry.timestamp}]`,
    entry.level.toUpperCase().padEnd(5),
    ctx.requestId ? `[${ctx.requestId.slice(0, 8)}]` : "",
    entry.message,
    ctxStr ? `{ ${ctxStr} }` : "",
  ].filter(Boolean);
  return parts.join(" ");
}

function emit(level: LogLevel, message: string, context: LogContext): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: "mailmypdf",
    env: process.env.NODE_ENV ?? "development",
    context,
  };

  const formatted = formatEntry(entry);
  if (level === "error") {
    console.error(formatted);
  } else if (level === "warn") {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }

  // Emit to metrics bus if there are subscribers
  metricsBus.emit(entry);
}

/**
 * The root logger — use directly or create a child with `.child()`.
 */
export const logger = {
  debug(message: string, context?: LogContext): void {
    emit("debug", message, context ?? {});
  },

  info(message: string, context?: LogContext): void {
    emit("info", message, context ?? {});
  },

  warn(message: string, context?: LogContext): void {
    emit("warn", message, context ?? {});
  },

  error(message: string, context?: LogContext): void {
    emit("error", message, context ?? {});
  },

  /**
   * Create a child logger with fixed context.
   * All subsequent log calls will include the child context,
   * merged with any additional context passed per-call.
   */
  child(baseContext: LogContext): Logger {
    return createChildLogger(baseContext);
  },
};

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(baseContext: LogContext): Logger;
}

function createChildLogger(baseContext: LogContext): Logger {
  return {
    debug(message: string, context?: LogContext): void {
      emit("debug", message, { ...baseContext, ...context });
    },
    info(message: string, context?: LogContext): void {
      emit("info", message, { ...baseContext, ...context });
    },
    warn(message: string, context?: LogContext): void {
      emit("warn", message, { ...baseContext, ...context });
    },
    error(message: string, context?: LogContext): void {
      emit("error", message, { ...baseContext, ...context });
    },
    child(additionalContext: LogContext): Logger {
      return createChildLogger({ ...baseContext, ...additionalContext });
    },
  };
}

// ── Metrics Bus ──────────────────────────────────────────────────────────────

/**
 * Internal event bus for metrics collection.
 * The metrics module subscribes to log events to extract metrics.
 */
type MetricsSubscriber = (entry: LogEntry) => void;

class MetricsBus {
  private subscribers: MetricsSubscriber[] = [];

  subscribe(fn: MetricsSubscriber): void {
    this.subscribers.push(fn);
  }

  emit(entry: LogEntry): void {
    for (const sub of this.subscribers) {
      try {
        sub(entry);
      } catch {
        // Metrics subscriber errors must never break logging
      }
    }
  }
}

const metricsBus = new MetricsBus();

export { metricsBus };
