/* ═══════════════════════════════════════════════════════════
   OWNER CONTEXT
   
   Provides the current owner/user identity for persistence
   operations. Every case must have an owner — the repository
   enforces ownership on all access.
   
   In production, this must be set from the authenticated session.
   In development/test, a default dev owner is used.
   
   Usage:
     import { getOwnerId } from "@/platform/owner-context";
     const ownerId = getOwnerId();
     repo.load(caseId, ownerId);
   
   When auth is implemented:
     setOwnerContext(session.user.id);
   ═══════════════════════════════════════════════════════════ */

const DEV_OWNER_ID = "dev-user-0000-0000-0000-000000000000";

let currentOwnerId: string | null = null;

/**
 * Set the current owner context. Called when a user session is established.
 */
export function setOwnerContext(ownerId: string): void {
  if (!ownerId) {
    throw new Error("Owner ID must not be empty");
  }
  currentOwnerId = ownerId;
}

/**
 * Clear the owner context (e.g. on logout).
 */
export function clearOwnerContext(): void {
  currentOwnerId = null;
}

/**
 * Get the current owner ID.
 * 
 * - If set explicitly via setOwnerContext(), returns that.
 * - In non-production environments, returns a dev owner ID.
 * - In production with no context set, throws — this is a safety
 *   measure to prevent unauthenticated access to case data.
 */
export function getOwnerId(): string {
  if (currentOwnerId) return currentOwnerId;

  const env = typeof process !== "undefined" ? process.env : {};
  const isProduction = env.NODE_ENV === "production";

  if (!isProduction) {
    return DEV_OWNER_ID;
  }

  throw new Error(
    "No owner context set in production. Call setOwnerContext() with the authenticated user ID before accessing case data.",
  );
}

/**
 * Check whether an owner context is available (does not throw).
 */
export function hasOwnerContext(): boolean {
  if (currentOwnerId) return true;
  const env = typeof process !== "undefined" ? process.env : {};
  return env.NODE_ENV !== "production";
}
