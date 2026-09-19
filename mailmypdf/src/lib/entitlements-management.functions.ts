/**
 * Entitlements Management Server Functions (Phase 2)
 *
 * Admin functions for:
 * - Viewing user entitlements and usage
 * - Assigning policies to users/organizations
 * - Managing quotas and tracking usage
 * - Viewing audit logs and compliance history
 *
 * Self-service reads are limited to the authenticated user. Cross-user reads
 * and management operations require a verified administrator.
 */

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getSupabaseServer } from "@/lib/user-client.server";
import {
  getSupabaseAdmin,
  resolveUserEntitlements,
  logAuditEntry,
} from "@/lib/supabase-admin.server";

import {
  AdminUserIdSchema,
  AssignEntitlementSchema,
  GetQuotaUsageSchema,
  AuditLogFilterSchema,
  EntitlementListSchema,
  countMonthlyAcceptedQuotes,
  fetchActiveEntitlements,
  getAuditActorScope,
  assertEntitlementReadAccess,
  validateEntitlementAssignment,
} from "@/lib/entitlements-management";

// ============================================================================
// ADMIN VERIFICATION (SECURITY: Real admin check)
// ============================================================================

/**
 * Verify user has admin role.
 * CRITICAL: This is not a placeholder - it enforces real authorization.
 *
 * Admin role can be stored in:
 * 1. app_metadata.role (JWT claims, safe from client)
 * 2. user_roles table (database row-level enforcement)
 * 3. Both (defense in depth)
 */
async function assertAdmin(userId: string) {
  const admin = getSupabaseAdmin();

  // Fetch user with proper error handling
  const { data, error } = await admin.auth.admin.getUserById(userId);

  if (error || !data?.user) {
    throw new Error("User not found");
  }

  // Check app_metadata for admin role (set by authentication, not client-editable)
  const userRole = data.user.app_metadata?.role;

  if (userRole !== "admin" && userRole !== "super_admin") {
    throw new Error("Forbidden: admin access required");
  }

  return data.user;
}

// ============================================================================
// GET USER ENTITLEMENTS & USAGE
// ============================================================================

/**
 * Get user's current entitlements and pricing information.
 * Shows what policy they're on and what benefits they get.
 */
export const getUserEntitlements = createServerFn({ method: "POST" })
  .validator(AdminUserIdSchema)
  .handler(async ({ data: input }) => {
    const request = getRequest();
    const { userId } = input;
    try {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        throw new Error("Unauthorized");
      }

      const token = authHeader.slice(7);
      const supabase = await getSupabaseServer({ token });

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      // Authorize the target before resolving it through the service-role client.
      await assertEntitlementReadAccess(currentUser, userId, assertAdmin);

      // Get entitlements using server function
      const entitlements = await resolveUserEntitlements(userId);

      if (!entitlements) {
        return {
          success: true,
          userId,
          entitlements: null,
          usingDefault: true,
          message: "Using default Standard Pricing policy",
        };
      }

      // Get policy details (use admin for reliability)
      const admin = getSupabaseAdmin();
      const { data: policy, error: policyError } = await admin
        .from("entitlement_policies")
        .select("id, policy_slug, display_name, description, workflow_discount_percent, mailing_markup_cents, service_fee_cents, monthly_free_workflows")
        .eq("id", entitlements.policyId)
        .single();

      if (policyError || !policy) {
        throw new Error("Entitlement policy is unavailable");
      }

      const { data: assignment, error: assignmentError } = await admin
        .from("entitlement_assignments")
        .select("assigned_at, assigned_by, reason")
        .eq("id", entitlements.assignmentId)
        .single();

      if (assignmentError || !assignment) {
        throw new Error("Entitlement assignment is unavailable");
      }

      return {
        success: true,
        userId,
        entitlements: {
          assignmentId: entitlements.assignmentId,
          policyId: entitlements.policyId,
          policySlug: entitlements.policySlug,
          isUserLevel: entitlements.isUserLevel,
          expiresAt: entitlements.expiresAt,
          policy: policy
            ? {
                id: policy.id,
                slug: policy.policy_slug,
                name: policy.display_name,
                description: policy.description,
                discountPercent: policy.workflow_discount_percent,
                mailingMarkup: policy.mailing_markup_cents,
                serviceFee: policy.service_fee_cents,
                monthlyFreeWorkflows: policy.monthly_free_workflows,
              }
            : null,
          assignedAt: assignment?.assigned_at,
          assignedBy: assignment?.assigned_by,
          reason: assignment?.reason,
        },
        usingDefault: false,
      };
    } catch (error) {
      console.error("Error getting entitlements:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get entitlements",
      };
    }
  });

