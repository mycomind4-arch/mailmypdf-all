import { z } from "zod";
import { decisionSchema, type Decision } from "./decision";
import { appealGroundSchema, type AppealGround } from "./ground";
import { evidenceSchema, type Evidence } from "./evidence";
import { argumentSchema, type Argument } from "./argument";
import { readinessReviewSchema, type ReadinessReview } from "./review";
import { appealPacketSchema, type AppealPacket } from "./packet";
import { proofPacketSchema, type ProofPacket } from "./proof";
import type { WorkflowId } from "./workflows";

export const appealStatusSchema = z.enum(["draft","in_progress","ready","mailed","delivered","archived"]);
export type AppealStatus = z.infer<typeof appealStatusSchema>;

export const appealSchema = z.object({
  id: z.string(), workflowId: z.string().min(1), status: appealStatusSchema.default("draft"), decision: decisionSchema,
  grounds: z.array(appealGroundSchema).default([]), evidence: z.array(evidenceSchema).default([]),
  arguments: z.array(argumentSchema).default([]), draft: z.string().default(""), review: readinessReviewSchema.optional(),
  packet: appealPacketSchema.optional(), proof: proofPacketSchema.optional(), timeline: z.array(z.object({
    id: z.string(), date: z.string(), description: z.string(), source: z.enum(["system","user","extraction"]),
  })).default([]), createdAt: z.string(), updatedAt: z.string(),
});
export type Appeal = z.infer<typeof appealSchema>;

export function createAppeal(workflowId: WorkflowId, decision: Decision): Appeal {
  const now = new Date().toISOString();
  return appealSchema.parse({ id: crypto.randomUUID(), workflowId, status: "draft", decision, grounds: [], evidence: [], arguments: [], draft: "", timeline: [], createdAt: now, updatedAt: now });
}

export function canPersistMailedStatus(appeal: Appeal): boolean {
  const proof = appeal.proof;
  if (!proof) return false;
  if (!proof.providerOrderId?.trim()) return false;
  if (!proof.mailingTimestamp?.trim()) return false;
  return proof.status === "mailed" || proof.status === "in_transit" || proof.status === "delivered";
}

export function updateAppeal(appeal: Appeal, updates: Partial<Appeal>): Appeal {
  const next = appealSchema.parse({...appeal,...updates,updatedAt:new Date().toISOString()});
  if ((updates.status === "mailed" || updates.status === "delivered") && !canPersistMailedStatus(next)) {
    throw new Error("Cannot mark appeal as mailed or delivered without provider order, mailing timestamp, and provider-backed proof status");
  }
  return next;
}

export function isReadyToMail(appeal: Appeal): boolean {
  if (appeal.status !== "ready" || !appeal.review) return false;
  const issues = appeal.review.issuesRequiringAttention; const score = appeal.review.score;
  return (score >= 60 && issues === 0) || (score >= 80 && issues <= 2);
}

export function inferProgress(appeal: Appeal): number {
  let progress = 0;
  if (appeal.decision.facts.length > 0 || appeal.decision.agency) progress += 15;
  if (appeal.decision.deadline?.date) progress += 10;
  if (appeal.decision.reasons.length > 0) progress += 10;
  if (appeal.grounds.length > 0) progress += 20;
  if (appeal.evidence.length > 0) progress += 15;
  if (appeal.draft.length > 50) progress += 15;
  if (appeal.review) progress += 10;
  if (appeal.packet) progress += 5;
  return Math.min(100, progress);
}
