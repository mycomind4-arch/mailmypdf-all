import type { SecuredTransactionFinding } from "../types.js";
import { isEvidenceReadySecuredTransactionFinding } from "../findings/index.js";

export interface SecuredTransactionMatterCertification {
  status: "ready-for-next-workflow" | "human-review-required" | "blocked";
  requiredFindingIds: readonly string[];
  missingFindingIds: readonly string[];
  nonReadyFindingIds: readonly string[];
  reviewFindingIds: readonly string[];
  reasons: readonly string[];
  canProceedToNextWorkflow: boolean;
  canProceedToConsequentialAction: false;
}

export function certifySecuredTransactionMatter(input: {
  findings: readonly SecuredTransactionFinding[];
  requiredFindingIds: readonly string[];
}): SecuredTransactionMatterCertification {
  const byId = new Map(input.findings.map((finding) => [finding.id, finding]));
  const requiredFindingIds = [...new Set(input.requiredFindingIds)];
  const missingFindingIds = requiredFindingIds.filter((id) => !byId.has(id));
  const present = requiredFindingIds
    .map((id) => byId.get(id))
    .filter((finding): finding is SecuredTransactionFinding => Boolean(finding));
  const nonReadyFindingIds = present
    .filter((finding) => !isEvidenceReadySecuredTransactionFinding(finding))
    .map((finding) => finding.id);
  const reviewFindingIds = present
    .filter((finding) => finding.requiresHumanReview)
    .map((finding) => finding.id);

  const canProceedToNextWorkflow =
    missingFindingIds.length === 0 &&
    nonReadyFindingIds.length === 0;

  const reasons: string[] = [];
  if (missingFindingIds.length) {
    reasons.push(`Required finding(s) are missing: ${missingFindingIds.join(", ")}.`);
  }
  if (nonReadyFindingIds.length) {
    reasons.push(`Required finding(s) are not evidence-ready: ${nonReadyFindingIds.join(", ")}.`);
  }
  if (reviewFindingIds.length) {
    reasons.push(`Required finding(s) need human review: ${reviewFindingIds.join(", ")}.`);
  }

  return {
    status: canProceedToNextWorkflow
      ? "ready-for-next-workflow"
      : reviewFindingIds.length > 0
        ? "human-review-required"
        : "blocked",
    requiredFindingIds,
    missingFindingIds,
    nonReadyFindingIds,
    reviewFindingIds,
    reasons,
    canProceedToNextWorkflow,
    canProceedToConsequentialAction: false,
  };
}
