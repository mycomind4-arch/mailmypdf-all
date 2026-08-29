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

export const SSDI_APPEAL_PRICING = {
  preparationFee: 29.99,
  includedResponsePages: 4,
  responsePagePrice: 0.40,
  supportingPagePrice: 0.25,
  standardMail: 5.49,
  certifiedMail: 12.49,
  certifiedReturnReceipt: 14.99,
  registeredMail: 29.99,
  flatEnvelopeFee: 2.50,
} as const;

export const SSDI_APPEAL_GOLD = {
  workflowId: "ssdi-appeal",
  title: "Appeal an SSDI Decision",
  lifecycle: "authority",
  capabilities: SSDI_APPEAL_GOLD_CAPABILITIES,
  authorityRules: SSDI_APPEAL_AUTHORITY_RULES,
  pricing: SSDI_APPEAL_PRICING,
} as const;
