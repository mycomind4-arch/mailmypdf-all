export const SSI_WORKFLOW_ID = "appeal-ssi-denial";
export const SSI_VERTICAL_ID = "appeal-mail";

export const SSI_STEPS = [
  { id: "decision", label: "Decision" },
  { id: "analysis", label: "Analysis" },
  { id: "claimant", label: "Claimant facts" },
  { id: "evidence", label: "Evidence" },
  { id: "draft", label: "Draft" },
  { id: "forms", label: "SSA forms" },
  { id: "review", label: "Review" },
  { id: "mail", label: "Pay & mail" },
] as const;

export type SsiStepId = (typeof SSI_STEPS)[number]["id"];

/**
 * SSI and SSDI reconsideration use the same normalized SSA forms. Until the
 * official-form assets are promoted into a package-level asset catalog, reuse
 * the already normalized, security-reviewed files instead of duplicating PDFs.
 */
export const SSI_REQUIRED_FORMS = [
  {
    kind: "ssa_561",
    label: "SSA-561-U2 — Request for Reconsideration",
    filename: "ssa-561-u2.pdf",
    bundledMailReadyFilename: "ssa-561-u2.normalized.pdf",
    href: new URL("../../appeal-ssdi-denial/forms/generated/ssa-561-u2.normalized.pdf", import.meta.url).href,
  },
  {
    kind: "ssa_3441",
    label: "SSA-3441 — Disability Report — Appeal",
    filename: "ssa-3441.pdf",
    bundledMailReadyFilename: "ssa-3441.normalized.pdf",
    href: new URL("../../appeal-ssdi-denial/forms/generated/ssa-3441.normalized.pdf", import.meta.url).href,
  },
  {
    kind: "ssa_827",
    label: "SSA-827 — Authorization to Disclose Information",
    filename: "ssa-827.pdf",
    bundledMailReadyFilename: "ssa-827.normalized.pdf",
    href: new URL("../../appeal-ssdi-denial/forms/generated/ssa-827.normalized.pdf", import.meta.url).href,
  },
] as const;

export type SsiOfficialFormKind = (typeof SSI_REQUIRED_FORMS)[number]["kind"];

export const SSI_EVIDENCE_KINDS = [
  ["medical_records", "Medical records"],
  ["physician_statement", "Physician statement"],
  ["test_results", "Test results"],
  ["medication_history", "Medication history"],
  ["functional_capacity", "Functional capacity information"],
  ["income_resources", "Income and resource records"],
  ["living_arrangement", "Living arrangement records"],
  ["identity_eligibility", "Identity or eligibility records"],
  ["prior_decision", "Prior SSA decision"],
  ["correspondence", "Correspondence"],
  ["other", "Other supporting document"],
] as const;

export type SsiEvidenceKind = (typeof SSI_EVIDENCE_KINDS)[number][0];
export type SsiDecisionBasis = "medical" | "nonmedical" | "unknown";

export function isSsiReconsiderationStage(value: unknown): boolean {
  return value === "reconsideration";
}

export function isSupportedSsiDecisionBasis(value: unknown): value is Exclude<SsiDecisionBasis, "unknown"> {
  return value === "medical" || value === "nonmedical";
}

export function requiredSsiFormsForBasis(basis: SsiDecisionBasis) {
  if (basis === "medical") return [...SSI_REQUIRED_FORMS];
  if (basis === "nonmedical") return SSI_REQUIRED_FORMS.filter((form) => form.kind === "ssa_561");
  return [];
}

export function hasRequiredSsiForms(
  documents: readonly {
    evidence_kind: string | null;
    included: boolean;
    usable: boolean;
    security_status: string;
  }[],
  basis: SsiDecisionBasis,
): boolean {
  const required = requiredSsiFormsForBasis(basis);
  return required.length > 0 && required.every((form) =>
    documents.some(
      (document) =>
        document.evidence_kind === form.kind &&
        document.included &&
        document.usable &&
        document.security_status === "clean",
    ),
  );
}

export function ssiCompletedSteps(input: {
  hasCleanDecision: boolean;
  hasReconsiderationAnalysis: boolean;
  hasClaimantFacts: boolean;
  hasDraft: boolean;
  hasRequiredForms: boolean;
  hasApproval: boolean;
}): SsiStepId[] {
  const completed: SsiStepId[] = [];
  if (input.hasCleanDecision) completed.push("decision");
  if (input.hasReconsiderationAnalysis) completed.push("analysis");
  if (input.hasClaimantFacts) completed.push("claimant");
  if (input.hasClaimantFacts) completed.push("evidence");
  if (input.hasDraft) completed.push("draft");
  if (input.hasRequiredForms) completed.push("forms");
  if (input.hasApproval) completed.push("review");
  return completed;
}
