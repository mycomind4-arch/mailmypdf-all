/**
 * Supabase Admin Client (Server-Only)
 *
 * ⚠️  CRITICAL SECURITY: This module uses the service_role key.
 * NEVER expose to browser or client-side code.
 * ONLY use in Tanstack Start server functions.
 *
 * The service_role key has unrestricted access and bypasses RLS.
 * Use only for:
 * - Resolving entitlements for user context
 * - Storing audit logs
 * - Admin operations triggered by authenticated users
 * - System-level tasks (migrations, backups)
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Get or create the Supabase admin client.
 * Only available in server context.
 *
 * @throws Error if SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing
 */
export function getSupabaseAdmin() {
  // Prevent accidental use in browser
  if (typeof window !== "undefined") {
    throw new Error(
      "⚠️ getSupabaseAdmin() cannot be used in browser context. This is a server-only function."
    );
  }

  if (adminClient) {
    return adminClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
    );
  }

  adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}

/**
 * Execute a query or mutation with admin privileges.
 * Use only for operations that require full access (bypasses RLS).
 *
 * @param fn Async function that receives the admin client
 * @returns Result of the function
 *
 * @example
 * ```ts
 * const result = await withAdmin(async (admin) => {
 *   return admin
 *     .from('entitlements_audit_log')
 *     .insert({ actor_user_id: null, action: 'system_task', ... })
 * });
 * ```
 */
export async function withAdmin<T>(
  fn: (client: ReturnType<typeof getSupabaseAdmin>) => Promise<T>
): Promise<T> {
  if (typeof window !== "undefined") {
    throw new Error("withAdmin() is server-only");
  }

  const admin = getSupabaseAdmin();
  return fn(admin);
}

/**
 * Resolve active entitlements for a user (with admin context).
 * Returns the user's active entitlement or default policy.
 *
 * @param userId UUID of the user
 * @returns { policyId, policySlug, assignmentId } or null if using default
 */
export async function resolveUserEntitlements(userId: string) {
  return withAdmin(async (admin) => {
    const { data, error } = await admin
      .rpc("get_user_entitlements", { p_user_id: userId })
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows - user has no specific entitlement, will use default
        return null;
      }
      throw error;
    }

    return {
      assignmentId: data.assignment_id,
      policyId: data.policy_id,
      policySlug: data.policy_slug,
      isUserLevel: data.is_user_level,
      expiresAt: data.expires_at,
    };
  });
}

/**
 * Get pricing profile for a policy.
 * Returns the active production profile.
 *
 * @param policyId UUID of the policy
 * @returns Pricing profile or null if not found
 */
export async function getPricingProfile(policyId: string) {
  return withAdmin(async (admin) => {
    const { data, error } = await admin
      .from("pricing_profiles")
      .select("*")
      .eq("policy_id", policyId)
      .eq("is_active", true)
      .eq("commercial_status", "production")
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw error;
    }

    return data;
  });
}

/**
 * Get default pricing profile (Standard Pricing).
 * Used as fallback for users without specific entitlements.
 */
export async function getDefaultPricingProfile() {
  return withAdmin(async (admin) => {
    const { data: policy } = await admin
      .from("entitlement_policies")
      .select("id")
      .eq("policy_slug", "default-public")
      .eq("commercial_status", "active")
      .single();

    if (!policy) {
      throw new Error("Default policy not found");
    }

    return getPricingProfile(policy.id);
  });
}

/**
 * Create an entitlement assignment (admin operation).
 * Assigns a policy to a user or organization.
 *
 * @param options { userId?, organizationId, policyId, expiresAt?, reason }
 * @returns Created assignment
 */
export async function createEntitlementAssignment(options: {
  userId?: string;
  organizationId?: string;
  policyId: string;
  assignedBy: string;
  expiresAt?: Date;
  reason?: string;
}) {
  return withAdmin(async (admin) => {
    if (!options.userId && !options.organizationId) {
      throw new Error("Must specify either userId or organizationId");
    }

    const { data, error } = await admin
      .from("entitlement_assignments")
      .insert({
        user_id: options.userId || null,
        organization_id: options.organizationId || null,
        policy_id: options.policyId,
        assigned_by: options.assignedBy,
        expires_at: options.expiresAt?.toISOString() || null,
        reason: options.reason || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log the assignment
    await admin.from("entitlements_audit_log").insert({
      actor_user_id: options.assignedBy,
      action: "assignment_created",
      resource_type: "assignment",
      resource_id: data.id,
      changes: {
        user_id: options.userId,
        organization_id: options.organizationId,
        policy_id: options.policyId,
      },
      reason: options.reason || "Assignment created",
    });

    return data;
  });
}

/**
 * Audit log entry (admin operation).
 * Record any administrative action for compliance.
 *
 * @param options { actor, action, resourceType, resourceId, changes?, reason? }
 */
export async function logAuditEntry(options: {
  actor: string;
  action:
    | "policy_created"
    | "policy_updated"
    | "assignment_created"
    | "assignment_updated"
    | "assignment_expired"
    | "quote_created"
    | "quote_accepted"
    | "quote_expired"
    | "quote_reversed"
    | "org_created"
    | "member_added"
    | "member_removed";
  resourceType:
    | "policy"
    | "assignment"
    | "quote"
    | "organization"
    | "member";
  resourceId?: string;
  changes?: Record<string, any>;
  reason?: string;
}) {
  return withAdmin(async (admin) => {
    const { error } = await admin.from("entitlements_audit_log").insert({
      actor_user_id: options.actor,
      action: options.action,
      resource_type: options.resourceType,
      resource_id: options.resourceId || null,
      changes: options.changes || {},
      reason: options.reason || null,
    });

    if (error) {
      throw error;
    }
  });
}

/**
 * Verify quote ownership and status.
 * Used before accepting quotes after payment.
 *
 * @param quoteId UUID of the quote
 * @param userId UUID of the user who owns the quote
 * @returns Quote data or null if not found
 */
export async function verifyQuoteOwnership(quoteId: string, userId: string) {
  return withAdmin(async (admin) => {
    const { data, error } = await admin
      .from("pricing_quotes")
      .select("*")
      .eq("id", quoteId)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw error;
    }

    return data;
  });
}

/**
 * Get active organization members.
 * Used for org-level entitlement resolution.
 *
 * @param organizationId UUID of the organization
 * @returns List of member records
 */
export async function getOrganizationMembers(organizationId: string) {
  return withAdmin(async (admin) => {
    const { data, error } = await admin
      .from("organization_members")
      .select("*")
      .eq("organization_id", organizationId);

    if (error) {
      throw error;
    }

    return data || [];
  });
}

/**
 * Export type for typing admin operations
 */
export type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;
