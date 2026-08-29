/** Canonical domain adapters. Adapters provide domain intelligence; pipelines provide execution shape. */
export type AdapterId =
  | "government"
  | "tax"
  | "insurance"
  | "healthcare"
  | "benefits"
  | "education"
  | "credit-debt"
  | "consumer-billing"
  | "immigration"
  | "housing"
  | "dmv-licensing"
  | "permits-regulatory"
  | "court-procedure"
  | "records"
  | "business";

export type AdapterDefinition = {
  id: AdapterId;
  name: string;
  description: string;
  capabilities: readonly string[];
  composesWith: readonly AdapterId[];
};

export const ADAPTERS: Readonly<Record<AdapterId, AdapterDefinition>> = {
  government: { id: "government", name: "Government / Administrative", description: "Agency identification, official instructions, procedural correspondence, and agency-specific response rules.", capabilities: ["classification", "requirements", "deadlines", "recipient-rules", "submission-rules"], composesWith: ["tax", "benefits", "dmv-licensing", "permits-regulatory", "records", "court-procedure"] },
  tax: { id: "tax", name: "Tax", description: "Tax notice and tax-document interpretation with explicit source grounding and conservative deadline handling.", capabilities: ["tax-document-classification", "tax-fact-extraction", "notice-issue-mapping", "tax-deadline-grounding"], composesWith: ["government"] },
  insurance: { id: "insurance", name: "Insurance", description: "Policy, claim, coverage, denial, network, and insurer correspondence intelligence.", capabilities: ["policy-reference-extraction", "coverage-analysis", "denial-analysis", "claim-facts", "appeal-requirements"], composesWith: ["healthcare", "benefits"] },
  healthcare: { id: "healthcare", name: "Healthcare / Medical", description: "Medical-service, necessity, records, and documentation requirements without inventing medical facts.", capabilities: ["medical-document-classification", "medical-evidence-mapping", "necessity-analysis"], composesWith: ["insurance", "benefits"] },
  benefits: { id: "benefits", name: "Benefits / Social Programs", description: "Eligibility, benefit determinations, denial grounds, deadlines, and supporting records.", capabilities: ["eligibility-fact-mapping", "benefit-decision-analysis", "supporting-evidence"], composesWith: ["government", "education", "healthcare"] },
  education: { id: "education", name: "Education / Financial Aid", description: "Financial aid, SAP, scholarship, and school decision appeal logic.", capabilities: ["school-policy-mapping", "academic-fact-mapping", "special-circumstance-analysis"], composesWith: ["benefits"] },
  "credit-debt": { id: "credit-debt", name: "Credit / Debt", description: "Debt, collection, credit-report, account ownership, balance, and validation dispute intelligence.", capabilities: ["account-normalization", "tradeline-analysis", "debt-validation", "dispute-issue-mapping"], composesWith: ["consumer-billing"] },
  "consumer-billing": { id: "consumer-billing", name: "Consumer Billing", description: "Billing errors, unauthorized transactions, recurring charges, service contracts, and payment disputes.", capabilities: ["transaction-reconciliation", "billing-issue-mapping", "account-history"], composesWith: ["insurance", "credit-debt"] },
  immigration: { id: "immigration", name: "Immigration", description: "Immigration notice, evidence, agency, deadline, and submission requirements.", capabilities: ["immigration-document-classification", "agency-routing", "evidence-checklist", "deadline-grounding"], composesWith: ["government", "court-procedure"] },
  housing: { id: "housing", name: "Housing / Tenant", description: "Lease, notice, repair, condition, landlord/tenant correspondence, and jurisdiction-sensitive requirements.", capabilities: ["lease-fact-mapping", "notice-analysis", "repair-evidence", "jurisdiction-rules"], composesWith: ["permits-regulatory", "government"] },
  "dmv-licensing": { id: "dmv-licensing", name: "DMV / Licensing", description: "Licensing, suspension, revocation, registration, and agency hearing/appeal requirements.", capabilities: ["license-status-analysis", "suspension-grounding", "hearing-deadline", "agency-instructions"], composesWith: ["government", "permits-regulatory"] },
  "permits-regulatory": { id: "permits-regulatory", name: "Permits / Regulatory", description: "Permit applications, deficiencies, licensing, compliance notices, and corrective submissions.", capabilities: ["requirement-mapping", "deficiency-analysis", "compliance-deadline", "submission-format"], composesWith: ["government", "housing", "dmv-licensing"] },
  "court-procedure": { id: "court-procedure", name: "Court Procedure", description: "Court document classification, case metadata, procedural deadlines, filing instructions, and exhibit requirements.", capabilities: ["court-document-classification", "case-metadata", "procedural-deadline", "filing-instructions"], composesWith: ["government", "records"] },
  records: { id: "records", name: "Records / Public Information", description: "Records scope, authority, custodians, request requirements, exemptions, and response tracking.", capabilities: ["request-scoping", "authority-mapping", "custodian-routing", "records-deadline"], composesWith: ["government", "court-procedure"] },
  business: { id: "business", name: "Small Business", description: "Business correspondence, trigger context, approval policy, customer/vendor communication, and audit requirements.", capabilities: ["business-context", "approval-policy", "trigger-evaluation", "relationship-history"], composesWith: ["consumer-billing", "permits-regulatory", "government"] },
};

export function getAdapter(id: AdapterId): AdapterDefinition {
  const adapter = ADAPTERS[id];
  if (!adapter) throw new Error(`Unknown adapter: ${id}`);
  return adapter;
}

export function isAdapterId(value: string): value is AdapterId {
  return Object.prototype.hasOwnProperty.call(ADAPTERS, value);
}

export const adapterIds = Object.keys(ADAPTERS) as AdapterId[];
