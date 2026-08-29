import { z } from "zod";

/* ═══════════════════════════════════════════════════════════
   EXPLAINABILITY — "Why?" explanations for every major
   system conclusion. Lets users understand what the system
   knows and why it believes something.
   ═══════════════════════════════════════════════════════════ */

export const explanationTypeSchema = z.enum([
  "deadline",
  "strategy",
  "response",
  "fact",
  "finding",
  "readiness",
  "contradiction",
  "missing_info",
  "quality",
  "health",
]);
export type ExplanationType = z.infer<typeof explanationTypeSchema>;

export const explanationStepSchema = z.object({
  label: z.string(),
  detail: z.string(),
  source: z.string().optional(),       // where this step comes from
  confidence: z.enum(["high", "medium", "low", "unverified"]).optional(),
});
export type ExplanationStep = z.infer<typeof explanationStepSchema>;

export const explanationSchema = z.object({
  id: z.string(),
  type: explanationTypeSchema,
  title: z.string(),
  summary: z.string(),
  steps: z.array(explanationStepSchema),
  assumptions: z.array(z.string()).default([]),
  confidence: z.enum(["high", "medium", "low", "unverified"]),
  isVerified: z.boolean().default(false),
  createdAt: z.string(),
});
export type Explanation = z.infer<typeof explanationSchema>;

export function createExplanation(params: {
  type: ExplanationType;
  title: string;
  summary: string;
  steps: ExplanationStep[];
  assumptions?: string[];
  confidence?: Explanation["confidence"];
  isVerified?: boolean;
}): Explanation {
  return explanationSchema.parse({
    id: crypto.randomUUID(),
    type: params.type,
    title: params.title,
    summary: params.summary,
    steps: params.steps,
    assumptions: params.assumptions || [],
    confidence: params.confidence || "medium",
    isVerified: params.isVerified || false,
    createdAt: new Date().toISOString(),
  });
}

/* ── Why this deadline? ── */

export function explainDeadline(params: {
  date: string;
  source?: string;
  rule?: string;
  calculationMethod?: string;
  certainty: string;
  startDate?: string;
  daysWindow?: number;
  businessDays?: boolean;
}): Explanation {
  const steps: ExplanationStep[] = [];

  steps.push({
    label: "Source",
    detail: params.source || "Deadline was identified from the notice text.",
    confidence: params.certainty === "explicit" ? "high" : params.certainty === "calculated" ? "medium" : "low",
  });

  if (params.calculationMethod) {
    steps.push({
      label: "Calculation method",
      detail: params.calculationMethod,
      source: "computed",
      confidence: "medium",
    });
  }

  if (params.daysWindow) {
    steps.push({
      label: "Interval",
      detail: `${params.daysWindow} ${params.businessDays ? "business" : "calendar"} days${params.startDate ? ` from ${params.startDate}` : ""}`,
      confidence: "medium",
    });
  }

  steps.push({
    label: "Resulting date",
    detail: params.date,
    source: params.calculationMethod ? "computed" : "extracted",
    confidence: params.certainty === "explicit" ? "high" : "medium",
  });

  const assumptions: string[] = [];
  if (params.certainty === "calculated" && params.startDate) {
    assumptions.push(`Assumes the counting period starts on ${params.startDate}`);
  }
  if (params.businessDays) {
    assumptions.push("Business days exclude weekends. Federal holidays are not accounted for.");
  }
  if (params.certainty === "ambiguous") {
    assumptions.push("The deadline language was ambiguous. This interpretation may not be correct.");
  }
  if (params.certainty === "missing") {
    assumptions.push("No deadline was found in the notice. This date may not exist.");
  }

  return createExplanation({
    type: "deadline",
    title: "Why this deadline?",
    summary: `Response deadline: ${params.date} (certainty: ${params.certainty})`,
    steps,
    assumptions,
    confidence: params.certainty === "explicit" ? "high" : params.certainty === "calculated" ? "medium" : "unverified",
    isVerified: params.certainty === "explicit",
  });
}

/* ── Why this strategy? ── */

