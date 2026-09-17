export const SSDI_WORKFLOW_ID = "ssdi-denial";
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
    href: "/workflow-assets/appeal-ssdi-denial/ssa-561-u2.pdf",
  },
  {
    kind: "ssa_3441",
    label: "SSA-3441 — Disability Report — Appeal",
    filename: "ssa-3441.pdf",
    href: "/workflow-assets/appeal-ssdi-denial/ssa-3441.pdf",
  },
  {
    kind: "ssa_827",
    label: "SSA-827 — Authorization to Disclose Information",
    filename: "ssa-827.pdf",
    href: "/workflow-assets/appeal-ssdi-denial/ssa-827.pdf",
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

export function isSsdiReconsiderationStage(value: unknown): boolean {
  return value === "reconsideration";
}

export function hasRequiredSsdiForms(
  documents: readonly { evidence_kind: string | null; included: boolean; usable: boolean }[],
): boolean {
  return SSDI_REQUIRED_FORMS.every((form) =>
    documents.some(
      (document) =>
        document.evidence_kind === form.kind &&
        document.included &&
        document.usable,
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
  // Evidence is intentionally optional; the user may have no additional
  // records to enclose. The step is complete once claimant facts are saved.
  if (input.hasClaimantFacts) completed.push("evidence");
  if (input.hasDraft) completed.push("draft");
  if (input.hasRequiredForms) completed.push("forms");
  if (input.hasApproval) completed.push("review");
  return completed;
}
