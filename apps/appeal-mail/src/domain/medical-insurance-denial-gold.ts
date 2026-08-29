export const MEDICAL_INSURANCE_DENIAL_CAPABILITIES = ["document-classification","fact-extraction","authority-resolution","deadline-verification","appeal-path-verification","medical-necessity-analysis","evidence-analysis","contradiction-detection","timeline-analysis","adversarial-stress-test","response-strategy","drafting","independent-validation","readiness","human-approval","pricing","deterministic-pdf","submission","mailing","proof"] as const;

export const MEDICAL_INSURANCE_DENIAL_AUTHORITY_RULES = [
  "Treat the actual denial notice, plan or policy documents, applicable federal or state requirements, and current official sources as controlling.",
  "Never invent diagnoses, symptoms, treatment history, clinical findings, coverage terms, medical-necessity criteria, deadlines, appeal rights, or outcomes.",
  "Separate medical-necessity review from general coverage, prior authorization, network, coding, timely-filing, and external-review mechanisms.",
  "Do not treat a generic clinical guideline as the controlling plan criterion unless the source record establishes that relationship.",
  "Flag missing clinical records, provider statements, diagnostic evidence, or treatment history rather than filling gaps with assumptions.",
  "Unsupported procedural conclusions remain unresolved and block confident ready-to-send status.",
] as const;

import { getWorkflowPricingProfile, PRICES } from "@mailmypdf/pricing";
const _p = getWorkflowPricingProfile("medical-insurance-denial")!;
export const MEDICAL_INSURANCE_DENIAL_PRICING = {
  preparationFee: (_p.basePriceCents / 100),
  includedResponsePages: _p.includedPages,
  responsePagePrice: ((_p.extraPageCents || 0) / 100),
  supportingPagePrice: ((_p.supportingPageCents || 0) / 100),
  standardMail: (PRICES.standard / 100),
  certifiedMail: (PRICES.certified / 100),
  registeredMail: (PRICES.registered / 100),
} as const;

export const MEDICAL_INSURANCE_DENIAL_GOLD = {
  workflowId: "medical-insurance-denial",
  title: "Appeal a Medical Insurance Denial",
  lifecycle: "authority",
  capabilities: MEDICAL_INSURANCE_DENIAL_CAPABILITIES,
  authorityRules: MEDICAL_INSURANCE_DENIAL_AUTHORITY_RULES,
  pricing: MEDICAL_INSURANCE_DENIAL_PRICING,
} as const;
