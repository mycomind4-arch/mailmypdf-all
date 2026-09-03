/**
 * Structured Logging & Audit Trail
 *
 * Comprehensive logging for debugging, monitoring, and compliance auditing.
 * All sensitive information is redacted from logs.
 */

import { createServerFn } from "@tanstack/start";

/* ─────────────────────────────────────────────────────────────────────────── */
/* TYPES                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  [key: string]: unknown;
}

export interface AuditLogEntry {
  timestamp: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string;
  changes: Record<string, unknown>;
  status: "success" | "failure";
  ip: string;
  userAgent: string;
  errorMessage?: string;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* SENSITIVE DATA REDACTION                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */

const SENSITIVE_PATTERNS = [
  { pattern: /password["\s:=]+"[^"]+"/gi, replacement: 'password: "***"' },
  { pattern: /token["\s:=]+"[^"]+"/gi, replacement: 'token: "***"' },
  { pattern: /api.?key["\s:=]+"[^"]+"/gi, replacement: 'api_key: "***"' },
  { pattern: /secret["\s:=]+"[^"]+"/gi, replacement: 'secret: "***"' },
  { pattern: /authorization["\s:=]+"[^"]+"/gi, replacement: 'authorization: "***"' },
  { pattern: /bearer\s+[^\s]+/gi, replacement: "bearer ***" },
  { pattern: /sk_[a-z0-9]{32,}/gi, replacement: "sk_***" },
  { pattern: /(\d{4}[\s-]?){3}\d{4}/g, replacement: "****-****-****-****" },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: "***-**-****" },
];

/**
 * Redact sensitive information from data
 */
export function redactSensitive(data: unknown): unknown {
  if (typeof data === "string") {
    let redacted = data;
    for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
      redacted = redacted.replace(pattern, replacement);
    }
    return redacted;
  }

  if (typeof data === "object" && data !== null) {
    if (Array.isArray(data)) {
      return data.map((item) => redactSensitive(item));
    }

    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip sensitive keys entirely
      if (
        /password|token|secret|key|auth|credential|ssn|card|cvv|pin|jwt/i.test(
          key
        )
      ) {
        redacted[key] = "***";
      } else {
        redacted[key] = redactSensitive(value);
      }
    }
    return redacted;
  }

  return data;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* LOGGER IMPLEMENTATION                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== "production";
  }

  /**
   * Log entry at specified level
   */
  log(level: LogLevel, data: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: String(data.message || ""),
      ...redactSensitive(data),
    };

    // Write to console in development
    if (this.isDevelopment) {
      const color = this.getColorForLevel(level);
      console.log(`${color}[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}\x1b[0m`, entry);
    }

    // In production, send to logging service (Sentry, Datadog, etc.)
    // For now, log to stdout/stderr which gets picked up by container orchestration
    if (level === "error" || level === "fatal") {
      console.error(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log("debug", { message, ...data });
  }

  /**
   * Log info message
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log("info", { message, ...data });
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log("warn", { message, ...data });
  }

  /**
   * Log error message
   */
  error(message: string, data?: Record<string, unknown>): void {
    this.log("error", { message, ...data });
  }

  /**
   * Log fatal error
   */
  fatal(message: string, data?: Record<string, unknown>): void {
    this.log("fatal", { message, ...data });
  }

  /**
   * Get ANSI color code for log level
   */
  private getColorForLevel(level: LogLevel): string {
    switch (level) {
      case "debug":
        return "\x1b[36m"; // Cyan
      case "info":
        return "\x1b[32m"; // Green
      case "warn":
        return "\x1b[33m"; // Yellow
      case "error":
        return "\x1b[31m"; // Red
      case "fatal":
        return "\x1b[35m"; // Magenta
      default:
        return "\x1b[0m"; // Reset
    }
  }
}

export const logger = new Logger();

/* ─────────────────────────────────────────────────────────────────────────── */
/* AUDIT LOGGING                                                               */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Server function to log audit events
 * NOTE: This should persist to immutable audit table in Supabase
 */
export const logAuditEvent = createServerFn(
  { method: "POST" },
  async (
    userId: string | null,
    action: string,
    resource: string,
    resourceId: string,
    changes: Record<string, unknown>,
    status: "success" | "failure",
    errorMessage?: string,
    ip?: string,
    userAgent?: string
  ) => {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      userId,
      action,
      resource,
      resourceId,
      changes: redactSensitive(changes) as Record<string, unknown>,
      status,
      ip: ip || "unknown",
      userAgent: userAgent || "unknown",
      ...(errorMessage && { errorMessage }),
    };

    // Log to server logs
    logger.info(`Audit: ${action}`, entry);

    // In production, persist to audit table
    // await supabase.from('audit_log').insert(entry);

    return entry;
  }
);

/* ─────────────────────────────────────────────────────────────────────────── */
/* REQUEST LOGGING                                                             */
/* ─────────────────────────────────────────────────────────────────────────── */

export interface RequestContext {
  requestId: string;
  ip: string;
  method: string;
  path: string;
  userAgent: string;
  userId?: string;
  statusCode?: number;
  duration?: number;
  error?: string;
}

/**
 * Log HTTP request
 */
export function logRequest(context: RequestContext): void {
  const redacted = redactSensitive(context) as Record<string, unknown>;

  logger.info("HTTP Request", redacted);
}

/**
 * Log HTTP response
 */
export function logResponse(context: RequestContext): void {
  const redacted = redactSensitive(context) as Record<string, unknown>;

  if (context.statusCode && context.statusCode >= 400) {
    logger.warn("HTTP Response", redacted);
  } else {
    logger.info("HTTP Response", redacted);
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* SECURITY EVENT LOGGING                                                      */
/* ─────────────────────────────────────────────────────────────────────────── */

export interface SecurityEvent {
  type:
    | "authentication_success"
    | "authentication_failure"
    | "authorization_failure"
    | "rate_limit_exceeded"
    | "suspicious_activity"
    | "data_access"
    | "configuration_change"
    | "security_breach";
  ip: string;
  userId?: string;
  userAgent?: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Log security-relevant event
 */
export function logSecurityEvent(event: SecurityEvent): void {
  const redacted = redactSensitive(event) as Record<string, unknown>;

  logger.warn(`Security Event: ${event.type}`, redacted);
}

/**
 * Log authentication attempt
 */
export function logAuthAttempt(
  ip: string,
  email: string,
  success: boolean,
  userAgent?: string
): void {
  logSecurityEvent({
    type: success ? "authentication_success" : "authentication_failure",
    ip,
    message: `Authentication ${success ? "successful" : "failed"} for ${email}`,
    userAgent,
  });
}

/**
 * Log authorization failure
 */
export function logAuthorizationFailure(
  userId: string,
  resource: string,
  action: string,
  ip?: string,
  userAgent?: string
): void {
  logSecurityEvent({
    type: "authorization_failure",
    userId,
    ip,
    userAgent,
    message: `User attempted unauthorized ${action} on ${resource}`,
  });
}

/**
 * Log rate limit exceeded
 */
export function logRateLimitExceeded(
  ip: string,
  endpoint: string,
  limit: number,
  userAgent?: string
): void {
  logSecurityEvent({
    type: "rate_limit_exceeded",
    ip,
    userAgent,
    message: `Rate limit exceeded on ${endpoint}`,
    details: { endpoint, limit },
  });
}

/**
 * Log suspicious activity
 */
export function logSuspiciousActivity(
  ip: string,
  activity: string,
  userId?: string,
  userAgent?: string
): void {
  logSecurityEvent({
    type: "suspicious_activity",
    ip,
    userId,
    userAgent,
    message: `Suspicious activity detected: ${activity}`,
  });
}

/**
 * Log data access (for GDPR compliance)
 */
export function logDataAccess(
  userId: string,
  dataType: string,
  action: "read" | "write" | "delete",
  ip?: string
): void {
  logSecurityEvent({
    type: "data_access",
    userId,
    ip,
    message: `User ${action} ${dataType}`,
    details: { action, dataType },
  });
}
