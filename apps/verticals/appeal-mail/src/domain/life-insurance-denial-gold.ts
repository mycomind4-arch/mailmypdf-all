export const LIFE_INSURANCE_DENIAL_CAPABILITIES=["document-classification","fact-extraction","policy-source-resolution","deadline-verification","appeal-path-verification","evidence-analysis","contradiction-detection","timeline-analysis","adversarial-stress-test","response-strategy","drafting","independent-validation","readiness","human-approval","pricing","deterministic-pdf","submission","mailing","proof"] as const;
export const LIFE_INSURANCE_DENIAL_AUTHORITY_RULES=["Use the actual denial notice, policy/certificate documents supplied by the user, and current official regulator or insurer sources as the controlling record.","Never invent policy provisions, exclusions, contestability rules, deadlines, filing methods, beneficiary facts, underwriting facts, or outcomes.","Keep policy interpretation, factual disputes, underwriting/contestability issues, beneficiary information, and procedural requirements distinct.","A claim or denial date is not automatically a filing deadline unless the notice or authoritative source supports that conclusion.","Treat insurer instructions as specific to the notice and policy; require source verification before presenting general guidance as controlling.","Unsupported policy, legal, medical, beneficiary, or procedural conclusions remain unresolved and block confident ready-to-send status.","Never promise claim payment, policy reinstatement, or reversal of the denial."] as const;
import { getWorkflowPricingProfile, PRICES } from "@mailmypdf/pricing";
const _p = getWorkflowPricingProfile("life-insurance-denial")!;
export const LIFE_INSURANCE_DENIAL_PRICING = {
  preparationFee: (_p.basePriceCents / 100),
  includedResponsePages: _p.includedPages,
  responsePagePrice: ((_p.extraPageCents || 0) / 100),
  supportingPagePrice: ((_p.supportingPageCents || 0) / 100),
  standardMail: (PRICES.standard / 100),
  certifiedMail: (PRICES.certified / 100),
  certifiedReturnReceipt: (PRICES.registered / 100),
  registeredMail: (PRICES.registered / 100),
  flatEnvelopeFee: 0,
  largePacketFee: 0,
  largePacketThresholdSheets: 0,
} as const;
export const LIFE_INSURANCE_DENIAL_GOLD={workflowId:"life-insurance-denial",title:"Life Insurance Denial Appeal",lifecycle:"authority",capabilities:LIFE_INSURANCE_DENIAL_CAPABILITIES,authorityRules:LIFE_INSURANCE_DENIAL_AUTHORITY_RULES,pricing:LIFE_INSURANCE_DENIAL_PRICING} as const;
