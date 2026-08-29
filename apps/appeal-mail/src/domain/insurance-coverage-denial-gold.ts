export const INSURANCE_COVERAGE_DENIAL_CAPABILITIES = ["document-classification","fact-extraction","authority-resolution","deadline-verification","appeal-path-verification","coverage-analysis","evidence-analysis","contradiction-detection","timeline-analysis","adversarial-stress-test","response-strategy","drafting","independent-validation","readiness","human-approval","pricing","deterministic-pdf","submission","mailing","proof"] as const;

export const INSURANCE_COVERAGE_DENIAL_AUTHORITY_RULES = [
  "Use the actual coverage denial, policy or plan documents supplied by the user, issuer instructions, applicable regulator guidance, and current authoritative sources as the controlling record.",
  "Never invent coverage terms, exclusions, medical facts, policy language, deadlines, appeal rights, or outcomes.",
  "Do not assume all coverage denials share one appeal timeline or procedure; identify issuer, plan type, jurisdiction, and notice-specific instructions.",
  "Separate coverage interpretation, claim denial, prior authorization, internal appeal, external review, regulator complaint, and litigation paths when supported; never collapse them into one universal process.",
  "Unsupported procedural conclusions remain unresolved and block confident ready-to-send status.",
  "Never promise that coverage will be approved or a denial will be reversed.",
] as const;

import { getWorkflowPricingProfile, PRICES } from "@mailmypdf/pricing";
const _p = getWorkflowPricingProfile("insurance-coverage-denial")!;
export const INSURANCE_COVERAGE_DENIAL_PRICING = {
  preparationFee: (_p.basePriceCents / 100),
  includedResponsePages: _p.includedPages,
  responsePagePrice: ((_p.extraPageCents || 0) / 100),
  supportingPagePrice: ((_p.supportingPageCents || 0) / 100),
  standardMail: (PRICES.standard / 100),
  certifiedMail: (PRICES.certified / 100),
  registeredMail: (PRICES.registered / 100),
} as const;

export const INSURANCE_COVERAGE_DENIAL_GOLD = {
  workflowId: "insurance-coverage-denial",
  title: "Appeal an Insurance Coverage Denial",
  lifecycle: "authority",
  capabilities: INSURANCE_COVERAGE_DENIAL_CAPABILITIES,
  authorityRules: INSURANCE_COVERAGE_DENIAL_AUTHORITY_RULES,
  pricing: INSURANCE_COVERAGE_DENIAL_PRICING,
} as const;
