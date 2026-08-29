import { z } from "zod";

/* ═══════════════════════════════════════════════════════════
   CASE HEALTH — multi-dimensional case assessment.
   Honest status labels, no false precision.
   ═══════════════════════════════════════════════════════════ */

export const healthDimensionSchema = z.object({
  name: z.string(),
  label: z.string(),
  score: z.number().min(0).max(100),
  status: z.enum(["good", "warning", "poor", "unknown"]),
  detail: z.string(),
  isHeuristic: z.boolean().default(true),
});
export type HealthDimension = z.infer<typeof healthDimensionSchema>;

export const healthStatusSchema = z.enum([
  "ready",
  "needs_review",
  "incomplete",
  "conflicting",
  "high_risk",
]);
export type HealthStatus = z.infer<typeof healthStatusSchema>;

export const caseHealthSchema = z.object({
  id: z.string(),
  overallScore: z.number().min(0).max(100),
  status: healthStatusSchema,
  dimensions: z.array(healthDimensionSchema),
  summary: z.string(),
  isHeuristic: z.boolean().default(true),
  createdAt: z.string(),
});
export type CaseHealth = z.infer<typeof caseHealthSchema>;

export interface HealthInput {
  facts: { id: string; label: string; value: string; confidence: string; userConfirmed: boolean }[];
  evidence: { id: string; label: string }[];
  deadlines: { date?: string; certainty: string }[];
  findings: { severity: string; userReviewed: boolean; userDismissed: boolean }[];
  contradictions: { status: string; severity: string }[];
  missingInfo: { status: string; impact: string }[];
  readinessScore: number;
  readinessState: string;
  hasDraft: boolean;
  draftWordCount: number;
}

