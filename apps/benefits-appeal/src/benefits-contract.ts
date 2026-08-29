/** Benefits Appeal domain layer.
 * Shared Appeal/FairProcess infrastructure should supply documents, provenance,
 * timelines, deadlines, evidence storage, review, filing, and proof.
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
  evidenceIds: string[];
  authoritativeSources: string[];
};

export type BenefitsCaseInput = {
  decision: {
    id: string;
    text: string;
    decisionDate?: string;
    deadline?: string;
    agency?: string;
    caseNumber?: string;
    process?: string;
  };
  supportingDocuments: Array<{ id: string; text: string }>;
  jurisdiction?: string;
};

export type BenefitsCase = {
  decisionId: string;
  decisionDate?: string;
  deadline?: string;
  agency?: string;
  caseNumber?: string;
  process?: string;
  jurisdiction?: string;
  issues: BenefitsIssue[];
};

export function extractBenefitsCase(input: BenefitsCaseInput): BenefitsCase {
  const lines = input.decision.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const issues = lines.filter((line) => /denied|reduced|terminated|discontinued|ineligible|overpayment|reason/i.test(line)).map((line, index) => ({
    id: `${input.decision.id}:issue:${index + 1}`,
    statement: line,
    status: "unmapped" as const,
    evidenceIds: [],
    authoritativeSources: [],
  }));

  return {
    decisionId: input.decision.id,
    decisionDate: input.decision.decisionDate,
    deadline: input.decision.deadline,
    agency: input.decision.agency,
    caseNumber: input.decision.caseNumber,
    process: input.decision.process,
    jurisdiction: input.jurisdiction,
    issues,
  };
}

export function canDraftBenefitsAppeal(caseData: BenefitsCase): boolean {
  return caseData.issues.length > 0 && caseData.issues.every((issue) => {
    if (issue.status === "excluded") return true;
    if (issue.status !== "supported" && issue.status !== "draft_ready") return false;
    return issue.evidenceIds.some((id) => id.trim().length > 0);
  });
}

export function canValidateBenefitsAppeal(caseData: BenefitsCase): boolean {
  return canDraftBenefitsAppeal(caseData) && caseData.issues.every((issue) =>
    issue.status !== "needs_authority",
  );
}

export function assertNoOutcomeClaims(text: string): void {
  const prohibited = [
    /you\s+will\s+win/i,
    /guarantee[sd]?\s+(?:approval|benefits|eligibility)/i,
    /definitely\s+(?:eligible|entitled)/i,
  ];
  if (prohibited.some((pattern) => pattern.test(text))) {
    throw new Error("Appeal draft contains an unsupported eligibility or outcome claim");
  }
}
