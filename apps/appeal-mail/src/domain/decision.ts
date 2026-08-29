import { z } from "zod";

/* ─────────────────────────────────────────────
   Decision — the document being appealed.
   This is the source of truth for the entire appeal.
   ───────────────────────────────────────────── */

export const decisionTypeSchema = z.enum([
  "government_benefit",
  "licensing",
  "agency_ruling",
  "claim_denial",
  "court_ruling",
  "reconsideration",
]);
export type DecisionType = z.infer<typeof decisionTypeSchema>;

/* A single fact extracted from the decision document */
export const decisionFactSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  source: z.enum(["extracted", "user_provided", "inferred"]),
  confidence: z.number().min(0).max(1),
  sourceExcerpt: z.string().optional(),
});
export type DecisionFact = z.infer<typeof decisionFactSchema>;

/* A reason the decision-maker gave for the decision */
export const decisionReasonSchema = z.object({
  id: z.string(),
  text: z.string(),
  citedRule: z.string().optional(),
  sourceExcerpt: z.string().optional(),
  confidence: z.number().min(0).max(1),
});
export type DecisionReason = z.infer<typeof decisionReasonSchema>;

export const deadlineSchema = z.object({
  date: z.string().optional(),
  type: z.enum(["appeal", "reconsideration", "filing"]),
  daysRemaining: z.number().optional(),
  source: z.enum(["extracted", "user_provided", "inferred"]),
  appealInstructions: z.string().optional(),
});
export type Deadline = z.infer<typeof deadlineSchema>;

/* A timeline event reconstructed from the decision */
export const timelineEventSchema = z.object({
  id: z.string(),
  date: z.string(),
  description: z.string(),
  source: z.enum(["extracted", "user_provided", "inferred"]),
});
export type TimelineEvent = z.infer<typeof timelineEventSchema>;

/* An issue or ambiguity identified in the decision */
export const decisionIssueSchema = z.object({
  id: z.string(),
  description: z.string(),
  type: z.enum([
    "ambiguity",
    "contradiction",
    "missing_information",
    "procedural_error",
    "factual_dispute",
    "uncited_authority",
  ]),
  severity: z.enum(["high", "medium", "low"]),
  sourceExcerpt: z.string().optional(),
});
export type DecisionIssue = z.infer<typeof decisionIssueSchema>;

export const decisionSchema = z.object({
  id: z.string(),
  type: decisionTypeSchema,
  documentId: z.string().optional(),
  documentFilename: z.string().optional(),
  agency: z.string().optional(),
  referenceNumber: z.string().optional(),
  decisionDate: z.string().optional(),
  decisionTypeLabel: z.string().optional(),
  deadline: deadlineSchema.optional(),
  facts: z.array(decisionFactSchema).default([]),
  reasons: z.array(decisionReasonSchema).default([]),
  citedRules: z.array(z.string()).default([]),
  appealInstructions: z.string().optional(),
  chronology: z.array(timelineEventSchema).default([]),
  issues: z.array(decisionIssueSchema).default([]),
  extractedAt: z.string().optional(),
  extractionConfidence: z.number().min(0).max(1).default(0),
  rawText: z.string().optional(),
});
export type Decision = z.infer<typeof decisionSchema>;

/* ── Helpers ── */

export function createDecision(type: DecisionType, partial?: Partial<Decision>): Decision {
  return decisionSchema.parse({
    id: crypto.randomUUID(),
    type,
    facts: [],
    reasons: [],
    citedRules: [],
    chronology: [],
    issues: [],
    extractionConfidence: 0,
    ...partial,
  });
}

export function daysUntilDeadline(deadline?: Deadline): number | null {
  if (!deadline?.date) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(deadline.date);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function deadlineStatus(deadline?: Deadline): "unknown" | "urgent" | "soon" | "ok" | "expired" {
  const days = daysUntilDeadline(deadline);
  if (days === null) return "unknown";
  if (days < 0) return "expired";
  if (days <= 7) return "urgent";
  if (days <= 30) return "soon";
  return "ok";
}
