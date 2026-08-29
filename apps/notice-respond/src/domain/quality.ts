import { z } from "zod";

/* ═══════════════════════════════════════════════════════════
   RESPONSE QUALITY ENGINE
   Evaluates generated responses before they become final.
   Scores are heuristic-based, not statistically validated.
   ═══════════════════════════════════════════════════════════ */

export const qualityDimensionSchema = z.object({
  name: z.string(),
  score: z.number().min(0).max(100),
  label: z.string(),
  description: z.string(),
  issues: z.array(z.string()).default([]),
  isHeuristic: z.boolean().default(true),
});
export type QualityDimension = z.infer<typeof qualityDimensionSchema>;

export const qualityReportSchema = z.object({
  id: z.string(),
  overallScore: z.number().min(0).max(100),
  dimensions: z.array(qualityDimensionSchema),
  unresolvedPlaceholders: z.number().default(0),
  missingInformationCount: z.number().default(0),
  unsupportedAssertionsCount: z.number().default(0),
  internalContradictionsCount: z.number().default(0),
  passed: z.boolean().default(false),
  threshold: z.number().default(70),
  summary: z.string(),
  createdAt: z.string(),
  isHeuristic: z.boolean().default(true),
});
export type QualityReport = z.infer<typeof qualityReportSchema>;

export interface QualityEvaluationInput {
  draftContent: string;
  facts: { id: string; label: string; value: string; confidence: string; userConfirmed: boolean }[];
  evidence: { id: string; label: string }[];
  deadline?: { date?: string; certainty: string };
  agency?: string;
  referenceNumber?: string;
  noticeDate?: string;
  selectedStrategyType?: string;
  userObjective?: string;
  unresolvedPlaceholders: { placeholder: string; reason: string }[];
}

