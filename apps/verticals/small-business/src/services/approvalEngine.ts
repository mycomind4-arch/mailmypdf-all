import { z } from "zod";

export const approvalStatusSchema = z.enum(["pending", "approved", "rejected", "cancelled"]);
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;

export type ApprovalRequest = {
  id: string;
  businessId: string;
  mailJobId: string;
  requiredRole: string;
  status: ApprovalStatus;
  requestedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  reason?: string;
};

export function canExecuteMail(status: ApprovalStatus, requiresApproval: boolean): boolean {
  return !requiresApproval || status === "approved";
}

export function approve(
  request: ApprovalRequest,
  actorId: string,
  actorRoles: readonly string[],
  now = new Date(),
): ApprovalRequest {
  if (request.status !== "pending") throw new Error(`Approval ${request.id} is not pending`);
  if (!actorId.trim()) throw new Error("An approving actor is required");
  if (!actorRoles.some((role) => role.trim() === request.requiredRole.trim())) {
    throw new Error(`Approving actor lacks required role: ${request.requiredRole}`);
  }
  return { ...request, status: "approved", decidedAt: now.toISOString(), decidedBy: actorId.trim() };
}

export function reject(
  request: ApprovalRequest,
  actorId: string,
  reason: string,
  now = new Date(),
): ApprovalRequest {
  if (request.status !== "pending") throw new Error(`Approval ${request.id} is not pending`);
  if (!actorId.trim()) throw new Error("A rejecting actor is required");
  if (!reason.trim()) throw new Error("A rejection reason is required");
  return { ...request, status: "rejected", decidedAt: now.toISOString(), decidedBy: actorId.trim(), reason: reason.trim() };
}
