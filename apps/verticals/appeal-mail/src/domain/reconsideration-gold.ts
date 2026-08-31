import { RECONSIDERATION_PRICING } from "./reconsideration-pricing";
export const RECONSIDERATION_CAPABILITIES = ["document-classification","fact-extraction","authority-resolution","deadline-verification","appeal-path-verification","evidence-analysis","contradiction-detection","timeline-analysis","adversarial-stress-test","response-strategy","drafting","independent-validation","readiness","human-approval","pricing","deterministic-pdf","submission","mailing","proof"] as const;
export const RECONSIDERATION_AUTHORITY_RULES = [
  "Use the actual decision, controlling agency/issuer instructions, applicable regulations or rules, and current official sources as the controlling record.",
  "Never infer a universal reconsideration right, deadline, filing method, exhaustion requirement, stay, or hearing right.",
  "A date extracted from a notice is not automatically a filing deadline unless authoritative rules support that interpretation.",
  "Separate reconsideration, internal review, appeal, rehearing, amendment, and judicial-review mechanisms rather than treating them as interchangeable.",
  "Unsupported procedural conclusions remain unresolved and block confident ready-to-send status.",
  "Never promise that reconsideration will change the underlying decision.",
] as const;
export const RECONSIDERATION_PRICING_PROFILE = RECONSIDERATION_PRICING;
export const RECONSIDERATION_GOLD = { workflowId:"reconsideration", title:"Request Reconsideration", lifecycle:"authority", capabilities:RECONSIDERATION_CAPABILITIES, authorityRules:RECONSIDERATION_AUTHORITY_RULES, pricing:RECONSIDERATION_PRICING_PROFILE } as const;
