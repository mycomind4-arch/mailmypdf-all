import { z } from "zod";

/* ─────────────────────────────────────────────
   Appeal Ground — a specific reason the decision
   should be reversed or modified.
   ───────────────────────────────────────────── */

export const groundTypeSchema = z.enum([
  "factual_error",
  "procedural_error",
  "legal_error",
  "new_evidence",
  "insufficient_weight",
  "misapplied_rule",
  "contradictory_finding",
  "incomplete_review",
]);
export type GroundType = z.infer<typeof groundTypeSchema>;

export const GROUND_TYPE_LABELS: Record<GroundType, string> = {
  factual_error: "Factual Error",
  procedural_error: "Procedural Error",
  legal_error: "Legal Error",
  new_evidence: "New Evidence",
  insufficient_weight: "Insufficient Weight Given to Evidence",
  misapplied_rule: "Misapplied Rule or Regulation",
  contradictory_finding: "Contradictory Finding",
  incomplete_review: "Incomplete Review",
};

export const GROUND_TYPE_DESCRIPTIONS: Record<GroundType, string> = {
  factual_error: "The decision relies on a fact that is incorrect or unsupported.",
  procedural_error: "The required process was not followed.",
  legal_error: "The wrong legal standard was applied.",
  new_evidence: "New information not considered in the original decision.",
  insufficient_weight: "Relevant evidence was not given adequate consideration.",
  misapplied_rule: "A rule or regulation was applied incorrectly to your situation.",
  contradictory_finding: "The decision contains internal contradictions.",
  incomplete_review: "The decision-maker did not review all relevant material.",
};

export const appealGroundSchema = z.object({
  id: z.string(),
  type: groundTypeSchema,
  claim: z.string(),
  source: z.string(),
  supportingEvidenceIds: z.array(z.string()).default([]),
  counterargument: z.string().optional(),
  confidence: z.number().min(0).max(1).default(0.5),
  unresolvedIssue: z.string().optional(),
  userConfirmed: z.boolean().default(false),
  draftLanguage: z.string().default(""),
});
export type AppealGround = z.infer<typeof appealGroundSchema>;

export function createGround(type: GroundType, partial?: Partial<AppealGround>): AppealGround {
  return appealGroundSchema.parse({
    id: crypto.randomUUID(),
    type,
    confidence: 0.5,
    userConfirmed: false,
    draftLanguage: "",
    source: "user_provided",
    supportingEvidenceIds: [],
    ...partial,
  });
}

/* Build the argument paragraph for a ground */
export function groundToParagraph(ground: AppealGround): string {
  const label = GROUND_TYPE_LABELS[ground.type];
  const parts: string[] = [];

  if (ground.claim) parts.push(ground.claim);
  if (ground.source) parts.push(`The decision states: "${ground.source}".`);
  if (ground.counterargument) parts.push(ground.counterargument);

  return parts.join(" ");
}

export function groundsSummary(grounds: AppealGround[]): string {
  if (!grounds.length) return "";
  const lines = grounds.map((g, i) => `${i + 1}. ${GROUND_TYPE_LABELS[g.type]}: ${g.claim}`);
  return lines.join("\n");
}
