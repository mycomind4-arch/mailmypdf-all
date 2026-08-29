export const DENTAL_INSURANCE_APPEAL_CAPABILITIES=["document-classification","fact-extraction","authority-resolution","deadline-verification","appeal-path-verification","evidence-analysis","contradiction-detection","timeline-analysis","adversarial-stress-test","response-strategy","drafting","independent-validation","readiness","human-approval","pricing","deterministic-pdf","submission","mailing","proof"] as const;
export const DENTAL_INSURANCE_APPEAL_AUTHORITY_RULES=["Use the actual dental decision, plan/policy documents supplied by the user, and current official insurer/regulator sources as the controlling record.","Never invent dental findings, procedure history, coverage limitations, deadlines, filing methods, or outcomes.","Distinguish dental claim denial, medical necessity, prior authorization, network issues, coordination of benefits, and regulator complaint paths.","A decision date is not automatically a deadline unless the notice or authoritative source supports that interpretation.","Separate plan instructions from general guidance and verify procedural conclusions before treating them as settled.","Unsupported dental, clinical, coverage, or procedural conclusions remain unresolved and block confident ready-to-send status.","Never promise claim payment, coverage, or appeal success."] as const;
import { getWorkflowPricingProfile, PRICES } from "@mailmypdf/pricing";
const _p = getWorkflowPricingProfile("dental-insurance-appeal")!;
export const DENTAL_INSURANCE_APPEAL_PRICING = {
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
export const DENTAL_INSURANCE_APPEAL_GOLD={workflowId:"dental-insurance-appeal",title:"Dental Insurance Appeal",lifecycle:"authority",capabilities:DENTAL_INSURANCE_APPEAL_CAPABILITIES,authorityRules:DENTAL_INSURANCE_APPEAL_AUTHORITY_RULES,pricing:DENTAL_INSURANCE_APPEAL_PRICING} as const;
