export type BenefitsWorkflowMaturity =
  | "executable"
  | "canonical-scaffold"
  | "section-scaffold";

export type BenefitsCanonicalWorkflow = {
  workflowId: string;
  landingPath: string;
  startPath: string;
};

export type BenefitsWorkflowRegistryEntry = {
  id: string;
  title: string;
  publicPath: string;
  sectionStartPath: string;
  maturity: BenefitsWorkflowMaturity;
  canonical?: BenefitsCanonicalWorkflow;
};

const sectionPath = (id: string) => `/benefits-appeal/workflows/${id}`;
const sectionStartPath = (id: string) => `${sectionPath(id)}/start`;
const appealMailCanonical = (workflowId: string): BenefitsCanonicalWorkflow => ({
  workflowId,
  landingPath: `/appeal-mail/workflows/${workflowId}`,
  startPath: `/appeal-mail/workflows/${workflowId}/start`,
});

/**
 * Benefits Appeal is a public/SEO front door, not a second workflow engine.
 *
 * When a Benefits route has an equivalent canonical workflow in Appeal Mail,
 * that relationship is recorded here. Only workflows with a real executable
 * start implementation are marked `executable`; a matching folder alone is
 * not enough to make a public start route live.
 */
export const BENEFITS_APPEAL_WORKFLOWS: readonly BenefitsWorkflowRegistryEntry[] = [
  { id: "appeals-council-preparation", title: "Appeals Council Preparation", publicPath: sectionPath("appeals-council-preparation"), sectionStartPath: sectionStartPath("appeals-council-preparation"), maturity: "section-scaffold" },
  { id: "benefits-deadline-response", title: "Benefits Deadline Response", publicPath: sectionPath("benefits-deadline-response"), sectionStartPath: sectionStartPath("benefits-deadline-response"), maturity: "section-scaffold" },
  { id: "benefits-evidence-package", title: "Benefits Evidence Package", publicPath: sectionPath("benefits-evidence-package"), sectionStartPath: sectionStartPath("benefits-evidence-package"), maturity: "section-scaffold" },
  { id: "benefits-hearing-preparation", title: "Benefits Hearing Preparation", publicPath: sectionPath("benefits-hearing-preparation"), sectionStartPath: sectionStartPath("benefits-hearing-preparation"), maturity: "section-scaffold" },
  { id: "benefits-reconsideration", title: "Benefits Reconsideration", publicPath: sectionPath("benefits-reconsideration"), sectionStartPath: sectionStartPath("benefits-reconsideration"), maturity: "section-scaffold" },
  { id: "benefits-supporting-document-submission", title: "Benefits Supporting Document Submission", publicPath: sectionPath("benefits-supporting-document-submission"), sectionStartPath: sectionStartPath("benefits-supporting-document-submission"), maturity: "section-scaffold" },
  { id: "disability-claim-appeal", title: "Disability Claim Appeal", publicPath: sectionPath("disability-claim-appeal"), sectionStartPath: sectionStartPath("disability-claim-appeal"), maturity: "section-scaffold" },
  { id: "edd-appeal", title: "EDD Appeal", publicPath: sectionPath("edd-appeal"), sectionStartPath: sectionStartPath("edd-appeal"), maturity: "section-scaffold" },
  { id: "edd-disqualification-appeal", title: "EDD Disqualification Appeal", publicPath: sectionPath("edd-disqualification-appeal"), sectionStartPath: sectionStartPath("edd-disqualification-appeal"), maturity: "canonical-scaffold", canonical: appealMailCanonical("appeal-edd-disqualification") },
  { id: "food-stamp-appeal", title: "Food Stamp Appeal", publicPath: sectionPath("food-stamp-appeal"), sectionStartPath: sectionStartPath("food-stamp-appeal"), maturity: "section-scaffold" },
  { id: "medicaid-appeal", title: "Medicaid Appeal", publicPath: sectionPath("medicaid-appeal"), sectionStartPath: sectionStartPath("medicaid-appeal"), maturity: "section-scaffold" },
  { id: "medicaid-denial-appeal", title: "Medicaid Denial Appeal", publicPath: sectionPath("medicaid-denial-appeal"), sectionStartPath: sectionStartPath("medicaid-denial-appeal"), maturity: "canonical-scaffold", canonical: appealMailCanonical("appeal-medicaid-denial") },
  { id: "snap-appeal", title: "SNAP Appeal", publicPath: sectionPath("snap-appeal"), sectionStartPath: sectionStartPath("snap-appeal"), maturity: "section-scaffold" },
  { id: "social-security-decision-appeal", title: "Social Security Decision Appeal", publicPath: sectionPath("social-security-decision-appeal"), sectionStartPath: sectionStartPath("social-security-decision-appeal"), maturity: "canonical-scaffold", canonical: appealMailCanonical("appeal-social-security-decision") },
  { id: "social-security-non-medical-appeal", title: "Social Security Non-Medical Appeal", publicPath: sectionPath("social-security-non-medical-appeal"), sectionStartPath: sectionStartPath("social-security-non-medical-appeal"), maturity: "section-scaffold" },
  { id: "social-security-overpayment-appeal", title: "Social Security Overpayment Appeal", publicPath: sectionPath("social-security-overpayment-appeal"), sectionStartPath: sectionStartPath("social-security-overpayment-appeal"), maturity: "canonical-scaffold", canonical: appealMailCanonical("appeal-social-security-overpayment") },
  { id: "ssdi-appeal", title: "SSDI Appeal", publicPath: sectionPath("ssdi-appeal"), sectionStartPath: sectionStartPath("ssdi-appeal"), maturity: "section-scaffold" },
  { id: "ssdi-appeals-council", title: "SSDI Appeals Council", publicPath: sectionPath("ssdi-appeals-council"), sectionStartPath: sectionStartPath("ssdi-appeals-council"), maturity: "section-scaffold" },
  { id: "ssdi-denial-appeal", title: "SSDI Denial Appeal", publicPath: sectionPath("ssdi-denial-appeal"), sectionStartPath: sectionStartPath("ssdi-denial-appeal"), maturity: "executable", canonical: appealMailCanonical("appeal-ssdi-denial") },
  { id: "ssdi-reconsideration", title: "SSDI Reconsideration", publicPath: sectionPath("ssdi-reconsideration"), sectionStartPath: sectionStartPath("ssdi-reconsideration"), maturity: "executable", canonical: appealMailCanonical("appeal-ssdi-denial") },
  { id: "ssi-appeal", title: "SSI Appeal", publicPath: sectionPath("ssi-appeal"), sectionStartPath: sectionStartPath("ssi-appeal"), maturity: "section-scaffold" },
  { id: "ssi-denial-appeal", title: "SSI Denial Appeal", publicPath: sectionPath("ssi-denial-appeal"), sectionStartPath: sectionStartPath("ssi-denial-appeal"), maturity: "canonical-scaffold", canonical: appealMailCanonical("appeal-ssi-denial") },
  { id: "ssi-overpayment-appeal", title: "SSI Overpayment Appeal", publicPath: sectionPath("ssi-overpayment-appeal"), sectionStartPath: sectionStartPath("ssi-overpayment-appeal"), maturity: "section-scaffold" },
  { id: "ssi-reconsideration", title: "SSI Reconsideration", publicPath: sectionPath("ssi-reconsideration"), sectionStartPath: sectionStartPath("ssi-reconsideration"), maturity: "canonical-scaffold", canonical: appealMailCanonical("appeal-ssi-denial") },
  { id: "unemployment-appeal", title: "Unemployment Appeal", publicPath: sectionPath("unemployment-appeal"), sectionStartPath: sectionStartPath("unemployment-appeal"), maturity: "section-scaffold" },
  { id: "unemployment-denial-appeal", title: "Unemployment Denial Appeal", publicPath: sectionPath("unemployment-denial-appeal"), sectionStartPath: sectionStartPath("unemployment-denial-appeal"), maturity: "canonical-scaffold", canonical: appealMailCanonical("appeal-unemployment-denial") },
  { id: "unemployment-disqualification-appeal", title: "Unemployment Disqualification Appeal", publicPath: sectionPath("unemployment-disqualification-appeal"), sectionStartPath: sectionStartPath("unemployment-disqualification-appeal"), maturity: "section-scaffold" },
  { id: "unemployment-overpayment-appeal", title: "Unemployment Overpayment Appeal", publicPath: sectionPath("unemployment-overpayment-appeal"), sectionStartPath: sectionStartPath("unemployment-overpayment-appeal"), maturity: "section-scaffold" },
  { id: "va-claim-appeal", title: "VA Claim Appeal", publicPath: sectionPath("va-claim-appeal"), sectionStartPath: sectionStartPath("va-claim-appeal"), maturity: "section-scaffold" },
  { id: "workers-compensation-appeal", title: "Workers Compensation Appeal", publicPath: sectionPath("workers-compensation-appeal"), sectionStartPath: sectionStartPath("workers-compensation-appeal"), maturity: "section-scaffold" },
] as const;

const registry = new Map(BENEFITS_APPEAL_WORKFLOWS.map((entry) => [entry.id, entry]));

export function getBenefitsWorkflowEntry(id: string): BenefitsWorkflowRegistryEntry | null {
  return registry.get(id) ?? null;
}

/** Returns a real start route only when the canonical implementation is executable. */
export function getBenefitsWorkflowLaunchPath(id: string): string | null {
  const entry = registry.get(id);
  if (!entry || entry.maturity !== "executable") return null;
  return entry.canonical?.startPath ?? null;
}

/** Fail closed when a landing page claims a workflow is launchable but the registry does not. */
export function requireBenefitsWorkflowLaunchPath(id: string): string {
  const path = getBenefitsWorkflowLaunchPath(id);
  if (!path) throw new Error(`Benefits workflow ${id} does not have an executable canonical start route`);
  return path;
}

export function isBenefitsWorkflowExecutable(id: string): boolean {
  return registry.get(id)?.maturity === "executable";
}