// ============================================================================
// ASSIGN ENTITLEMENTS (ADMIN)
// ============================================================================

/**
 * Admin function to assign a policy to a user or organization.
 * Creates entitlement assignment and logs to audit trail.
 */
export const adminAssignEntitlement = createServerFn({ method: "POST" })
  .validator(AssignEntitlementSchema)
  .handler(async ({ data: input }) => {
    const request = getRequest();

    try {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        throw new Error("Unauthorized");
      }

      const token = authHeader.slice(7);
      const supabase = await getSupabaseServer({ token });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Unauthorized");
      }

      // Verify admin access
      await assertAdmin(user.id);
      const validInput = validateEntitlementAssignment(input, user.id);

      const admin = getSupabaseAdmin();

      // SECURITY: Validate target exists
      if (validInput.targetUserId) {
        const { data: targetUser, error: userError } =
          await admin.auth.admin.getUserById(validInput.targetUserId);
        if (userError || !targetUser?.user) {
          throw new Error("Target user not found");
        }
      }

      if (validInput.targetOrgId) {
        const { data: targetOrg, error: orgError } = await admin
          .from("organizations")
          .select("id")
          .eq("id", validInput.targetOrgId)
          .single();
        if (orgError || !targetOrg) {
          throw new Error("Target organization not found");
        }
      }

      // SECURITY: Validate policy exists and is assignable
      const { data: policy, error: policyError } = await admin
        .from("entitlement_policies")
        .select("id, commercial_status")
        .eq("id", validInput.policyId)
        .single();

      if (policyError || !policy) {
        throw new Error("Policy not found");
      }

      if (policy.commercial_status !== "active") {
        throw new Error(
          `Cannot assign policy with status: ${policy.commercial_status}`
        );
      }

      // Create assignment
      const expiresAt = validInput.expiresAt
        ? new Date(validInput.expiresAt)
        : null;

      const { data: assignment, error: assignError } = await admin
        .from("entitlement_assignments")
        .insert({
          user_id: validInput.targetUserId || null,
          organization_id: validInput.targetOrgId || null,
          policy_id: validInput.policyId,
          assigned_by: user.id,
          expires_at: expiresAt?.toISOString() || null,
          reason: validInput.reason || null,
        })
        .select()
        .single();

      if (assignError || !assignment) {
        throw new Error("Failed to create assignment");
      }

      // Log to audit trail
      await logAuditEntry({
        actor: user.id,
        action: "assignment_created",
        resourceType: "assignment",
        resourceId: assignment.id,
        changes: {
          user_id: validInput.targetUserId,
          organization_id: validInput.targetOrgId,
          policy_id: validInput.policyId,
          expires_at: expiresAt?.toISOString(),
        },
        reason: validInput.reason || "Policy assigned",
      });

      return {
        success: true,
        assignmentId: assignment.id,
        message: "Entitlement assigned successfully",
      };
    } catch (error) {
      console.error("Error assigning entitlement:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to assign entitlement",
      };
    }
  });

// ============================================================================
// GET QUOTA USAGE
// ============================================================================

/**
 * Report accepted workflows in a UTC month against the current policy allowance.
 * This is reporting, not an atomic reservation or redemption of free workflows.
 */
