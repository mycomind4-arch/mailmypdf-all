export const PRIOR_AUTHORIZATION_DENIAL_CAPABILITIES=["document-classification","fact-extraction","authority-resolution","deadline-verification","appeal-path-verification","evidence-analysis","contradiction-detection","timeline-analysis","adversarial-stress-test","response-strategy","drafting","independent-validation","readiness","human-approval","pricing","deterministic-pdf","submission","mailing","proof"] as const;
export const PRIOR_AUTHORIZATION_DENIAL_AUTHORITY_RULES=["Use the actual denial notice, plan or policy documents supplied by the user, and current official plan/regulator sources as the controlling record.","Never invent authorization criteria, coverage rules, deadlines, filing methods, medical facts, or outcomes.","Distinguish prior authorization from medical necessity, post-service claim denial, network disputes, external review, and regulator complaints.","A denial date is not automatically a deadline unless the notice or authoritative rules support that interpretation.","Separate insurer/plan instructions from general guidance and require source verification before procedural conclusions are treated as settled.","Unsupported clinical or procedural conclusions remain unresolved and block confident ready-to-send status.","Never promise approval of the requested service or treatment."] as const;
import { getWorkflowPricingProfile, PRICES } from "@mailmypdf/pricing";
const _p = getWorkflowPricingProfile("prior-authorization-denial")!;
export const PRIOR_AUTHORIZATION_DENIAL_PRICING = {
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
export const PRIOR_AUTHORIZATION_DENIAL_GOLD={workflowId:"prior-authorization-denial",title:"Appeal a Prior Authorization Denial",lifecycle:"authority",capabilities:PRIOR_AUTHORIZATION_DENIAL_CAPABILITIES,authorityRules:PRIOR_AUTHORIZATION_DENIAL_AUTHORITY_RULES,pricing:PRIOR_AUTHORIZATION_DENIAL_PRICING} as const;
