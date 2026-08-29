export const SSDI_APPEAL_GOLD_CAPABILITIES = [
  "document-classification","fact-extraction","decision-analysis","authority-resolution","deadline-verification","appeal-path-verification","evidence-analysis","contradiction-detection","timeline-analysis","adversarial-stress-test","response-strategy","drafting","independent-validation","readiness","human-approval","pricing","deterministic-pdf","submission","mailing","proof",
] as const;

export const SSDI_APPEAL_AUTHORITY_RULES = [
  "Never invent medical facts.",
  "Never infer a universal deadline.",
  "Never assume the appeal level without authoritative support.",
  "Keep document facts separate from user assertions.",
  "Require explicit human approval before mailing.",
] as const;

import { getWorkflowPricingProfile, PRICES } from "@mailmypdf/pricing";
const _p = getWorkflowPricingProfile("ssdi-appeal")!;
export const SSDI_APPEAL_PRICING = {
  preparationFee: (_p.basePriceCents / 100),
  includedResponsePages: _p.includedPages,
  responsePagePrice: ((_p.extraPageCents || 0) / 100),
  supportingPagePrice: ((_p.supportingPageCents || 0) / 100),
  standardMail: (PRICES.standard / 100),
  certifiedMail: (PRICES.certified / 100),
  registeredMail: (PRICES.registered / 100),
} as const;

export const SSDI_APPEAL_GOLD = {
  workflowId: "ssdi-appeal",
  title: "Appeal an SSDI Decision",
  lifecycle: "authority",
  capabilities: SSDI_APPEAL_GOLD_CAPABILITIES,
  authorityRules: SSDI_APPEAL_AUTHORITY_RULES,
  pricing: SSDI_APPEAL_PRICING,
} as const;
