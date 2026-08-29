import { z } from "zod";
import type { WorkflowId } from "./workflows";

export const disputeCaseStatusSchema = z.enum(["draft", "validated", "review", "approved", "payment_pending", "submitted", "tracking", "completed", "failed", "cancelled"]);
export type DisputeCaseStatus = z.infer<typeof disputeCaseStatusSchema>;

export const disputeCaseSchema = z.object({
  id: z.string().min(1), ownerId: z.string().min(1), workflowId: z.string().min(1), documentId: z.string().min(1), status: disputeCaseStatusSchema,
  version: z.number().int().positive(), createdAt: z.string().datetime(), updatedAt: z.string().datetime(), approvedAt: z.string().datetime().nullable(), submittedAt: z.string().datetime().nullable(), providerOrderId: z.string().nullable(), trackingNumber: z.string().nullable(), proofHash: z.string().nullable(),
});
export type DisputeCase = Omit<z.infer<typeof disputeCaseSchema>, "workflowId"> & { workflowId: WorkflowId };

const transitions: Record<DisputeCaseStatus, readonly DisputeCaseStatus[]> = {
  draft: ["validated", "cancelled"], validated: ["review", "cancelled"], review: ["approved", "validated", "cancelled"], approved: ["payment_pending", "cancelled"],
  payment_pending: ["submitted", "failed", "cancelled"], submitted: ["tracking", "failed"], tracking: ["completed", "failed"], completed: [], failed: ["review", "payment_pending", "cancelled"], cancelled: [],
};

export function canTransitionCase(from: DisputeCaseStatus, to: DisputeCaseStatus): boolean { return transitions[from].includes(to); }

export function transitionCase(current: DisputeCase, next: DisputeCaseStatus, now = new Date().toISOString(), fields: Partial<Pick<DisputeCase, "providerOrderId" | "trackingNumber" | "proofHash">> = {}): DisputeCase {
  if (!canTransitionCase(current.status, next)) throw new Error(`Invalid dispute case transition: ${current.status} -> ${next}`);
  const nextCase: DisputeCase = { ...current, ...fields, status: next, version: current.version + 1, updatedAt: now };
  if (next === "approved") nextCase.approvedAt = now;
  if (next === "submitted") { if (!nextCase.providerOrderId) throw new Error("Submitted case must record providerOrderId"); nextCase.submittedAt = now; }
  if (next === "tracking" && !nextCase.trackingNumber) throw new Error("Tracking case must record trackingNumber");
  if (next === "completed" && !nextCase.proofHash) throw new Error("Completed case must record proofHash");
  return nextCase;
}
