/**
 * Secure Error Handling
 *
 * Prevents information disclosure while logging full details server-side.
 * All errors are sanitized before being sent to clients.
 */

import { logger } from "@/lib/logging/logger";

/* ─────────────────────────────────────────────────────────────────────────── */
/* ERROR TYPES                                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(400, message, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(401, message, "AUTHENTICATION_ERROR");
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Insufficient permissions") {
    super(403, message, "AUTHORIZATION_ERROR");
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(404, `${resource} not found`, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, "CONFLICT");
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number = 60) {
    super(429, "Too many requests. Please try again later.", "RATE_LIMIT", {
      retryAfter,
    });
    this.name = "RateLimitError";
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = "An error occurred") {
    super(500, message, "INTERNAL_SERVER_ERROR");
    this.name = "InternalServerError";
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = "Database operation failed") {
    super(500, message, "DATABASE_ERROR");
    this.name = "DatabaseError";
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string) {
    super(
      503,
      `${service} service is currently unavailable`,
      "SERVICE_UNAVAILABLE"
    );
    this.name = "ExternalServiceError";
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* ERROR RESPONSE TYPES                                                        */
/* ─────────────────────────────────────────────────────────────────────────── */

export interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  requestId: string;
  timestamp: string;
  // Detailed info only in development
  details?: Record<string, unknown>;
  stack?: string;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* ERROR HANDLING UTILITIES                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Create secure error response
 * Sanitizes sensitive information before sending to client
 */
export function createErrorResponse(
  error: Error | AppError,
  requestId: string,
  isDevelopment: boolean = false
): ErrorResponse {
  const timestamp = new Date().toISOString();
  const code = (error as AppError).code || "UNKNOWN_ERROR";
  let statusCode = 500;
  let message = "An error occurred";

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  }

  const response: ErrorResponse = {
    error: getErrorCategory(statusCode),
    message,
    code,
    requestId,
    timestamp,
  };

  // Only include details in development
  if (isDevelopment) {
    response.details = (error as AppError).details;
    response.stack = error.stack;
  }

  return response;
}

/**
 * Map status code to error category
 */
function getErrorCategory(statusCode: number): string {
  switch (true) {
    case statusCode >= 400 && statusCode < 500:
      return "client_error";
    case statusCode >= 500 && statusCode < 600:
      return "server_error";
    default:
      return "unknown_error";
  }
}

/**
 * Get HTTP status code from error
 */
export function getStatusCode(error: Error | AppError): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }

  // Default to 500 for unknown errors
  return 500;
}

/**
 * Log error securely
 */
export interface ErrorLogContext {
  userId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  requestId?: string;
  [key: string]: unknown;
}

export function logError(
  error: Error | AppError,
  context?: ErrorLogContext
): void {
  const level = getStatusCode(error) >= 500 ? "error" : "warn";

  logger.log(level, {
    message: error.message,
    code: (error as AppError).code || "UNKNOWN",
    statusCode: getStatusCode(error),
    stack: error.stack,
    name: error.name,
    ...(error instanceof AppError && { details: error.details }),
    ...context,
  });
}

/**
 * Parse thrown error into AppError
 */
export function toAppError(error: unknown): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Standard Error
  if (error instanceof Error) {
    // Database errors
    if (error.message.includes("FOREIGN KEY")) {
      return new DatabaseError("Invalid reference");
    }

    if (error.message.includes("UNIQUE")) {
      return new ConflictError("This item already exists");
    }

    if (error.message.includes("database")) {
      return new DatabaseError();
    }

    // Default
    return new InternalServerError(
      process.env.NODE_ENV === "production"
        ? "An error occurred"
        : error.message
    );
  }

  // Unknown error type
  return new InternalServerError();
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* ERROR RESPONSE CREATION                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Create JSON error response
 */
export function createErrorResponseJSON(
  error: Error | AppError,
  requestId: string,
  isDevelopment: boolean = false
): Response {
  const statusCode = getStatusCode(error);
  const errorResponse = createErrorResponse(
    error,
    requestId,
    isDevelopment
  );

  return new Response(JSON.stringify(errorResponse), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Wrap async function with error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: ErrorLogContext
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const appError = toAppError(error);
    logError(appError, context);
    throw appError;
  }
}

/**
 * Wrap sync function with error handling
 */
export function withErrorHandlingSync<T>(
  fn: () => T,
  context?: ErrorLogContext
): T {
  try {
    return fn();
  } catch (error) {
    const appError = toAppError(error);
    logError(appError, context);
    throw appError;
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* COMMON ERROR SCENARIOS                                                      */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Unauthorized access
 */
export function throwUnauthorized(): never {
  throw new AuthenticationError("You must be logged in to access this resource");
}

/**
 * Forbidden access
 */
export function throwForbidden(
  reason: string = "You don't have permission to access this resource"
): never {
  throw new AuthorizationError(reason);
}

/**
 * Resource not found
 */
export function throwNotFound(resource: string = "Resource"): never {
  throw new NotFoundError(resource);
}

/**
 * Invalid input
 */
export function throwValidationError(
  message: string,
  details?: Record<string, unknown>
): never {
  throw new ValidationError(message, details);
}

/**
 * Rate limit exceeded
 */
export function throwRateLimitExceeded(retryAfter: number = 60): never {
  throw new RateLimitError(retryAfter);
}

/**
 * Database error
 */
export function throwDatabaseError(message: string = "Database operation failed"): never {
  throw new DatabaseError(message);
}

/**
 * External service error
 */
export function throwServiceUnavailable(service: string): never {
  throw new ExternalServiceError(service);
}
