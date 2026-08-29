export const MEDICAL_NECESSITY_CAPABILITIES = [
  "document-classification","fact-extraction","authority-resolution","deadline-verification",
  "appeal-path-verification","evidence-analysis","contradiction-detection","timeline-analysis",
  "adversarial-stress-test","response-strategy","drafting","independent-validation","readiness",
  "human-approval","pricing","deterministic-pdf","submission","mailing","proof",
] as const;

export const MEDICAL_NECESSITY_AUTHORITY_RULES = [
  "Use the actual denial notice, plan/policy language supplied by the user, applicable plan documents, and current authoritative sources as the controlling record.",
  "Never invent diagnoses, clinical history, medical necessity criteria, policy terms, regulations, deadlines, appeal rights, or outcomes.",
  "Keep insurer assertions separate from documented clinical facts and from unresolved medical questions.",
  "Do not treat a generic medical-necessity standard as the controlling rule when the notice identifies a plan-specific or program-specific criterion.",
  "Separate internal appeal, external review, peer review, regulator complaint, and other escalation mechanisms when the controlling sources support them.",
  "A deadline extracted from a notice remains unverified until the controlling notice/rule set supports its procedural meaning.",
  "Unsupported clinical or procedural conclusions remain unresolved and block confident ready-to-send status.",
  "Never promise that an appeal will overturn the medical-necessity determination.",
] as const;

import { getWorkflowPricingProfile, PRICES } from "@mailmypdf/pricing";
const _p = getWorkflowPricingProfile("medical-necessity-appeal")!;
export const MEDICAL_NECESSITY_PRICING = {
  preparationFee: (_p.basePriceCents / 100),
  includedResponsePages: _p.includedPages,
  responsePagePrice: ((_p.extraPageCents || 0) / 100),
  supportingPagePrice: ((_p.supportingPageCents || 0) / 100),
  standardMail: (PRICES.standard / 100),
  certifiedMail: (PRICES.certified / 100),
  registeredMail: (PRICES.registered / 100),
} as const;

export const MEDICAL_NECESSITY_GOLD = {
  workflowId: "medical-necessity-appeal",
  title: "Appeal a Medical Necessity Denial",
  lifecycle: "authority",
  capabilities: MEDICAL_NECESSITY_CAPABILITIES,
  authorityRules: MEDICAL_NECESSITY_AUTHORITY_RULES,
  pricing: MEDICAL_NECESSITY_PRICING,
} as const;
