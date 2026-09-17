import type { SourceRef } from "@mailmypdf/documents";

/**
 * Benefits Appeal domain contract.
 *
 * Document parsing/extraction intentionally does not live here. The shared
 * document-intelligence layer turns source documents into grounded observations;
 * this contract only models the benefit-decision issues and the fail-closed
 * gates that determine whether those issues are ready for drafting/review.
 */

export type BenefitsIssueStatus =
  | "unmapped"
  | "supported"
  | "unsupported"
  | "needs_authority"
  | "draft_ready"
  | "excluded";

export type BenefitsIssue = {
  id: string;
  statement: string;
  agencyReason?: string;
  status: BenefitsIssueStatus;
  /** Evidence records that support the response to this issue. */
  evidenceIds: readonly string[];
  /** Authority/source records relied on for program-rule propositions. */
  authoritativeSources: readonly string[];
  /** Provenance back to the decision/evidence observations that created the issue. */
  sourceRefs?: readonly SourceRef[];
};

export type BenefitsCase = {
  decisionId: string;
  decisionDate?: string;
  deadline?: string;
  agency?: string;
  caseNumber?: string;
  process?: string;
  jurisdiction?: string;
  issues: readonly BenefitsIssue[];
};

export type CreateBenefitsCaseInput = Omit<BenefitsCase, "issues"> & {
  issues: readonly BenefitsIssue[];
};

function nonEmpty(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasUsableEvidence(issue: BenefitsIssue): boolean {
  return issue.evidenceIds.some((id) => nonEmpty(id));
}

/**
 * Creates a Benefits case from already-structured, provenance-aware inputs.
 * It does not infer issues from untrusted raw document text.
 */
export function createBenefitsCase(input: CreateBenefitsCaseInput): BenefitsCase {
  if (!nonEmpty(input.decisionId)) {
    throw new Error("Benefits case requires a decision id");
  }

  const seen = new Set<string>();
  const issues = input.issues.map((issue) => {
    if (!nonEmpty(issue.id)) throw new Error("Benefits issue requires an id");
    if (!nonEmpty(issue.statement)) throw new Error(`Benefits issue ${issue.id} requires a statement`);
    if (seen.has(issue.id)) throw new Error(`Duplicate Benefits issue id: ${issue.id}`);
    seen.add(issue.id);

    return {
      ...issue,
      evidenceIds: [...issue.evidenceIds],
      authoritativeSources: [...issue.authoritativeSources],
      sourceRefs: issue.sourceRefs ? [...issue.sourceRefs] : undefined,
    };
  });

  return {
    ...input,
    decisionId: input.decisionId.trim(),
    issues,
  };
}

/**
 * Drafting fails closed until every non-excluded issue is supported by at least
 * one evidence record. Unsupported, unmapped, or authority-pending issues cannot
 * silently flow into generated correspondence.
 */
export function canDraftBenefitsAppeal(caseData: BenefitsCase): boolean {
  return caseData.issues.length > 0 && caseData.issues.every((issue) => {
    if (issue.status === "excluded") return true;
    if (issue.status !== "supported" && issue.status !== "draft_ready") return false;
    return hasUsableEvidence(issue);
  });
}

/**
 * Validation is stricter than drafting: any issue explicitly marked as needing
 * authority blocks final validation until that authority gap is resolved.
 */
export function canValidateBenefitsAppeal(caseData: BenefitsCase): boolean {
  return canDraftBenefitsAppeal(caseData) && caseData.issues.every(
    (issue) => issue.status !== "needs_authority",
  );
}

/**
 * Blocks categorical benefit/eligibility outcome promises in generated drafts.
 * This is a guardrail, not a substitute for grounded drafting/validation.
 */
export function assertNoBenefitsOutcomeClaims(text: string): void {
  const prohibited = [
    /you\s+will\s+win/i,
    /guarantee[sd]?\s+(?:approval|benefits|eligibility)/i,
    /definitely\s+(?:eligible|entitled)/i,
  ];

  if (prohibited.some((pattern) => pattern.test(text))) {
    throw new Error("Benefits appeal draft contains an unsupported eligibility or outcome claim");
  }
}
