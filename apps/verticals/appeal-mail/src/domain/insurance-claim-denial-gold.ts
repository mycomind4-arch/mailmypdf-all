export const INSURANCE_CLAIM_DENIAL_CAPABILITIES = ["document-classification","fact-extraction","authority-resolution","deadline-verification","appeal-path-verification","evidence-analysis","contradiction-detection","timeline-analysis","adversarial-stress-test","response-strategy","drafting","independent-validation","readiness","human-approval","pricing","deterministic-pdf","submission","mailing","proof"] as const;
export const INSURANCE_CLAIM_DENIAL_AUTHORITY_RULES = [
  "Use the actual denial notice, policy/plan documents supplied by the user, applicable regulator guidance, and current authoritative sources as the controlling record.",
  "Never invent coverage terms, exclusions, claim facts, diagnoses, damages, appeal rights, deadlines, or outcomes.",
  "Do not assume all insurance claims share one appeal timeline or procedure; identify the issuer, plan type, jurisdiction, and notice-specific instructions.",
  "Separate internal appeal, external review, regulator complaint, and litigation/escalation paths when supported; never collapse them into one universal process.",
  "Unsupported procedural conclusions remain unresolved and block confident ready-to-send status.",
  "Never promise that an appeal will reverse the denial.",
] as const;
export const INSURANCE_CLAIM_DENIAL_AUTHORITY_SOURCES = [
  { title:"CMS — Appeals", url:"https://www.cms.gov/medicare/appeals-grievances/medicare-health-plans", freshnessRule:"verify-before-use" },
  { title:"Healthcare.gov — Appeal a health plan decision", url:"https://www.healthcare.gov/marketplace-appeals/", freshnessRule:"verify-before-use" },
  { title:"NAIC — Consumer Insurance Information", url:"https://content.naic.org/consumer", freshnessRule:"verify-before-use" },
] as const;
import { getWorkflowPricingProfile, PRICES } from "@mailmypdf/pricing";
const _p = getWorkflowPricingProfile("denied-claim")!;
export const INSURANCE_CLAIM_DENIAL_PRICING = {
  preparationFee: (_p.basePriceCents / 100),
  includedResponsePages: _p.includedPages,
  responsePagePrice: ((_p.extraPageCents || 0) / 100),
  supportingPagePrice: ((_p.supportingPageCents || 0) / 100),
  standardMail: (PRICES.standard / 100),
  certifiedMail: (PRICES.certified / 100),
  registeredMail: (PRICES.registered / 100),
} as const;
export const INSURANCE_CLAIM_DENIAL_GOLD = {
  workflowId:"denied-claim",
  title:"Appeal an Insurance Claim Denial",
  lifecycle:"authority",
  capabilities:INSURANCE_CLAIM_DENIAL_CAPABILITIES,
  authorityRules:INSURANCE_CLAIM_DENIAL_AUTHORITY_RULES,
  authoritySources:INSURANCE_CLAIM_DENIAL_AUTHORITY_SOURCES,
  pricing:INSURANCE_CLAIM_DENIAL_PRICING,
} as const;
