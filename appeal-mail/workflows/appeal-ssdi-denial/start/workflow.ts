import {
  createOfficialFormRegistry,
  hasRequiredOfficialForms,
  resolveRequiredOfficialFormKinds,
  resolveRequiredOfficialForms,
  type OfficialFormRequirementRule,
} from "@mailmypdf/forms";

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

export const SSDI_OFFICIAL_FORM_REGISTRY = createOfficialFormRegistry([
  {
    kind: "ssa_561",
    agency: "Social Security Administration",
    formNumber: "SSA-561-U2",
    title: "Request for Reconsideration",
    sourceFilename: "ssa-561-u2.pdf",
    mailReadyFilename: "ssa-561-u2.normalized.pdf",
    downloadHref: new URL("../forms/generated/ssa-561-u2.normalized.pdf", import.meta.url).href,
    source: { authority: "Social Security Administration" },
    signatures: ["claimant"],
  },
  {
    kind: "ssa_3441",
    agency: "Social Security Administration",
    formNumber: "SSA-3441",
    title: "Disability Report — Appeal",
    sourceFilename: "ssa-3441.pdf",
    mailReadyFilename: "ssa-3441.normalized.pdf",
    downloadHref: new URL("../forms/generated/ssa-3441.normalized.pdf", import.meta.url).href,
    source: { authority: "Social Security Administration" },
    signatures: ["claimant"],
  },
  {
    kind: "ssa_827",
    agency: "Social Security Administration",
    formNumber: "SSA-827",
    title: "Authorization to Disclose Information",
    sourceFilename: "ssa-827.pdf",
    mailReadyFilename: "ssa-827.normalized.pdf",
    downloadHref: new URL("../forms/generated/ssa-827.normalized.pdf", import.meta.url).href,
    source: { authority: "Social Security Administration" },
    signatures: ["claimant"],
  },
] as const);

export type SsdiOfficialFormKind = (typeof SSDI_OFFICIAL_FORM_REGISTRY)[number]["kind"];

export const SSDI_REQUIRED_FORMS = SSDI_OFFICIAL_FORM_REGISTRY.map((form) => ({
  kind: form.kind,
  label: `${form.formNumber} — ${form.title}`,
  filename: form.sourceFilename,
  bundledMailReadyFilename: form.mailReadyFilename!,
  href: form.downloadHref!,
}));

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

const SSDI_FORM_REQUIREMENT_RULES: readonly OfficialFormRequirementRule<SsdiDecisionBasis, SsdiOfficialFormKind>[] = [
  {
    id: "medical-reconsideration",
    when: (basis) => basis === "medical",
    require: ["ssa_561", "ssa_3441", "ssa_827"],
  },
  {
    id: "nonmedical-reconsideration",
    when: (basis) => basis === "nonmedical",
    require: ["ssa_561"],
  },
];

export function isSsdiReconsiderationStage(value: unknown): boolean {
  return value === "reconsideration";
}

export function isSupportedSsdiDecisionBasis(value: unknown): value is Exclude<SsdiDecisionBasis, "unknown"> {
  return value === "medical" || value === "nonmedical";
}

export function requiredSsdiFormsForBasis(basis: SsdiDecisionBasis) {
  const requiredKinds = resolveRequiredOfficialFormKinds(SSDI_FORM_REQUIREMENT_RULES, basis);
  return SSDI_REQUIRED_FORMS.filter((form) => requiredKinds.includes(form.kind));
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
  const requiredForms = resolveRequiredOfficialForms(
    SSDI_OFFICIAL_FORM_REGISTRY,
    SSDI_FORM_REQUIREMENT_RULES,
    basis,
  );
  return hasRequiredOfficialForms(documents, requiredForms);
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
