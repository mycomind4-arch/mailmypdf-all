export type BenefitsDraftingPolicy = {
  requiredGrounding: readonly string[];
  requiredDistinctions: readonly string[];
  validationChecks: readonly string[];
  forbiddenClaims: readonly string[];
};

/**
 * Shared Benefits Appeal drafting policy salvaged from the legacy workflow
 * engine without copying its repeated per-workflow prompt table.
 *
 * Workflow manifests may add program-specific requirements, but they should not
 * weaken these baseline rules.
 */
export const BENEFITS_DRAFTING_POLICY: BenefitsDraftingPolicy = Object.freeze({
  requiredGrounding: Object.freeze([
    "Ground every factual statement in the source decision, a user-confirmed input, or linked evidence.",
    "Use the actual case/reference number, decision date, deadline, agency, and amounts only when they are present in grounded inputs.",
    "Cite or otherwise trace material factual assertions to the evidence records supplied to the workflow.",
    "Do not invent medical conditions, diagnoses, treatment history, work history, income, household facts, dates, amounts, eligibility facts, or procedural events.",
  ]),
  requiredDistinctions: Object.freeze([
    "Keep established facts separate from arguments, requests, and interpretations.",
    "Treat extracted document observations as unconfirmed until the workflow's provenance/review rules allow them to be relied on.",
    "Do not convert missing or uncertain information into a favorable assumption.",
  ]),
  validationChecks: Object.freeze([
    "Reference/case number consistency",
    "Decision date consistency",
    "Deadline consistency when a deadline is known",
    "Amount consistency when an amount is material",
    "Evidence support for each material appeal issue",
    "No unresolved template placeholders",
    "No unsupported factual assertions",
    "No categorical eligibility or outcome promise",
  ]),
  forbiddenClaims: Object.freeze([
    "guaranteed approval",
    "guaranteed benefits",
    "guaranteed eligibility",
    "you will win",
    "definitely eligible",
    "definitely entitled",
  ]),
});

/**
 * Produces the stable baseline instructions that a workflow-specific prompt can
 * append to, rather than each Benefits workflow maintaining its own copy.
 */
export function benefitsDraftingInstructions(): string {
  return [
    "Benefits Appeal drafting rules:",
    ...BENEFITS_DRAFTING_POLICY.requiredGrounding.map((rule) => `- ${rule}`),
    ...BENEFITS_DRAFTING_POLICY.requiredDistinctions.map((rule) => `- ${rule}`),
    "Before accepting the draft, independently validate:",
    ...BENEFITS_DRAFTING_POLICY.validationChecks.map((check) => `- ${check}`),
  ].join("\n");
}