export const getQuotaUsage = createServerFn({ method: "POST" })
  .validator(GetQuotaUsageSchema)
  .handler(async ({ data: input }) => {
    const request = getRequest();

    try {
      const validInput = GetQuotaUsageSchema.parse(input);

      const authHeader = request.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        throw new Error("Unauthorized");
      }

      const token = authHeader.slice(7);
      const supabase = await getSupabaseServer({ token });

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      await assertEntitlementReadAccess(currentUser, validInput.userId, assertAdmin);

      // Get user's entitlements
      const entitlements = await resolveUserEntitlements(validInput.userId);

      if (!entitlements) {
        // No quota for default users
        return {
          success: true,
          userId: validInput.userId,
          month: validInput.month,
          monthlyQuota: 0,
          used: 0,
          remaining: 0,
          percentUsed: 0,
        };
      }

      // Get policy details for monthly quota
      const admin = getSupabaseAdmin();
      const { data: policy, error: policyError } = await admin
        .from("entitlement_policies")
        .select("monthly_free_workflows")
        .eq("id", entitlements.policyId)
        .single();

      if (policyError || !policy) {
        throw new Error("Entitlement policy is unavailable");
      }
      const monthlyQuota = policy.monthly_free_workflows ?? 0;
      if (!Number.isSafeInteger(monthlyQuota) || monthlyQuota < 0) {
        throw new Error("Entitlement quota is unavailable");
      }

      // Count when accepted, using a UTC month and an exact count beyond row limits.
      const used = await countMonthlyAcceptedQuotes(admin, validInput.userId, validInput.month);
      const remaining = Math.max(0, monthlyQuota - used);
      const percentUsed = monthlyQuota > 0 ? (used / monthlyQuota) * 100 : 0;

      return {
        success: true,
        userId: validInput.userId,
        month: validInput.month,
        monthlyQuota,
        used,
        remaining,
        percentUsed: Math.round(percentUsed),
      };
    } catch (error) {
      console.error("Error getting quota usage:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get quota usage",
      };
    }
  });

// ============================================================================
// LIST AUDIT LOG
// ============================================================================

/**
 * Get audit log entries filtered by resource type, action, or user.
 * Used for compliance and debugging.
 */
/**
 * List audit log with proper authorization and scope enforcement.
 * SECURITY: Verified admin role and actor scope; only summary fields are returned.
 */
export const listAuditLog = createServerFn({ method: "POST" })
  .validator(AuditLogFilterSchema)
  .handler(async ({ data: input }) => {
    const request = getRequest();

    try {
      const validInput = AuditLogFilterSchema.parse(input);

      const authHeader = request.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        throw new Error("Unauthorized");
      }

      const token = authHeader.slice(7);
      const supabase = await getSupabaseServer({ token });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Unauthorized");
      }

      // SECURITY: Verify admin access before allowing any audit log access
      const verifiedAdmin = await assertAdmin(user.id);
      const actorScope = getAuditActorScope(verifiedAdmin, validInput.userId);

      const admin = getSupabaseAdmin();
      let query = admin
        .from("entitlements_audit_log")
        .select("id, action, resource_type, resource_id, reason, created_at, actor_user_id");

      // SECURITY: Apply scope restrictions
      if (validInput.resourceType) {
        query = query.eq("resource_type", validInput.resourceType);
      }

      if (validInput.action) {
        query = query.eq("action", validInput.action);
      }

      if (actorScope) {
        query = query.eq("actor_user_id", actorScope);
      }

      const { data: logs, error: logsError } = await query
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(validInput.offset, validInput.offset + validInput.limit - 1);

      if (logsError) {
        throw logsError;
      }

      return {
        success: true,
        logs: logs || [],
        offset: validInput.offset,
        limit: validInput.limit,
        count: logs?.length || 0,
      };
    } catch (error) {
      console.error("Error listing audit log:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to list audit log",
      };
    }
  });

// ============================================================================
// LIST ENTITLEMENTS (ADMIN)
// ============================================================================

/**
 * Admin function to list all active entitlements in the system.
 * Useful for overview and management.
 */
export const adminListEntitlements = createServerFn({ method: "POST" })
  .validator(EntitlementListSchema)
  .handler(async ({ data: input }) => {
    const request = getRequest();
    const { limit = 50, offset = 0 } = input;
    try {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        throw new Error("Unauthorized");
      }

      const token = authHeader.slice(7);
      const supabase = await getSupabaseServer({ token });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Unauthorized");
      }

      // Verify admin access
      await assertAdmin(user.id);

      const admin = getSupabaseAdmin();

      const assignments = await fetchActiveEntitlements(admin, { limit, offset });

      return {
        success: true,
        assignments: assignments || [],
        offset,
        limit,
        count: assignments?.length || 0,
      };
    } catch (error) {
      console.error("Error listing entitlements:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to list entitlements",
      };
    }
  });
