import { z } from "zod";
import type { WorkflowId } from "./workflows";

export const matterStatusSchema = z.enum([
  "draft",
  "validated",
  "review",
  "approved",
  "payment_pending",
  "submitted",
  "tracking",
  "completed",
  "failed",
  "cancelled",
]);
export type MatterStatus = z.infer<typeof matterStatusSchema>;

export const matterSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  workflowId: z.string().min(1),
  documentId: z.string().min(1),
  title: z.string().min(1),
  status: matterStatusSchema,
  version: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  approvedAt: z.string().datetime().nullable(),
  approvedDraftHash: z.string().nullable(),
  draftHash: z.string().nullable(),
  submittedAt: z.string().datetime().nullable(),
  providerOrderId: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  proofHash: z.string().nullable(),
});
export type PrivateOfficeMatter = Omit<
  z.infer<typeof matterSchema>,
  "workflowId"
> & { workflowId: WorkflowId };

const transitions: Record<MatterStatus, readonly MatterStatus[]> = {
  draft: ["validated", "cancelled"],
  validated: ["review", "cancelled"],
  review: ["approved", "validated", "cancelled"],
  approved: ["payment_pending", "review", "cancelled"],
  payment_pending: ["submitted", "failed", "cancelled"],
  submitted: ["tracking", "failed"],
  tracking: ["completed", "failed"],
  completed: [],
  failed: ["review", "payment_pending", "cancelled"],
  cancelled: [],
};

export function canTransitionMatter(
  from: MatterStatus,
  to: MatterStatus,
): boolean {
  return transitions[from].includes(to);
}

export function transitionMatter(
  current: PrivateOfficeMatter,
  next: MatterStatus,
  now = new Date().toISOString(),
  fields: Partial<
    Pick<
      PrivateOfficeMatter,
      | "providerOrderId"
      | "trackingNumber"
      | "proofHash"
      | "draftHash"
      | "approvedDraftHash"
    >
  > = {},
): PrivateOfficeMatter {
  if (!canTransitionMatter(current.status, next))
    throw new Error(
      `Invalid matter transition: ${current.status} -> ${next}`,
    );
  const nextMatter: PrivateOfficeMatter = {
    ...current,
    ...fields,
    status: next,
    version: current.version + 1,
    updatedAt: now,
  };
  if (next === "approved") {
    nextMatter.approvedAt = now;
    // Capture the draft hash at approval time so we can detect post-approval modification.
    if (fields.draftHash !== undefined) {
      nextMatter.approvedDraftHash = fields.draftHash;
    }
    // If no draftHash was supplied, use the current draftHash on the matter.
    if (!nextMatter.approvedDraftHash && nextMatter.draftHash) {
      nextMatter.approvedDraftHash = nextMatter.draftHash;
    }
    if (!nextMatter.approvedDraftHash)
      throw new Error("Cannot approve matter without a draft hash");
  }
  if (next === "submitted") {
    if (!nextMatter.providerOrderId)
      throw new Error("Submitted matter must record providerOrderId");
    nextMatter.submittedAt = now;
  }
  if (next === "tracking" && !nextMatter.trackingNumber)
    throw new Error("Tracking matter must record trackingNumber");
  if (next === "completed" && !nextMatter.proofHash)
    throw new Error("Completed matter must record proofHash");
  return nextMatter;
}
