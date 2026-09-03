/**
 * Database Security
 *
 * Ensures all database queries are parameterized and RLS is enforced.
 * Prevents SQL injection and unauthorized data access.
 */

import { createServerFn } from "@tanstack/start";

/* ─────────────────────────────────────────────────────────────────────────── */
/* RLS (ROW-LEVEL SECURITY) VERIFICATION                                      */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Tables that MUST have RLS enabled
 */
export const TABLES_REQUIRING_RLS = [
  // User data
  "users",
  "user_profiles",
  "user_settings",
  "sessions",

  // Workflow data
  "workflow_runs",
  "workflow_favorites",
  "workflow_submissions",
  "workflow_drafts",

  // Business data
  "matters",
  "documents",
  "correspondence",
  "case_strategy",

  // Payment data
  "payments",
  "invoices",
  "payment_methods",
  "billing_history",

  // Entitlements
  "entitlement_assignments",
  "usage_tracking",
  "quota_tracking",

  // Support
  "support_tickets",
  "support_messages",

  // Audit
  "audit_log",
  "activity_log",
];

/**
 * Verify RLS is enabled on critical tables
 * Should be run on deployment to validate security configuration
 */
export const verifyRLSEnabled = createServerFn(
  { method: "POST" },
  async () => {
    // This would query the database to verify RLS policies exist
    // SELECT tablename FROM pg_tables WHERE rowsecurity = true;
    // Then verify all TABLES_REQUIRING_RLS are in that list

    console.warn("⚠️  RLS verification not yet implemented");
    console.warn("Manual verification: SELECT tablename FROM pg_tables WHERE rowsecurity = true;");

    return {
      status: "warning",
      message: "Manual RLS verification needed",
      tablesRequiringRLS: TABLES_REQUIRING_RLS,
    };
  }
);

/* ─────────────────────────────────────────────────────────────────────────── */
/* QUERY VALIDATION                                                            */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Patterns that indicate unsafe queries
 */
const UNSAFE_PATTERNS = [
  /select\s+\*/i, // SELECT * (leaks schema)
  /union/i, // UNION attacks
  /insert\s+into/i, // INSERT in SELECT
  /update\s+/i, // UPDATE in SELECT
  /delete\s+from/i, // DELETE in SELECT
  /drop\s+/i, // DROP statement
  /truncate/i, // TRUNCATE statement
  /exec/i, // EXEC
  /execute/i, // EXECUTE
  /--/i, // SQL comments
  /\/\*/i, // Block comments
  /xp_/i, // Extended stored procedures
  /sp_/i, // System procedures
];

/**
 * Check if query contains unsafe patterns
 */
export function hasUnsafePatterns(query: string): boolean {
  return UNSAFE_PATTERNS.some((pattern) => pattern.test(query));
}

/**
 * Validate query is using parameterized format
 * In practice, use your ORM/query builder which handles this
 */
export function isParameterizedQuery(query: string): boolean {
  // Check for placeholder patterns (?, $1, :param, etc.)
  return /(\?|\$\d+|:\w+|@\w+)/i.test(query);
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* USER CONTEXT INJECTION                                                      */
/* ─────────────────────────────────────────────────────────────────────────── */

export interface DatabaseUserContext {
  userId: string;
  email: string;
  roles: string[];
}

/**
 * Set database user context (for RLS)
 * This is how Supabase enforces row-level security
 */
export function setDatabaseUserContext(context: DatabaseUserContext): void {
  // In Supabase, this is done via the client's auth header
  // The RLS policies reference auth.uid() which gets the current user ID
  // console.log("Setting DB user context:", context);
}

/**
 * Clear user context when logging out
 */
export function clearDatabaseUserContext(): void {
  // Done via logout in auth system
  // console.log("Cleared DB user context");
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* ENCRYPTION AT REST                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Fields that should be encrypted at rest
 * These contain PII or sensitive business data
 */
export const FIELDS_REQUIRING_ENCRYPTION = {
  users: ["ssn", "driver_license_number", "passport_number"],
  user_profiles: ["phone_number", "date_of_birth", "address"],
  matters: ["client_name", "client_email", "client_phone"],
  documents: ["content"], // If storing actual document text
  case_strategy: ["strategy_details"],
  correspondence: ["letter_content"],
};

/**
 * Check if field should be encrypted
 */
export function shouldEncryptField(table: string, field: string): boolean {
  const fields = FIELDS_REQUIRING_ENCRYPTION[
    table as keyof typeof FIELDS_REQUIRING_ENCRYPTION
  ];
  return fields ? fields.includes(field) : false;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* QUERY ISOLATION                                                             */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Ensure queries are isolated to authenticated user
 * This is a safety check on top of RLS
 */
export function ensureUserIsolation(
  userId: string,
  whereClause: Record<string, unknown>
): Record<string, unknown> {
  // Always include user_id in WHERE clause
  return {
    ...whereClause,
    user_id: userId,
  };
}

/**
 * Verify response doesn't contain data from other users
 * Should be done on sensitive queries
 */
export function validateResponseIsolation(
  userId: string,
  response: Record<string, unknown> | Record<string, unknown>[]
): boolean {
  const responses = Array.isArray(response) ? response : [response];

  for (const item of responses) {
    if (item.user_id && item.user_id !== userId) {
      console.error("SECURITY: Response contains data from another user!");
      return false;
    }
  }

  return true;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* PERFORMANCE & SAFETY                                                        */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Maximum result set size (prevents memory exhaustion)
 */
export const MAX_QUERY_RESULTS = {
  default: 1000,
  search: 100,
  export: 10000,
  audit: 50000,
};

/**
 * Validate pagination parameters
 */
export function validatePagination(
  limit?: number,
  offset?: number
): { limit: number; offset: number } {
  const safeLimit = Math.min(
    Math.max(limit || 25, 1),
    MAX_QUERY_RESULTS.default
  );
  const safeOffset = Math.max(offset || 0, 0);

  return { limit: safeLimit, offset: safeOffset };
}

/**
 * Add index recommendations for common queries
 */
export const INDEX_RECOMMENDATIONS = `
-- These indexes should be created for performance and query optimization:

-- User queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Workflow queries
CREATE INDEX IF NOT EXISTS idx_workflow_runs_user_id ON workflow_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_created_at ON workflow_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_favorites_user_id ON workflow_favorites(user_id);

-- Matter queries
CREATE INDEX IF NOT EXISTS idx_matters_user_id ON matters(user_id);
CREATE INDEX IF NOT EXISTS idx_matters_vertical_id ON matters(vertical_id);

-- Document queries
CREATE INDEX IF NOT EXISTS idx_documents_matter_id ON documents(matter_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

-- Audit queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- Payment queries
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_workflow_runs_user_status ON workflow_runs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_matter_type ON documents(matter_id, document_type);
`;

/**
 * Query monitoring and slow query detection
 */
export interface SlowQuery {
  query: string;
  duration: number; // milliseconds
  threshold: number; // milliseconds
}

/**
 * Log slow queries
 */
export function logSlowQuery(slowQuery: SlowQuery): void {
  console.warn("SLOW QUERY DETECTED:", {
    duration: `${slowQuery.duration}ms`,
    threshold: `${slowQuery.threshold}ms`,
    query: slowQuery.query.substring(0, 200), // Truncate for logging
  });
}
