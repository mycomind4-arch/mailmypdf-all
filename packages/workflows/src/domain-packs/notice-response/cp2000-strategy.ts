import type { Cp2000AnalysisResult, Cp2000NoticeFacts } from "./cp2000-analysis.js";
import type { Cp2000EvidenceChecklist } from "./cp2000-evidence.js";
import { CP2000_RESEARCH_SOURCES } from "./cp2000-research.js";

export type Cp2000ResponseMode = "agree" | "disagree" | "partial-agreement";
export type Cp2000StrategyPosition =
  | "agree_all"
  | "disagree_some"
  | "disagree_all"
  | "insufficient_info";

export interface Cp2000StrategyInput {
  notice: Cp2000NoticeFacts;
  analysis: Cp2000AnalysisResult;
  evidence: Cp2000EvidenceChecklist;
  responseMode?: Cp2000ResponseMode | null;
  extractionConfident: boolean;
  userObjective?: string | null;
}

export interface Cp2000StrategyPlan {
  position: Cp2000StrategyPosition;
  issues: readonly string[];
  evidenceToInclude: readonly string[];
  explanations: readonly string[];
  requestedActions: readonly string[];
  supportingSourceIds: readonly string[];
  riskFlags: readonly string[];
  unresolvedIssues: readonly string[];
  confidence: "high" | "medium" | "low";
}

/**
 * Derives a response plan from selected user intent and analyzed facts.
 * It never selects an agreement/disagreement position on the user's behalf.
 */
export function planCp2000Response(input: Cp2000StrategyInput): Cp2000StrategyPlan {
  const issues: string[] = [];
  const evidenceToInclude: string[] = [];
  const explanations: string[] = [];
  const requestedActions: string[] = [];
  const riskFlags: string[] = [];
  const unresolvedIssues: string[] = [];
  const mismatches = input.analysis.discrepancies.filter((item) => item.type === "amount_mismatch");
  const requiredMissing = input.evidence.items.filter(
    (item) => item.requirement === "required" && item.state === "missing",
  );

  let position: Cp2000StrategyPosition = "insufficient_info";
  if (!input.extractionConfident) {
    riskFlags.push("The notice classification or extraction is not sufficiently confident.");
    unresolvedIssues.push("Verify the controlling document before finalizing the response.");
  } else if (!input.responseMode) {
    riskFlags.push("No response position has been selected.");
    unresolvedIssues.push("Select agree, disagree, or partial agreement before drafting.");
  } else {
    position = input.responseMode === "agree"
      ? "agree_all"
      : input.responseMode === "partial-agreement"
        ? "disagree_some"
        : "disagree_all";
  }

  for (const discrepancy of input.analysis.discrepancies) {
    issues.push(discrepancy.description);
    evidenceToInclude.push(...discrepancy.evidenceNeeded);
  }
  for (const evidence of requiredMissing) {
    explanations.push(`${evidence.label} is required but has not been provided.`);
  }
  if (requiredMissing.length > 0) {
    riskFlags.push("Required supporting evidence is missing.");
    unresolvedIssues.push("Provide or explicitly review each required evidence item before mailing.");
  }
  if (!input.notice.responseDate) {
    riskFlags.push("No printed response date was found in the notice data.");
    requestedActions.push("Locate and verify the response date on the controlling notice.");
  }
  if (mismatches.length > 0 && position === "agree_all") {
    riskFlags.push("The selected agreement position does not resolve the analyzed income mismatch.");
  }
  if (position === "disagree_all" || position === "disagree_some") {
    requestedActions.push("Identify the proposed items being disputed and explain the factual basis.");
    requestedActions.push("Include only records that actually support the disputed items.");
  }
  if (position === "agree_all") {
    requestedActions.push("Follow the response instructions printed on the notice.");
  }
  requestedActions.push("Keep copies of all documents submitted.");

  const sourceIds = CP2000_RESEARCH_SOURCES
    .filter((source) => source.id === "irs.cp2000-series" || source.id === "irs.topic-652" || source.id === "irs.pub-5181")
    .map((source) => source.id);
  const confidence = riskFlags.length === 0 && unresolvedIssues.length === 0
    ? "high"
    : riskFlags.length <= 2
      ? "medium"
      : "low";

  return {
    position,
    issues: [...new Set(issues)],
    evidenceToInclude: [...new Set(evidenceToInclude)],
    explanations,
    requestedActions: [...new Set(requestedActions)],
    supportingSourceIds: sourceIds,
    riskFlags,
    unresolvedIssues,
    confidence,
  };
}