export function evaluateResponseQuality(input: QualityEvaluationInput): QualityReport {
  const dimensions: QualityDimension[] = [];
  const content = input.draftContent || "";
  const lowerContent = content.toLowerCase();

  /* ── Factual Consistency ──
     How many extracted facts appear in the response? */
  const confirmedFacts = input.facts.filter((f) => f.userConfirmed || f.confidence === "high");
  const factsReferenced = confirmedFacts.filter((f) =>
    content.includes(f.value) || lowerContent.includes(f.value.toLowerCase()),
  );
  const factScore = confirmedFacts.length > 0
    ? Math.round((factsReferenced.length / confirmedFacts.length) * 100)
    : 100;
  dimensions.push({
    name: "factual_consistency",
    score: factScore,
    label: "Factual Consistency",
    description: `${factsReferenced.length}/${confirmedFacts.length} confirmed facts referenced in response.`,
    issues: confirmedFacts
      .filter((f) => !content.includes(f.value) && !lowerContent.includes(f.value.toLowerCase()))
      .map((f) => `Fact "${f.label}" (${f.value}) not found in response`),
    isHeuristic: true,
  });

  /* ── Evidence Coverage ──
     Does the response reference evidence? */
  const evidenceKeywords = input.evidence.map((e) => e.label.toLowerCase());
  const evidenceMentioned = evidenceKeywords.filter((kw) =>
    lowerContent.includes(kw) || lowerContent.includes("exhibit") || lowerContent.includes("enclosed") || lowerContent.includes("attachment"),
  );
  const evidenceScore = input.evidence.length > 0
    ? Math.min(100, Math.round((evidenceMentioned.length / Math.max(1, input.evidence.length)) * 100) + (lowerContent.includes("enclosed") ? 20 : 0))
    : content.includes("SUPPORTING DOCUMENTATION")
      ? 80
      : 50;
  dimensions.push({
    name: "evidence_coverage",
    score: Math.min(100, evidenceScore),
    label: "Evidence Coverage",
    description: input.evidence.length > 0
      ? `${evidenceMentioned.length}/${input.evidence.length} evidence items referenced.`
      : "No evidence attached.",
    issues: evidenceScore < 70 && input.evidence.length > 0 ? ["Response should reference attached evidence"] : [],
    isHeuristic: true,
  });

  /* ── Deadline Consistency ── */
  let deadlineScore = 100;
  const deadlineIssues: string[] = [];
  if (input.deadline?.date && content) {
    if (!content.includes(input.deadline.date) && !lowerContent.includes("deadline")) {
      deadlineScore = 70;
      deadlineIssues.push("Response deadline not mentioned in draft");
    }
  }
  if (input.deadline?.certainty === "missing" || input.deadline?.certainty === "ambiguous") {
    deadlineScore = Math.min(deadlineScore, 60);
    deadlineIssues.push("Deadline certainty is low — verify before finalizing");
  }
  dimensions.push({
    name: "deadline_consistency",
    score: deadlineScore,
    label: "Deadline Consistency",
    description: input.deadline?.date
      ? `Deadline ${input.deadline.date} referenced.`
      : "No deadline identified.",
    issues: deadlineIssues,
    isHeuristic: true,
  });

  /* ── Missing Information ── */
  const missingInfoCount = input.unresolvedPlaceholders.length;
  const missingScore = Math.max(0, 100 - missingInfoCount * 15);
  dimensions.push({
    name: "missing_information",
    score: missingScore,
    label: "Completeness",
    description: `${missingInfoCount} unresolved placeholder(s) in draft.`,
    issues: input.unresolvedPlaceholders.map((p) => `[${p.placeholder}]: ${p.reason}`),
    isHeuristic: true,
  });

  /* ── Unsupported Assertions ──
     Check for claims not backed by facts */
  const unsupportedCount = detectUnsupportedAssertions(content, input.facts, input.evidence);
  const unsupportedScore = Math.max(0, 100 - unsupportedCount * 20);
  dimensions.push({
    name: "unsupported_assertions",
    score: unsupportedScore,
    label: "Evidence Backing",
    description: `${unsupportedCount} potential unsupported assertion(s) detected.`,
    issues: unsupportedCount > 0 ? ["Some claims may not be backed by extracted facts or evidence"] : [],
    isHeuristic: true,
  });

  /* ── Internal Contradictions ── */
  const contradictions = detectInternalContradictions(content);
  const contradictionScore = Math.max(0, 100 - contradictions * 25);
  dimensions.push({
    name: "internal_contradictions",
    score: contradictionScore,
    label: "Internal Consistency",
    description: `${contradictions} potential internal contradiction(s).`,
    issues: contradictions > 0 ? ["Response may contain contradictory statements"] : [],
    isHeuristic: true,
  });

  /* ── Format Validity ── */
  let formatScore = 100;
  const formatIssues: string[] = [];
  if (content.length < 50) { formatScore = 20; formatIssues.push("Response is too short"); }
  if (content.length > 10000) { formatScore -= 10; formatIssues.push("Response is very long"); }
  if (!content.includes("\n")) { formatScore -= 20; formatIssues.push("Response lacks paragraph breaks"); }
  if (!/Dear (Sir|Madam|Mr\.|Ms\.|Dr\.|To Whom)/i.test(content)) {
    formatScore -= 15; formatIssues.push("Missing formal salutation");
  }
  if (!/Sincerely|Respectfully|Regards/i.test(content)) {
    formatScore -= 10; formatIssues.push("Missing formal closing");
  }
  dimensions.push({
    name: "format_validity",
    score: Math.max(0, formatScore),
    label: "Format Validity",
    description: "Structural completeness of the response letter.",
    issues: formatIssues,
    isHeuristic: true,
  });

  /* ── Tone ── */
  let toneScore = 100;
  const toneIssues: string[] = [];
  const aggressiveWords = /\b(stupid|incompetent|ridiculous|absurd|moron|idiot|liar|fraud|illegal)\b/i;
  if (aggressiveWords.test(content)) {
    toneScore = 40;
    toneIssues.push("Response contains aggressive or unprofessional language");
  }
  const overlyCasual = /\b(yeah|nah|lol|ok\s+so|hey\s+there|what's\s+up)\b/i;
  if (overlyCasual.test(content)) {
    toneScore -= 20;
    toneIssues.push("Response contains overly casual language");
  }
  dimensions.push({
    name: "tone",
    score: Math.max(0, toneScore),
    label: "Professional Tone",
    description: "Appropriateness of tone for official correspondence.",
    issues: toneIssues,
    isHeuristic: true,
  });

  /* ── Overall score ── */
  const overallScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length,
  );

  const passed = overallScore >= 70 && missingInfoCount === 0;

  const summary = buildSummary(dimensions, overallScore, missingInfoCount, unsupportedCount, contradictions, passed);

  return qualityReportSchema.parse({
    id: crypto.randomUUID(),
    overallScore,
    dimensions,
    unresolvedPlaceholders: missingInfoCount,
    missingInformationCount: missingInfoCount,
    unsupportedAssertionsCount: unsupportedCount,
    internalContradictionsCount: contradictions,
    passed,
    threshold: 70,
    summary,
    createdAt: new Date().toISOString(),
    isHeuristic: true,
  });
}

