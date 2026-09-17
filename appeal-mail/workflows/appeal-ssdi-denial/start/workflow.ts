export const SSDI_WORKFLOW_ID = "appeal-ssdi-denial";
export const SSDI_VERTICAL_ID = "appeal-mail";

export const SSDI_STEPS = [
  { id: "decision", label: "Decision" },
  { id: "analysis", label: "Analysis" },
  { id: "claimant", label: "Claimant facts" },
  { id: "evidence", label: "Evidence" },
  { id: "draft", label: "Draft" },
  { id: "forms", label: "SSA forms" },
  { id: "review", label: "Review" },
  { id: "mail", label: "Pay & mail" },
] as const;

export type SsdiStepId = (typeof SSDI_STEPS)[number]["id"];

export const SSDI_REQUIRED_FORMS = [
  {
    kind: "ssa_561",
    label: "SSA-561-U2 — Request for Reconsideration",
    filename: "ssa-561-u2.pdf",
    bundledMailReadyFilename: "ssa-561-u2.normalized.pdf",
    href: new URL("../forms/generated/ssa-561-u2.normalized.pdf", import.meta.url).href,
  },
  {
    kind: "ssa_3441",
    label: "SSA-3441 — Disability Report — Appeal",
    filename: "ssa-3441.pdf",
    bundledMailReadyFilename: "ssa-3441.normalized.pdf",
    href: new URL("../forms/generated/ssa-3441.normalized.pdf", import.meta.url).href,
  },
  {
    kind: "ssa_827",
    label: "SSA-827 — Authorization to Disclose Information",
    filename: "ssa-827.pdf",
    bundledMailReadyFilename: "ssa-827.normalized.pdf",
    href: new URL("../forms/generated/ssa-827.normalized.pdf", import.meta.url).href,
  },
] as const;

export type SsdiOfficialFormKind = (typeof SSDI_REQUIRED_FORMS)[number]["kind"];

export const SSDI_EVIDENCE_KINDS = [
  ["medical_records", "Medical records"],
  ["physician_statement", "Physician statement"],
  ["test_results", "Test results"],
  ["medication_history", "Medication history"],
  ["functional_capacity", "Functional capacity information"],
  ["work_history", "Work history"],
  ["prior_decision", "Prior SSA decision"],
  ["correspondence", "Correspondence"],
  ["other", "Other supporting document"],
] as const;

export type SsdiEvidenceKind = (typeof SSDI_EVIDENCE_KINDS)[number][0];

export type SsdiDecisionBasis = "medical" | "nonmedical" | "unknown";

export function isSsdiReconsiderationStage(value: unknown): boolean {
  return value === "reconsideration";
}

export function isSupportedSsdiDecisionBasis(value: unknown): value is Exclude<SsdiDecisionBasis, "unknown"> {
  return value === "medical" || value === "nonmedical";
}

export function requiredSsdiFormsForBasis(basis: SsdiDecisionBasis) {
  if (basis === "medical") return [...SSDI_REQUIRED_FORMS];
  if (basis === "nonmedical") return SSDI_REQUIRED_FORMS.filter((form) => form.kind === "ssa_561");
  return [];
}

export function hasRequiredSsdiForms(
  documents: readonly {
    evidence_kind: string | null;
    included: boolean;
    usable: boolean;
    security_status: string;
  }[],
  basis: SsdiDecisionBasis,
): boolean {
  const required = requiredSsdiFormsForBasis(basis);
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

export function ssdiCompletedSteps(input: {
  hasCleanDecision: boolean;
  hasReconsiderationAnalysis: boolean;
  hasClaimantFacts: boolean;
  hasDraft: boolean;
  hasRequiredForms: boolean;
  hasApproval: boolean;
}): SsdiStepId[] {
  const completed: SsdiStepId[] = [];
  if (input.hasCleanDecision) completed.push("decision");
  if (input.hasReconsiderationAnalysis) completed.push("analysis");
  if (input.hasClaimantFacts) completed.push("claimant");
  if (input.hasClaimantFacts) completed.push("evidence");
  if (input.hasDraft) completed.push("draft");
  if (input.hasRequiredForms) completed.push("forms");
  if (input.hasApproval) completed.push("review");
  return completed;
}