export function explainStrategy(params: {
  strategyType: string;
  strategyLabel: string;
  reason: string;
  relevantFacts: { label: string; value: string }[];
  evidence: { label: string }[];
  constraints: string[];
  missingInfo: string[];
}): Explanation {
  const steps: ExplanationStep[] = [];

  steps.push({
    label: "Strategy",
    detail: params.strategyLabel,
  });

  steps.push({
    label: "Reasoning",
    detail: params.reason,
    confidence: "medium",
  });

  if (params.relevantFacts.length > 0) {
    steps.push({
      label: "Relevant facts",
      detail: params.relevantFacts.map((f) => `${f.label}: ${f.value}`).join("; "),
      source: "extracted",
    });
  }

  if (params.evidence.length > 0) {
    steps.push({
      label: "Supporting evidence",
      detail: params.evidence.map((e) => e.label).join(", "),
      source: "uploaded",
    });
  }

  if (params.constraints.length > 0) {
    steps.push({
      label: "Constraints",
      detail: params.constraints.join("; "),
      confidence: "high",
    });
  }

  if (params.missingInfo.length > 0) {
    steps.push({
      label: "Missing information",
      detail: params.missingInfo.join("; "),
      confidence: "low",
    });
  }

  return createExplanation({
    type: "strategy",
    title: "Why this strategy?",
    summary: `${params.strategyLabel} was recommended based on the analysis.`,
    steps,
    assumptions: params.constraints,
    confidence: "medium",
  });
}

/* ── Why this response? ── */

export function explainResponse(params: {
  userObjective?: string;
  noticeRequirements: string[];
  supportingEvidence: { label: string }[];
  strategyUsed: string;
  factsIncluded: number;
  placeholdersRemaining: number;
}): Explanation {
  const steps: ExplanationStep[] = [];

  steps.push({
    label: "User objective",
    detail: params.userObjective || "No specific objective stated.",
    source: "user",
  });

  steps.push({
    label: "Strategy",
    detail: `Response follows the "${params.strategyUsed}" strategy.`,
    source: "selected",
  });

  if (params.noticeRequirements.length > 0) {
    steps.push({
      label: "Notice requirements",
      detail: params.noticeRequirements.join("; "),
    });
  }

  steps.push({
    label: "Facts included",
    detail: `${params.factsIncluded} extracted fact(s) included in the response.`,
    confidence: "medium",
  });

  if (params.supportingEvidence.length > 0) {
    steps.push({
      label: "Supporting evidence",
      detail: params.supportingEvidence.map((e) => e.label).join(", "),
    });
  }

  if (params.placeholdersRemaining > 0) {
    steps.push({
      label: "Unresolved items",
      detail: `${params.placeholdersRemaining} placeholder(s) need user attention.`,
      confidence: "low",
    });
  }

  return createExplanation({
    type: "response",
    title: "Why this response?",
    summary: `Response was generated using the "${params.strategyUsed}" strategy.`,
    steps,
    confidence: params.placeholdersRemaining > 0 ? "medium" : "high",
    isVerified: params.placeholdersRemaining === 0,
  });
}

/* ── Why this readiness state? ── */

export function explainReadiness(params: {
  state: string;
  score: number;
  issuesCount: number;
  blockingCount: number;
  topIssues: string[];
}): Explanation {
  const steps: ExplanationStep[] = [];

  steps.push({
    label: "Current state",
    detail: params.state.replace(/_/g, " "),
    confidence: "high",
  });

  steps.push({
    label: "Score",
    detail: `${params.score}/100 (heuristic-based, not statistically validated)`,
  });

  if (params.blockingCount > 0) {
    steps.push({
      label: "Blocking issues",
      detail: `${params.blockingCount} issue(s) prevent proceeding.`,
      confidence: "high",
    });
  }

  if (params.topIssues.length > 0) {
    steps.push({
      label: "Top issues",
      detail: params.topIssues.join("; "),
    });
  }

  return createExplanation({
    type: "readiness",
    title: "Why this readiness state?",
    summary: `Case is "${params.state.replace(/_/g, " ")}" with score ${params.score}.`,
    steps,
    confidence: "medium",
    isVerified: params.blockingCount === 0 && params.issuesCount === 0,
  });
}

/* ── Why this fact? ── */

export function explainFact(params: {
  label: string;
  value: string;
  source: string;
  confidence: string;
  sourceExcerpt?: string;
  extractionMethod?: string;
}): Explanation {
  const steps: ExplanationStep[] = [];

  steps.push({
    label: "Value",
    detail: params.value,
  });

  steps.push({
    label: "Source",
    detail: params.source === "extracted" ? "Extracted from the uploaded notice" : params.source,
    confidence: params.confidence === "high" ? "high" : "medium",
  });

  if (params.extractionMethod) {
    steps.push({
      label: "Extraction method",
      detail: params.extractionMethod,
    });
  }

  if (params.sourceExcerpt) {
    steps.push({
      label: "Source excerpt",
      detail: params.sourceExcerpt.substring(0, 300),
      source: "document",
    });
  }

  return createExplanation({
    type: "fact",
    title: `Why: ${params.label}?`,
    summary: `"${params.label}" = "${params.value}" (confidence: ${params.confidence})`,
    steps,
    confidence: params.confidence === "high" ? "high" : params.confidence === "medium" ? "medium" : "low",
    isVerified: params.confidence === "high",
  });
}