/* ── Helper: detect unsupported assertions ── */
function detectUnsupportedAssertions(
  content: string,
  facts: { label: string; value: string }[],
  evidence: { label: string }[],
): number {
  let count = 0;
  // Check for absolute claims that aren't backed by facts
  const absolutePatterns = [
    /\b(?:I never|I did not|I have never|this is false|this is incorrect|these allegations are (?:false|baseless|without merit))\b/i,
  ];
  for (const pattern of absolutePatterns) {
    const matches = content.match(new RegExp(pattern.source, "gi"));
    if (matches) {
      // Each absolute claim should be backed by at least one fact
      // This is a heuristic — we count claims that exceed fact count
      if (matches.length > facts.length) count += matches.length - facts.length;
    }
  }
  return count;
}

/* ── Helper: detect internal contradictions ── */
function detectInternalContradictions(content: string): number {
  let count = 0;
  // Date contradictions
  const dates = content.match(/\b\d{4}-\d{2}-\d{2}\b/g) || [];
  const uniqueDates = new Set(dates);
  // If many different dates appear, there might be confusion (not a strong signal alone)
  // Look for explicit contradictory language
  if (/\b(?:however|but|contradicts?|conflicts? with)\b.*\b(?:however|but|contradicts?|conflicts? with)\b/i.test(content)) {
    count++;
  }
  // Check for contradictory amounts
  const amounts = content.match(/\$[\d,]+\.\d{2}/g) || [];
  if (new Set(amounts).size > 3 && content.match(/(?:correct|incorrect|wrong|error)/i)) {
    count++;
  }
  return count;
}

/* ── Helper: build summary ── */
function buildSummary(
  dimensions: QualityDimension[],
  overallScore: number,
  missingCount: number,
  unsupportedCount: number,
  contradictions: number,
  passed: boolean,
): string {
  const lines: string[] = [];
  lines.push(`Overall quality score: ${overallScore}/100 (heuristic-based, not statistically validated)`);
  if (passed) {
    lines.push("Response PASSED quality gate.");
  } else {
    lines.push("Response DID NOT PASS quality gate.");
  }
  if (missingCount > 0) lines.push(`${missingCount} unresolved placeholder(s) remain.`);
  if (unsupportedCount > 0) lines.push(`${unsupportedCount} potentially unsupported assertion(s).`);
  if (contradictions > 0) lines.push(`${contradictions} potential internal contradiction(s).`);
  const lowDimensions = dimensions.filter((d) => d.score < 70);
  if (lowDimensions.length > 0) {
    lines.push(`Lowest dimensions: ${lowDimensions.map((d) => `${d.label} (${d.score})`).join(", ")}`);
  }
  return lines.join(" ");
}
