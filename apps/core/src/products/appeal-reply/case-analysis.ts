/**
 * AppealReply Case Analysis — Intelligence Model
 *
 * The structured output of Phase B's intelligence layer.
 * Transforms the verified decision + user's explanation into an organized
 * case analysis: what's wrong, what supports the user, what's missing,
 * and what needs to be addressed.
 *
 * This is NOT the final appeal letter — it's the analytical foundation
 * for Phase C (evidence-linked drafting).
 */

import { z } from "zod";

// ── Confidence (reused from intelligence.ts) ──────────────────────────────────

export const ConfidenceSchema = z.enum(["high", "medium", "low"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

// ── Issue Identification ──────────────────────────────────────────────────────

export const IssueStatusSchema = z.enum(["needs_verification", "supported", "unresolved"]);
export type IssueStatus = z.infer<typeof IssueStatusSchema>;

export const AppealIssueSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  importance: ConfidenceSchema,
  supportingEvidence: z.string().default(""),
  contraryEvidence: z.string().default(""),
  status: IssueStatusSchema.default("needs_verification"),
});
export type AppealIssue = z.infer<typeof AppealIssueSchema>;

// ── Strength / Weakness ───────────────────────────────────────────────────────

export const AppealPointSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  whyItMatters: z.string().default(""),
  needsVerification: z.string().optional(),
  whatWouldHelp: z.string().optional(),
});
export type AppealPoint = z.infer<typeof AppealPointSchema>;

// ── Evidence Mapping ──────────────────────────────────────────────────────────

export const EvidenceSourceSchema = z.enum(["decision", "user", "general"]);
export type EvidenceSource = z.infer<typeof EvidenceSourceSchema>;

export const EvidenceRequestSchema = z.object({
  what: z.string().min(1),
  why: z.string().min(1),
  source: EvidenceSourceSchema.default("general"),
  priority: ConfidenceSchema.default("medium"),
});
export type EvidenceRequest = z.infer<typeof EvidenceRequestSchema>;

// ── Contradiction Detection ───────────────────────────────────────────────────

export const ContradictionSchema = z.object({
  claim: z.string().min(1),
  conflictingInformation: z.string().min(1),
  sourceA: z.string().default("decision"),
  sourceB: z.string().default("user statement"),
  importance: ConfidenceSchema.default("medium"),
  needsVerification: z.boolean().default(true),
});
export type Contradiction = z.infer<typeof ContradictionSchema>;

// ── User Questions ────────────────────────────────────────────────────────────

export const UserQuestionSchema = z.object({
  question: z.string().min(1),
  why: z.string().default(""),
});
export type UserQuestion = z.infer<typeof UserQuestionSchema>;

// ── Potential Appeal Grounds ──────────────────────────────────────────────────

export const SupportLevelSchema = z.enum(["strong", "moderate", "speculative"]);
export type SupportLevel = z.infer<typeof SupportLevelSchema>;

export const AppealGroundSchema = z.object({
  type: z.string().min(1),
  description: z.string().min(1),
  supportLevel: SupportLevelSchema.default("moderate"),
});
export type AppealGround = z.infer<typeof AppealGroundSchema>;

// ── Recommended Actions ───────────────────────────────────────────────────────

export const ActionStatusSchema = z.enum(["pending", "completed", "skipped"]);
export type ActionStatus = z.infer<typeof ActionStatusSchema>;

export const RecommendedActionSchema = z.object({
  priority: z.number().int().min(1),
  action: z.string().min(1),
  reason: z.string().default(""),
  status: ActionStatusSchema.default("pending"),
});
export type RecommendedAction = z.infer<typeof RecommendedActionSchema>;

// ── Decision Summary Block ────────────────────────────────────────────────────

export const DecisionSummaryBlockSchema = z.object({
  whatWasDecided: z.string().default(""),
  statedReason: z.string().default(""),
  decisionMaker: z.string().default(""),
  deadline: z.string().default(""),
  appealMechanism: z.string().default(""),
});
export type DecisionSummaryBlock = z.infer<typeof DecisionSummaryBlockSchema>;

// ── Full Case Analysis ─────────────────────────────────────────────────────────

export const AppealCaseAnalysisSchema = z.object({
  caseSummary: z.string().min(1),
  decision: DecisionSummaryBlockSchema,
  issues: z.array(AppealIssueSchema).default([]),
  strengths: z.array(AppealPointSchema).default([]),
  weaknesses: z.array(AppealPointSchema).default([]),
  missingEvidence: z.array(EvidenceRequestSchema).default([]),
  contradictions: z.array(ContradictionSchema).default([]),
  userQuestions: z.array(UserQuestionSchema).default([]),
  potentialGrounds: z.array(AppealGroundSchema).default([]),
  recommendedActions: z.array(RecommendedActionSchema).default([]),
  warnings: z.array(z.string()).default([]),
});
export type AppealCaseAnalysis = z.infer<typeof AppealCaseAnalysisSchema>;

// ── API Input ────────────────────────────────────────────────────────────────

export const VerifiedFactsSchema = z.object({
  decisionType: z.string().default(""),
  decisionDate: z.string().default(""),
  deadline: z.string().default(""),
  decisionMaker: z.string().default(""),
  reason: z.string().default(""),
});
export type VerifiedFacts = z.infer<typeof VerifiedFactsSchema>;

export const AnalyzeCaseInputSchema = z.object({
  decisionAnalysis: z.record(z.unknown()).optional(),
  verifiedFacts: VerifiedFactsSchema,
  grounds: z.string().min(1, "User's grounds for appeal are required"),
  evidence: z.array(z.record(z.unknown())).default([]),
});
export type AnalyzeCaseInput = z.infer<typeof AnalyzeCaseInputSchema>;
