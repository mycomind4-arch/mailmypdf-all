import { getWorkflowPricingProfile, PRICES } from "@mailmypdf/pricing";
const _p = getWorkflowPricingProfile("administrative-decision-appeal")!;
export const ADMINISTRATIVE_DECISION_APPEAL_PRICING = {
  preparationFee: (_p.basePriceCents / 100),
  includedResponsePages: _p.includedPages,
  responsePagePrice: ((_p.extraPageCents || 0) / 100),
  supportingPagePrice: ((_p.supportingPageCents || 0) / 100),
  standardMail: (PRICES.standard / 100),
  certifiedMail: (PRICES.certified / 100),
  certifiedReturnReceipt: (PRICES.registered / 100),
  registeredMail: (PRICES.registered / 100),
  flatEnvelopeFee: 0,
} as const;
export const ADMINISTRATIVE_DECISION_APPEAL_AUTHORITY_SOURCES=[{title:"Administrative Procedure Act — 5 U.S.C. §§ 551–559",url:"https://www.archives.gov/federal-register/laws/administrative-procedure"},{title:"eCFR — current federal administrative regulations",url:"https://www.ecfr.gov/"},{title:"USA.gov — government agencies and contacts",url:"https://www.usa.gov/agencies"},{title:"U.S. Courts — appeals overview",url:"https://www.uscourts.gov/about-federal-courts/types-cases/appeals"}] as const;
export const ADMINISTRATIVE_DECISION_APPEAL_CAPABILITIES=["classification","fact-extraction","authority","deadline-analysis","evidence","contradictions","timeline","strategy","drafting","validation","readiness","pricing","proof"] as const;
export const ADMINISTRATIVE_DECISION_APPEAL_GOLD={workflowId:"administrative-decision-appeal",lifecycle:"authority",capabilities:[...ADMINISTRATIVE_DECISION_APPEAL_CAPABILITIES],authorityRules:["Never invent administrative deadlines, recipients, forms, filing destinations, hearing rights, exhaustion requirements, or outcomes.","Identify the issuing body and jurisdiction before applying procedural authority.","Separate administrative findings, cited authority, disputed facts, and unresolved procedure.","Treat the decision notice and current authoritative sources as the controlling record."],authoritySources:[...ADMINISTRATIVE_DECISION_APPEAL_AUTHORITY_SOURCES],pricing:ADMINISTRATIVE_DECISION_APPEAL_PRICING} as const;
