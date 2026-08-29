import { getWorkflowPricingProfile, PRICES } from "@mailmypdf/pricing";
const _p = getWorkflowPricingProfile("court-ruling")!;
export const COURT_RULING_PRICING = {
  preparationFee: (_p.basePriceCents / 100),
  includedResponsePages: _p.includedPages,
  responsePagePrice: ((_p.extraPageCents || 0) / 100),
  supportingPagePrice: ((_p.supportingPageCents || 0) / 100),
  standardMail: (PRICES.standard / 100),
  certifiedMail: (PRICES.certified / 100),
  registeredMail: (PRICES.registered / 100),
} as const;

export const COURT_RULING_AUTHORITY_SOURCES = [
  { name: "Federal Rules of Appellate Procedure", url: "https://www.uscourts.gov/rules-policies/current-rules-practice-procedure/federal-rules-appellate-procedure", freshnessRule: "verify-before-use" },
  { name: "Federal Rules of Civil Procedure", url: "https://www.uscourts.gov/rules-policies/current-rules-practice-procedure/federal-rules-civil-procedure", freshnessRule: "verify-before-use" },
  { name: "Federal Rules of Criminal Procedure", url: "https://www.uscourts.gov/rules-policies/current-rules-practice-procedure/federal-rules-criminal-procedure", freshnessRule: "verify-before-use" },
  { name: "Federal Courts — Appeals", url: "https://www.uscourts.gov/about-federal-courts/types-cases/appeals", freshnessRule: "verify-before-use" },
] as const;

export const COURT_RULING_AUTHORITY_RULES = [
  "The actual order, judgment, docket entry, and controlling court rules govern.",
  "Never infer a filing deadline from the date alone when the triggering event is uncertain.",
  "Distinguish an appeal, motion for reconsideration, motion to alter/amend, stay request, and other post-ruling mechanisms.",
  "Never invent jurisdiction-specific law, required forms, filing portals, service requirements, or appellate jurisdiction.",
  "Surface uncertainty instead of turning a generic court rule into case-specific legal advice.",
] as const;
