import type { RuleAuthorityReference } from "@mailmypdf/jurisdiction-rules";
import type { SecuredTransactionSourceRef } from "../types.js";

export interface PriorityRemediationIssue {
  id: string;
  code: string;
  description: string;
  sourceRefs: readonly SecuredTransactionSourceRef[];
  severity: "info" | "warning" | "blocking";
}

export interface PriorityRemediationCandidate {
  id: string;
  issueId: string;
  actionCode: string;
  description: string;
  authorityRefs: readonly RuleAuthorityReference[];
  requiredFacts?: readonly string[];
  unresolvedFacts?: readonly string[];
}

export interface PriorityRemediationReadiness {
  status: "ready-for-review" | "human-review-required" | "blocked";
  issues: readonly PriorityRemediationIssue[];
  candidates: readonly PriorityRemediationCandidate[];
  uncoveredIssueIds: readonly string[];
  reasons: readonly string[];
  requiresHumanReview: boolean;
  canExecute: false;
  cureDetermined: false;
}

export function assessPriorityRemediationReadiness(input: {
  issues: readonly PriorityRemediationIssue[];
  candidates: readonly PriorityRemediationCandidate[];
}): PriorityRemediationReadiness {
  if (input.issues.length === 0) {
    return {
      status: "blocked",
      issues: [],
      candidates: [],
      uncoveredIssueIds: [],
      reasons: ["No sourced priority/perfection defect or maintenance issue was supplied."],
      requiresHumanReview: false,
      canExecute: false,
      cureDetermined: false,
    };
  }

  const malformedIssues = input.issues.filter(
    (issue) =>
      !issue.id.trim() ||
      !issue.code.trim() ||
      !issue.description.trim() ||
      issue.sourceRefs.length === 0,
  );
  if (malformedIssues.length > 0) {
    return {
      status: "human-review-required",
      issues: input.issues,
      candidates: input.candidates,
      uncoveredIssueIds: malformedIssues.map((issue) => issue.id),
      reasons: ["One or more remediation issues are missing source provenance or required identifiers."],
      requiresHumanReview: true,
      canExecute: false,
      cureDetermined: false,
    };
  }

  const issueIds = new Set(input.issues.map((issue) => issue.id));
  const validCandidates = input.candidates.filter(
    (candidate) =>
      candidate.id.trim() &&
      issueIds.has(candidate.issueId) &&
      candidate.actionCode.trim() &&
      candidate.description.trim() &&
      candidate.authorityRefs.length > 0,
  );

  const uncoveredIssueIds = input.issues
    .filter((issue) => !validCandidates.some((candidate) => candidate.issueId === issue.id))
    .map((issue) => issue.id);

  if (uncoveredIssueIds.length > 0) {
    return {
      status: "blocked",
      issues: input.issues,
      candidates: validCandidates,
      uncoveredIssueIds,
      reasons: [
        `No authority-linked remediation candidate covers issue(s): ${uncoveredIssueIds.join(", ")}.`,
      ],
      requiresHumanReview: false,
      canExecute: false,
      cureDetermined: false,
    };
  }

  const candidatesWithUnresolvedFacts = validCandidates.filter(
    (candidate) => (candidate.unresolvedFacts?.length ?? 0) > 0,
  );

  return {
    status: candidatesWithUnresolvedFacts.length > 0
      ? "human-review-required"
      : "ready-for-review",
    issues: input.issues,
    candidates: validCandidates,
    uncoveredIssueIds: [],
    reasons: [
      "Each sourced issue has at least one authority-linked remediation candidate.",
      ...(candidatesWithUnresolvedFacts.length
        ? ["One or more candidates still depend on unresolved facts."]
        : []),
      "The remediation plan remains review-only; this assessment does not determine that a proposed action will cure the issue.",
    ],
    requiresHumanReview: true,
    canExecute: false,
    cureDetermined: false,
  };
}