export function assessCaseHealth(input: HealthInput): CaseHealth {
  const dimensions: HealthDimension[] = [];

  /* ── Document Quality ── */
  const docScore = input.hasDraft ? Math.min(100, 50 + input.draftWordCount) : 0;
  dimensions.push({
    name: "document_quality",
    label: "Document Quality",
    score: docScore,
    status: docScore >= 70 ? "good" : docScore >= 40 ? "warning" : "poor",
    detail: input.hasDraft ? `Draft has ${input.draftWordCount} words.` : "No draft generated.",
    isHeuristic: true,
  });

  /* ── Fact Completeness ── */
  const confirmedFacts = input.facts.filter((f) => f.userConfirmed || f.confidence === "high");
  const factScore = input.facts.length > 0
    ? Math.round((confirmedFacts.length / input.facts.length) * 100)
    : 0;
  dimensions.push({
    name: "fact_completeness",
    label: "Fact Completeness",
    score: factScore,
    status: factScore >= 80 ? "good" : factScore >= 50 ? "warning" : "poor",
    detail: `${confirmedFacts.length}/${input.facts.length} facts confirmed.`,
    isHeuristic: true,
  });

  /* ── Evidence Completeness ── */
  const evidenceScore = Math.min(100, input.evidence.length * 25);
  dimensions.push({
    name: "evidence_completeness",
    label: "Evidence Completeness",
    score: evidenceScore,
    status: evidenceScore >= 75 ? "good" : evidenceScore >= 25 ? "warning" : "poor",
    detail: `${input.evidence.length} evidence item(s) attached.`,
    isHeuristic: true,
  });

  /* ── Deadline Certainty ── */
  const primaryDeadline = input.deadlines[0];
  let deadlineScore = 0;
  let deadlineStatus: HealthDimension["status"] = "unknown";
  if (primaryDeadline?.date && primaryDeadline.certainty === "explicit") {
    deadlineScore = 100; deadlineStatus = "good";
  } else if (primaryDeadline?.date && primaryDeadline.certainty === "calculated") {
    deadlineScore = 70; deadlineStatus = "warning";
  } else if (primaryDeadline?.date && primaryDeadline.certainty === "inferred") {
    deadlineScore = 50; deadlineStatus = "warning";
  } else if (primaryDeadline?.certainty === "ambiguous") {
    deadlineScore = 30; deadlineStatus = "poor";
  } else {
    deadlineScore = 0; deadlineStatus = "poor";
  }
  dimensions.push({
    name: "deadline_certainty",
    label: "Deadline Certainty",
    score: deadlineScore,
    status: deadlineStatus,
    detail: primaryDeadline?.date
      ? `Deadline: ${primaryDeadline.date} (${primaryDeadline.certainty})`
      : "No deadline identified.",
    isHeuristic: true,
  });

  /* ── Contradictions ── */
  const unresolvedContradictions = input.contradictions.filter((c) => c.status === "unresolved");
  const contradictionScore = Math.max(0, 100 - unresolvedContradictions.length * 30);
  dimensions.push({
    name: "contradictions",
    label: "Contradictions",
    score: contradictionScore,
    status: unresolvedContradictions.length === 0 ? "good" : unresolvedContradictions.length <= 1 ? "warning" : "poor",
    detail: unresolvedContradictions.length === 0
      ? "No contradictions detected."
      : `${unresolvedContradictions.length} unresolved contradiction(s).`,
    isHeuristic: true,
  });

  /* ── Missing Information ── */
  const blockingMissing = input.missingInfo.filter((m) => m.status === "missing" && m.impact === "blocking");
  const totalMissing = input.missingInfo.filter((m) => m.status === "missing");
  const missingScore = Math.max(0, 100 - totalMissing.length * 10 - blockingMissing.length * 20);
  dimensions.push({
    name: "missing_information",
    label: "Missing Information",
    score: missingScore,
    status: blockingMissing.length === 0 && totalMissing.length <= 2 ? "good" : blockingMissing.length > 0 ? "poor" : "warning",
    detail: `${totalMissing.length} missing item(s), ${blockingMissing.length} blocking.`,
    isHeuristic: true,
  });

  /* ── Response Readiness ── */
  dimensions.push({
    name: "response_readiness",
    label: "Response Readiness",
    score: input.readinessScore,
    status: input.readinessScore >= 80 ? "good" : input.readinessScore >= 50 ? "warning" : "poor",
    detail: `Readiness: ${input.readinessState.replace(/_/g, " ")} (${input.readinessScore}/100)`,
    isHeuristic: true,
  });

  /* ── Overall ── */
  const overallScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length,
  );

  /* Determine status (honest, no false precision) */
  let status: HealthStatus;
  if (blockingMissing.length > 0 || unresolvedContradictions.some((c) => c.severity === "critical")) {
    status = "high_risk";
  } else if (unresolvedContradictions.length > 0) {
    status = "conflicting";
  } else if (overallScore >= 80) {
    status = "ready";
  } else if (overallScore >= 50) {
    status = "needs_review";
  } else {
    status = "incomplete";
  }

  const summary = buildHealthSummary(dimensions, overallScore, status);

  return caseHealthSchema.parse({
    id: crypto.randomUUID(),
    overallScore,
    status,
    dimensions,
    summary,
    isHeuristic: true,
    createdAt: new Date().toISOString(),
  });
}

function buildHealthSummary(dimensions: HealthDimension[], overallScore: number, status: HealthStatus): string {
  const lines: string[] = [];
  lines.push(`Case health: ${status.toUpperCase()} (${overallScore}/100)`);
  lines.push("Scores are heuristic-based, not statistically validated.");
  const poor = dimensions.filter((d) => d.status === "poor");
  const warning = dimensions.filter((d) => d.status === "warning");
  if (poor.length > 0) lines.push(`Needs attention: ${poor.map((d) => d.label).join(", ")}`);
  if (warning.length > 0) lines.push(`Review recommended: ${warning.map((d) => d.label).join(", ")}`);
  return lines.join(" ");
}

export const HEALTH_STATUS_META: Record<HealthStatus, { label: string; color: string; description: string }> = {
  ready: { label: "Ready", color: "green", description: "Case is ready for response generation." },
  needs_review: { label: "Needs Review", color: "amber", description: "Some items need verification before proceeding." },
  incomplete: { label: "Incomplete", color: "yellow", description: "Critical information is missing." },
  conflicting: { label: "Conflicting", color: "red", description: "Contradictions detected that need resolution." },
  high_risk: { label: "High Risk", color: "red", description: "Blocking issues prevent proceeding." },
};
