/**
 * Request ID generation and logging context.
 *
 * Every request gets a unique ID that can be traced through logs.
 * The ID is attached to response headers as X-Request-ID.
 *
 * Usage in middleware:
 *   import { generateRequestId, logWithContext } from "@/lib/request-id";
 *
 *   const requestId = generateRequestId();
 *   // ... attach to context
 *   logWithContext(requestId, "info", "Order created", { orderId });
 */

import { randomUUID } from "node:crypto";

const REQUEST_ID_HEADER = "x-request-id";
const CORRELATION_ID_HEADER = "x-correlation-id";

/**
 * Generate a new request ID.
 */
export function generateRequestId(): string {
  return randomUUID();
}

/**
 * Extract an existing request ID from headers, or generate a new one.
 * Allows upstream proxies/load balancers to set their own trace IDs.
 */
export function getOrCreateRequestId(request: Request): string {
  const existing = request.headers.get(REQUEST_ID_HEADER)
    ?? request.headers.get(CORRELATION_ID_HEADER)
    ?? request.headers.get("x-amzn-trace-id");
  return existing || generateRequestId();
}

/**
 * Attach request ID to a response.
 */
export function attachRequestId(response: Response, requestId: string): Response {
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

/**
 * Structured log with request context.
 * Replaces bare console.log/console.error with structured JSON output.
 *
 * In Phase 2 (Observability), this will be upgraded to a proper
 * logging library (pino or similar) with structured output.
 */
export function logWithContext(
  requestId: string,
  level: "info" | "warn" | "error",
  message: string,
  context?: Record<string, unknown>,
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    requestId,
    message,
    ...context,
  };

  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else if (level === "warn") {
    console.warn(JSON.stringify(entry));
  } else {
    console.info(JSON.stringify(entry));
  }
}

/**
 * Create a scoped logger for a specific request.
 */
export function createRequestLogger(requestId: string) {
  return {
    info: (message: string, context?: Record<string, unknown>) =>
      logWithContext(requestId, "info", message, context),
    warn: (message: string, context?: Record<string, unknown>) =>
      logWithContext(requestId, "warn", message, context),
    error: (message: string, context?: Record<string, unknown>) =>
      logWithContext(requestId, "error", message, context),
  };
}

export { REQUEST_ID_HEADER, CORRELATION_ID_HEADER };
