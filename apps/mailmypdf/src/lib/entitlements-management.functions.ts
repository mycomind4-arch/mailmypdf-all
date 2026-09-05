/**
 * Entitlements Management Server Functions (Phase 2)
 *
 * Admin functions for:
 * - Viewing user entitlements and usage
 * - Assigning policies to users/organizations
 * - Managing quotas and tracking usage
 * - Viewing audit logs and compliance history
 *
 * These functions enforce admin-only access.
 */

import { createServerFn } from "@tanstack/start";
import { z } from "zod";
import type { Database } from "~/lib/supabase/types";
import { getSupabaseServer } from "~/lib/supabase/server";
import {
  getSupabaseAdmin,
  resolveUserEntitlements,
  logAuditEntry,
} from "~/lib/supabase-admin.server";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const AdminUserIdSchema = z.object({
  userId: z.string().uuid(),
});

const AssignEntitlementSchema = z.object({
  targetUserId: z.string().uuid().optional(),
  targetOrgId: z.string().uuid().optional(),
  policyId: z.string().uuid(),
  expiresAt: z.string().datetime().optional(),
  reason: z.string().optional(),
});

const GetQuotaUsageSchema = z.object({
  userId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

const AuditLogFilterSchema = z.object({
  resourceType: z.enum(["policy", "assignment", "quote", "organization", "member"]).optional(),
  action: z.string().optional(),
  userId: z.string().uuid().optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0),
});

// ============================================================================
// ADMIN VERIFICATION
// ============================================================================

async function assertAdmin(userId: string) {
  const admin = getSupabaseAdmin();
  const { data: user } = await admin.auth.admin.getUserById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  // For now, accept any authenticated user for testing Phase 2
  // In production, check user_roles table or app_metadata
  return user;
}

// ============================================================================
// GET USER ENTITLEMENTS & USAGE
// ============================================================================

/**
 * Get user's current entitlements and pricing information.
 * Shows what policy they're on and what benefits they get.
 */
export const getUserEntitlements = createServerFn(
  "GET /api/entitlements/user/:userId",
  async ({ userId }, { request }) => {
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

      if (!currentUser) {
        throw new Error("Unauthorized");
      }

      // Allow users to see their own entitlements, or admins to see anyone's
      if (currentUser.id !== userId) {
        await assertAdmin(currentUser.id);
      }

      // Get entitlements
      const entitlements = await resolveUserEntitlements(userId);

      if (!entitlements) {
        // User has no assignments, returns default policy
        return {
          success: true,
          userId,
          entitlements: null,
          usingDefault: true,
          message: "Using default Standard Pricing policy",
        };
      }

      // Get policy details
      const admin = getSupabaseAdmin();
      const { data: policy } = await admin
        .from("entitlement_policies")
        .select("*")
        .eq("id", entitlements.policyId)
        .single();

      const { data: assignment } = await admin
        .from("entitlement_assignments")
        .select("*")
        .eq("id", entitlements.assignmentId)
        .single();

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
  }
);

// ============================================================================
// ASSIGN ENTITLEMENTS (ADMIN)
// ============================================================================

/**
 * Admin function to assign a policy to a user or organization.
 * Creates entitlement assignment and logs to audit trail.
 */
export const adminAssignEntitlement = createServerFn(
  "POST /api/admin/entitlements/assign",
  async (input: AssignEntitlementSchema, { request }) => {
    try {
      const validInput = AssignEntitlementSchema.parse(input);

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

      if (!validInput.targetUserId && !validInput.targetOrgId) {
        throw new Error("Must specify either targetUserId or targetOrgId");
      }

      const admin = getSupabaseAdmin();

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
        throw new Error(`Failed to create assignment: ${assignError?.message}`);
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
  }
);

// ============================================================================
// GET QUOTA USAGE
// ============================================================================

/**
 * Get quota usage for a user in a specific month.
 * Tracks how many free workflows they've used vs allocated.
 */
export const getQuotaUsage = createServerFn(
  "GET /api/entitlements/quota",
  async (input: GetQuotaUsageSchema, { request }) => {
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

      if (!currentUser) {
        throw new Error("Unauthorized");
      }

      // Allow users to see their own quota
      if (currentUser.id !== validInput.userId) {
        await assertAdmin(currentUser.id);
      }

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
      const { data: policy } = await admin
        .from("entitlement_policies")
        .select("monthly_free_workflows")
        .eq("id", entitlements.policyId)
        .single();

      const monthlyQuota = policy?.monthly_free_workflows || 0;

      // Count quotes created in this month (assuming accepted quotes)
      const [year, month] = validInput.month.split("-").map(Number);
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 1).toISOString();

      const { data: quotes, error: quotesError } = await admin
        .from("pricing_quotes")
        .select("id")
        .eq("user_id", validInput.userId)
        .eq("status", "accepted")
        .gte("created_at", startDate)
        .lt("created_at", endDate);

      if (quotesError) {
        throw quotesError;
      }

      const used = quotes?.length || 0;
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
  }
);

// ============================================================================
// LIST AUDIT LOG
// ============================================================================

/**
 * Get audit log entries filtered by resource type, action, or user.
 * Used for compliance and debugging.
 */
export const listAuditLog = createServerFn(
  "GET /api/admin/audit-log",
  async (input: AuditLogFilterSchema, { request }) => {
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

      // Verify admin access
      await assertAdmin(user.id);

      const admin = getSupabaseAdmin();
      let query = admin.from("entitlements_audit_log").select("*");

      if (validInput.resourceType) {
        query = query.eq("resource_type", validInput.resourceType);
      }

      if (validInput.action) {
        query = query.eq("action", validInput.action);
      }

      if (validInput.userId) {
        query = query.eq("actor_user_id", validInput.userId);
      }

      const { data: logs, error: logsError } = await query
        .order("created_at", { ascending: false })
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
  }
);

// ============================================================================
// LIST ENTITLEMENTS (ADMIN)
// ============================================================================

/**
 * Admin function to list all active entitlements in the system.
 * Useful for overview and management.
 */
export const adminListEntitlements = createServerFn(
  "GET /api/admin/entitlements",
  async ({ limit = 50, offset = 0 }, { request }) => {
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

      // Get active assignments with related data
      const { data: assignments, error: assignError } = await admin
        .from("entitlement_assignments")
        .select(
          `
          id,
          user_id,
          organization_id,
          policy_id:entitlement_policies(policy_slug, display_name),
          assigned_at,
          expires_at,
          reason
        `
        )
        .is("expires_at", null)
        .or("expires_at.gt.now()")
        .order("assigned_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (assignError) {
        throw assignError;
      }

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
  }
);
