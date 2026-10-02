import {
  createOfficialFormRegistry,
  hasRequiredOfficialForms,
  resolveRequiredOfficialFormKinds,
  resolveRequiredOfficialForms,
  type OfficialFormRequirementRule,
} from "@mailmypdf/forms";

export type SsaReconsiderationProgram = "SSDI" | "SSI";
export type SsaReconsiderationDecisionBasis = "medical" | "nonmedical" | "unknown";

export const SSA_RECONSIDERATION_VERTICAL_ID = "appeal-mail";

export const SSA_RECONSIDERATION_STEPS = [
  { id: "decision", label: "Decision" },
  { id: "analysis", label: "Analysis" },
  { id: "claimant", label: "Claimant facts" },
  { id: "evidence", label: "Evidence" },
  { id: "draft", label: "Draft" },
  { id: "forms", label: "SSA forms" },
  { id: "review", label: "Review" },
  { id: "mail", label: "Pay & mail" },
] as const;

export type SsaReconsiderationStepId =
  (typeof SSA_RECONSIDERATION_STEPS)[number]["id"];

export const SSA_RECONSIDERATION_OFFICIAL_FORM_REGISTRY =
  createOfficialFormRegistry([
    {
      kind: "ssa_561",
      agency: "Social Security Administration",
      formNumber: "SSA-561-U2",
      title: "Request for Reconsideration",
      sourceFilename: "ssa-561-u2.pdf",
      mailReadyFilename: "ssa-561-u2.normalized.pdf",
      downloadHref: "/appeal-mail/workflows/appeal-ssdi-denial/forms/generated/ssa-561-u2.normalized.pdf",
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
      downloadHref: "/appeal-mail/workflows/appeal-ssdi-denial/forms/generated/ssa-3441.normalized.pdf",
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
      downloadHref: "/appeal-mail/workflows/appeal-ssdi-denial/forms/generated/ssa-827.normalized.pdf",
      source: { authority: "Social Security Administration" },
      signatures: ["claimant"],
    },
  ] as const);

export type SsaReconsiderationOfficialFormKind =
  (typeof SSA_RECONSIDERATION_OFFICIAL_FORM_REGISTRY)[number]["kind"];

export const SSA_RECONSIDERATION_REQUIRED_FORMS =
  SSA_RECONSIDERATION_OFFICIAL_FORM_REGISTRY.map((form) => ({
    kind: form.kind,
    label: `${form.formNumber} — ${form.title}`,
    filename: form.sourceFilename,
    bundledMailReadyFilename: form.mailReadyFilename!,
    href: form.downloadHref!,
  }));

const MEDICAL_EVIDENCE_KINDS = [
  ["medical_records", "Medical records"],
  ["physician_statement", "Physician statement"],
  ["test_results", "Test results"],
  ["medication_history", "Medication history"],
  ["functional_capacity", "Functional capacity information"],
] as const;

const SHARED_EVIDENCE_KINDS = [
  ["prior_decision", "Prior SSA decision"],
  ["correspondence", "Correspondence"],
  ["other", "Other supporting document"],
] as const;

export const SSA_RECONSIDERATION_EVIDENCE_KINDS = Object.freeze({
  SSDI: [
    ...MEDICAL_EVIDENCE_KINDS,
    ["work_history", "Work history"],
    ...SHARED_EVIDENCE_KINDS,
  ] as const,
  SSI: [
    ...MEDICAL_EVIDENCE_KINDS,
    ["income_resources", "Income and resource records"],
    ["living_arrangement", "Living arrangement records"],
    ["identity_eligibility", "Identity or eligibility records"],
    ...SHARED_EVIDENCE_KINDS,
  ] as const,
});

const FORM_REQUIREMENT_RULES:
  readonly OfficialFormRequirementRule<
    SsaReconsiderationDecisionBasis,
    SsaReconsiderationOfficialFormKind
  >[] = [
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

export function isSsaReconsiderationStage(value: unknown): boolean {
  return value === "reconsideration";
}

export function isSupportedSsaDecisionBasis(
  value: unknown,
): value is Exclude<SsaReconsiderationDecisionBasis, "unknown"> {
  return value === "medical" || value === "nonmedical";
}

export function requiredSsaFormsForBasis(
  basis: SsaReconsiderationDecisionBasis,
) {
  const requiredKinds = resolveRequiredOfficialFormKinds(
    FORM_REQUIREMENT_RULES,
    basis,
  );
  return SSA_RECONSIDERATION_REQUIRED_FORMS.filter((form) =>
    requiredKinds.includes(form.kind),
  );
}

export function hasRequiredSsaForms(
  documents: readonly {
    evidence_kind: string | null;
    included: boolean;
    usable: boolean;
    security_status: string;
  }[],
  basis: SsaReconsiderationDecisionBasis,
): boolean {
  const requiredForms = resolveRequiredOfficialForms(
    SSA_RECONSIDERATION_OFFICIAL_FORM_REGISTRY,
    FORM_REQUIREMENT_RULES,
    basis,
  );
  return hasRequiredOfficialForms(documents, requiredForms);
}

export function ssaReconsiderationCompletedSteps(input: {
  hasCleanDecision: boolean;
  hasReconsiderationAnalysis: boolean;
  hasClaimantFacts: boolean;
  hasDraft: boolean;
  hasRequiredForms: boolean;
  hasApproval: boolean;
}): SsaReconsiderationStepId[] {
  const completed: SsaReconsiderationStepId[] = [];
  if (input.hasCleanDecision) completed.push("decision");
  if (input.hasReconsiderationAnalysis) completed.push("analysis");
  if (input.hasClaimantFacts) completed.push("claimant", "evidence");
  if (input.hasDraft) completed.push("draft");
  if (input.hasRequiredForms) completed.push("forms");
  if (input.hasApproval) completed.push("review");
  return completed;
}
