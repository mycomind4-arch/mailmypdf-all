/**
 * Zod-validated schemas for LLM structured output.
 *
 * Every important LLM operation must produce output validated by one of
 * these schemas. Free-form LLM output cannot directly drive workflow
 * behavior — it must pass through structured validation first.
 *
 * If the LLM returns malformed output, the schema parser rejects it,
 * and the workflow continues with the deterministic analysis only.
 */

import { z } from "zod";

// ── Classification ───────────────────────────────────────────────────────

export const llmClassificationSchema = z.object({
  type: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
  provenance: z
    .enum([
      "user_provided",
      "extracted",
      "inferred",
      "verified",
      "ai_suggested",
      "llm_generated",
      "externally_sourced",
    ])
    .default("llm_generated"),
});
export type LLMClassification = z.infer<typeof llmClassificationSchema>;

// ── Fact Extraction ─────────────────────────────────────────────────────

export const llmExtractedFactSchema = z.object({
  label: z.string(),
  value: z.string(),
  sourceExcerpt: z.string().optional(),
  confidence: z.number().min(0).max(1),
  provenance: z
    .enum([
      "user_provided",
      "extracted",
      "inferred",
      "verified",
      "ai_suggested",
      "llm_generated",
      "externally_sourced",
    ])
    .default("llm_generated"),
});
export type LLMExtractedFact = z.infer<typeof llmExtractedFactSchema>;

export const llmFactExtractionResultSchema = z.object({
  facts: z.array(llmExtractedFactSchema),
  parties: z
    .array(z.object({ name: z.string(), role: z.string().optional() }))
    .optional(),
  amounts: z
    .array(z.object({ amount: z.string(), context: z.string().optional() }))
    .optional(),
  obligations: z.array(z.string()).optional(),
  deadlines: z.array(z.string()).optional(),
  representations: z.array(z.string()).optional(),
  admissions: z.array(z.string()).optional(),
  disputedFacts: z.array(z.string()).optional(),
  requestedRemedies: z.array(z.string()).optional(),
  referencedDocuments: z.array(z.string()).optional(),
  contradictions: z.array(z.string()).optional(),
  importantClauses: z.array(z.string()).optional(),
});
export type LLMFactExtractionResult = z.infer<
  typeof llmFactExtractionResultSchema
>;

// ── Finding ─────────────────────────────────────────────────────────────

export const llmFindingSchema = z.object({
  id: z.string(),
  finding: z.string(),
  severity: z.enum(["high", "medium", "low"]),
  state: z.enum([
    "confirmed",
    "discrepancy",
    "missing",
    "ambiguous",
    "requires_verification",
    "unsupported",
  ]),
  supportingEvidence: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1),
  sourceExcerpt: z.string().optional(),
});
export type LLMFinding = z.infer<typeof llmFindingSchema>;

// ── Timeline ────────────────────────────────────────────────────────────

export const llmTimelineEventSchema = z.object({
  event: z.string(),
  date: z.string().optional(),
  description: z.string(),
  sourceExcerpt: z.string().optional(),
  confidence: z.number().min(0).max(1),
  source: z
    .enum([
      "user_provided",
      "extracted",
      "inferred",
      "verified",
      "ai_suggested",
      "llm_generated",
      "externally_sourced",
    ])
    .default("llm_generated"),
});
export type LLMTimelineEvent = z.infer<typeof llmTimelineEventSchema>;

// ── Risk ────────────────────────────────────────────────────────────────

export const llmRiskSchema = z.object({
  risk: z.string(),
  severity: z.enum(["high", "medium", "low"]),
  basis: z.string(),
  support: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
});
export type LLMRisk = z.infer<typeof llmRiskSchema>;

// ── Strategy Recommendation ─────────────────────────────────────────────

export const llmStrategyRecommendationSchema = z.object({
  recommendation: z.string(),
  basis: z.string(),
  supportingFacts: z.array(z.string()).optional(),
  supportingEvidence: z.array(z.string()).optional(),
  uncertainties: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
});
export type LLMStrategyRecommendation = z.infer<
  typeof llmStrategyRecommendationSchema
>;

// ── Draft Assistance ────────────────────────────────────────────────────

export const llmDraftAssistanceSchema = z.object({
  suggestedLanguage: z.string(),
  supportingFacts: z.array(z.string()).optional(),
  supportingEvidence: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
  unsupportedAssertions: z.array(z.string()).optional(),
});
export type LLMDraftAssistance = z.infer<typeof llmDraftAssistanceSchema>;

// ── Full Analysis (combined result) ─────────────────────────────────────

export const llmAnalysisResultSchema = z.object({
  classification: llmClassificationSchema,
  facts: z.array(llmExtractedFactSchema),
  findings: z.array(llmFindingSchema),
  timeline: z.array(llmTimelineEventSchema),
  risks: z.array(llmRiskSchema),
  strategy: z.array(llmStrategyRecommendationSchema),
  draftAssistance: llmDraftAssistanceSchema.optional(),
});
export type LLMAnalysisResult = z.infer<typeof llmAnalysisResultSchema>;

// ── Authority ───────────────────────────────────────────────────────────

export const llmAuthoritySchema = z.object({
  source: z.string(),
  jurisdiction: z.string().optional(),
  authorityType: z.string().optional(),
  citation: z.string().optional(),
  retrievedAt: z.string().optional(),
  contentHash: z.string().optional(),
  summary: z.string().optional(),
  implications: z.string().optional(),
  provenance: z
    .enum([
      "user_provided",
      "extracted",
      "inferred",
      "verified",
      "ai_suggested",
      "llm_generated",
      "externally_sourced",
    ])
    .default("externally_sourced"),
});
export type LLMAuthority = z.infer<typeof llmAuthoritySchema>;

// ── Parse helper with error recovery ─────────────────────────────────────

/**
 * Attempts to parse LLM output as JSON and validate against a Zod schema.
 * Returns null on parse failure — the caller should fall back to
 * deterministic analysis.
 */
export function parseStructuredOutput<T>(
  content: string,
  schema: z.ZodType<T>,
): T | null {
  try {
    // Strip markdown code fences if present
    let json = content.trim();
    if (json.startsWith("```")) {
      json = json.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }
    const parsed = JSON.parse(json);
    return schema.parse(parsed);
  } catch {
    return null;
  }
}
