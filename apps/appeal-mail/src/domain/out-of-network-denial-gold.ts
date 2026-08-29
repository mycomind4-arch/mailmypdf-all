export const OUT_OF_NETWORK_DENIAL_CAPABILITIES=["document-classification","fact-extraction","authority-resolution","deadline-verification","appeal-path-verification","evidence-analysis","contradiction-detection","timeline-analysis","adversarial-stress-test","response-strategy","drafting","independent-validation","readiness","human-approval","pricing","deterministic-pdf","submission","mailing","proof"] as const;
export const OUT_OF_NETWORK_DENIAL_AUTHORITY_RULES=["Use the actual denial notice, plan or policy documents supplied by the user, and current official plan/regulator sources as the controlling record.","Never invent network status, plan provisions, exceptions, balance-billing rules, deadlines, filing methods, medical facts, or outcomes.","Distinguish an out-of-network denial from prior authorization, medical necessity, post-service claim denial, emergency/access exceptions, external review, and regulator complaints.","Treat network status and exception eligibility as source-dependent facts; never infer them from provider type, ZIP code, or general practice.","Separate insurer/plan instructions from general guidance and require source verification before procedural conclusions are treated as settled.","Unsupported network, clinical, or procedural conclusions remain unresolved and block confident ready-to-send status.","Never promise coverage, reimbursement, or an in-network exception."] as const;
import { getWorkflowPricingProfile, PRICES } from "@mailmypdf/pricing";
const _p = getWorkflowPricingProfile("out-of-network-denial")!;
export const OUT_OF_NETWORK_DENIAL_PRICING = {
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
export const OUT_OF_NETWORK_DENIAL_GOLD={workflowId:"out-of-network-denial",title:"Appeal an Out-of-Network Denial",lifecycle:"authority",capabilities:OUT_OF_NETWORK_DENIAL_CAPABILITIES,authorityRules:OUT_OF_NETWORK_DENIAL_AUTHORITY_RULES,pricing:OUT_OF_NETWORK_DENIAL_PRICING} as const;
