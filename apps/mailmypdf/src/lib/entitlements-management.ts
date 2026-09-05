import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types";

type EntitlementsClient = SupabaseClient<Database>;

export const AdminUserIdSchema = z.object({ userId: z.string().uuid() }).strict();

export const AssignEntitlementSchema = z.object({
  targetUserId: z.string().uuid().optional(),
  targetOrgId: z.string().uuid().optional(),
  policyId: z.string().uuid(),
  expiresAt: z.string().datetime().optional(),
  reason: z.string().trim().max(2000).optional(),
}).strict().refine(
  (input) => Boolean(input.targetUserId) !== Boolean(input.targetOrgId),
  { message: "Specify exactly one target: targetUserId or targetOrgId" },
);

const QuotaMonthSchema = z.string().regex(/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/);

export const GetQuotaUsageSchema = z.object({
  userId: z.string().uuid(),
  month: QuotaMonthSchema,
}).strict();

export const AuditLogFilterSchema = z.object({
  resourceType: z.enum(["policy", "assignment", "quote", "organization", "member"]).optional(),
  action: z.enum([
    "policy_created", "policy_updated", "assignment_created", "assignment_updated",
    "assignment_expired", "quote_created", "quote_accepted", "quote_expired",
    "quote_reversed", "org_created", "member_added", "member_removed",
  ]).optional(),
  userId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).max(10000).default(0),
}).strict();

export const EntitlementListSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).max(10000).default(0),
}).strict();

export function validateEntitlementAssignment(input: unknown, actorId: string, now = new Date()) {
  const assignment = AssignEntitlementSchema.parse(input);
  if (assignment.targetUserId === actorId) {
    throw new Error("Cannot assign policies to yourself");
  }
  if (assignment.expiresAt && new Date(assignment.expiresAt).getTime() <= now.getTime()) {
    throw new Error("Assignment expiration must be in the future");
  }
  return assignment;
}

export async function assertEntitlementReadAccess(
  currentUser: { id: string } | null,
  targetUserId: string,
  verifyAdmin: (userId: string) => Promise<unknown>,
) {
  if (!currentUser) throw new Error("Unauthorized");
  if (currentUser.id !== targetUserId) await verifyAdmin(currentUser.id);
}

export function getQuotaMonthWindow(month: string) {
  QuotaMonthSchema.parse(month);
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function getAuditActorScope(
  admin: { id: string; app_metadata: { role?: unknown } },
  requestedActor?: string,
) {
  if (admin.app_metadata.role === "super_admin") return requestedActor;
  if (admin.app_metadata.role !== "admin") {
    throw new Error("Forbidden: audit log access requires admin role");
  }
  if (requestedActor && requestedActor !== admin.id) {
    throw new Error("Forbidden: cannot view other users' audit logs");
  }
  // Omitting a filter must not grant broader access than specifying one.
  return admin.id;
}

export async function countMonthlyAcceptedQuotes(
  admin: EntitlementsClient,
  userId: string,
  month: string,
) {
  const { start, end } = getQuotaMonthWindow(month);
  const { count, error } = await admin
    .from("pricing_quotes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "accepted")
    .gte("accepted_at", start)
    .lt("accepted_at", end);
  if (error) throw error;
  if (count === null || !Number.isSafeInteger(count) || count < 0) {
    throw new Error("Quota usage is unavailable");
  }
  return count;
}

export async function fetchActiveEntitlements(
  admin: EntitlementsClient,
  input: z.infer<typeof EntitlementListSchema>,
  now = new Date(),
) {
  const { data, error } = await admin
    .from("entitlement_assignments")
    .select("id, user_id, organization_id, policy_id:entitlement_policies(policy_slug, display_name), assigned_at, expires_at, reason")
    .or(`expires_at.is.null,expires_at.gt.${now.toISOString()}`)
    .order("assigned_at", { ascending: false })
    .order("id", { ascending: false })
    .range(input.offset, input.offset + input.limit - 1);
  if (error) throw error;
  return data || [];
}
