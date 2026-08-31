export type WorkflowId =
  | "debt-collection-dispute"
  | "dispute-collection-agency"
  | "debt-dispute"
  | "debt-validation"
  | "credit-report"
  | "credit-report-collections"
  | "hard-inquiry"
  | "charge-off"
  | "medical-collections"
  | "student-loan"
  | "credit-card-billing"
  | "unauthorized-charge"
  | "billing-error"
  | "subscription-billing"
  | "service-contract"
  | "insurance-billing"
  | "follow-up-no-response"
  | "inadequate-response"
  | "cease-contact"
  | "transunion-dispute"
  | "experian-dispute"
  | "equifax-dispute"
  | "lexisnexis-dispute"
  | "fcra-dispute"
  | "fdcpa-dispute"
  | "debt-lawsuit-response";

export type WorkflowStep =
  | "intro"
  | "document"
  | "facts"
  | "objective"
  | "analysis"
  | "evidence"
  | "strategy"
  | "draft"
  | "review"
  | "attachments"
  | "recipient"
  | "mailing"
  | "checkout"
  | "submitted";

export type WorkflowLifecycle = "partial" | "executable" | "gold";

export interface WorkflowDefinition {
  id: WorkflowId;
  title: string;
  description: string;
  disclaimer: string;
  steps: WorkflowStep[];
  lifecycle: WorkflowLifecycle;
  goldStandardStages: string[];
}

const GOLD_STAGES = [
  "secure-ingest",
  "classify",
  "extract",
  "understand",
  "facts-provenance",
  "timeline-deadlines",
  "issues-discrepancies",
  "evidence",
  "authority-research",
  "risk",
  "strategy",
  "draft",
  "validate",
  "blocking-gates",
  "human-review",
  "authorized-mail",
  "track",
  "prove-audit",
];

const D = "Dispute Mail provides document preparation and mailing assistance. It is not a law firm and does not provide legal advice.";

const definitions: Array<Omit<WorkflowDefinition, "steps" | "goldStandardStages">> = [
  { id: "debt-collection-dispute", title: "Dispute a Debt Collection", description: "Prepare a documented dispute for a collection account using the notice, account facts, and supporting records.", disclaimer: D, lifecycle: "executable" },
  { id: "dispute-collection-agency", title: "Dispute a Collection Agency", description: "Prepare a written dispute addressed to a collection agency with an evidence-backed account record.", disclaimer: D, lifecycle: "executable" },
  { id: "debt-dispute", title: "Dispute a Debt Account", description: "Challenge an inaccurate, unsupported, or incorrect debt balance, ownership, or account record.", disclaimer: D, lifecycle: "executable" },
  { id: "debt-validation", title: "Request Debt Validation", description: "Request documentation supporting a debt claim from a collector and preserve the correspondence record.", disclaimer: "Under the FDCPA, timing and legal effects depend on the circumstances. Dispute Mail is not a law firm and does not provide legal advice.", lifecycle: "executable" },
  { id: "credit-report", title: "Dispute a Credit Report Error", description: "Dispute inaccurate, incomplete, or unverifiable information reported to a credit bureau.", disclaimer: D, lifecycle: "executable" },
  { id: "credit-report-collections", title: "Dispute a Collection on a Credit Report", description: "Challenge inaccurate collection-account reporting with a bureau and, when appropriate, the data furnisher.", disclaimer: D, lifecycle: "executable" },
  { id: "hard-inquiry", title: "Dispute a Hard Credit Inquiry", description: "Document and dispute an unrecognized or inaccurate hard inquiry on a credit report.", disclaimer: D, lifecycle: "executable" },
  { id: "charge-off", title: "Dispute Charge-Off Reporting", description: "Challenge inaccurate charge-off balance, status, dates, or account information.", disclaimer: D, lifecycle: "executable" },
  { id: "medical-collections", title: "Dispute Medical Collections", description: "Organize medical billing, insurance, payment, and collection records into a documented dispute.", disclaimer: D, lifecycle: "executable" },
  { id: "student-loan", title: "Dispute a Student Loan Account", description: "Prepare a factual dispute for a student-loan servicer, lender, or credit bureau.", disclaimer: D, lifecycle: "executable" },
  { id: "credit-card-billing", title: "Dispute a Credit Card Billing Error", description: "Prepare a written dispute for an incorrect credit-card transaction or billing item.", disclaimer: "Written correspondence does not replace any issuer-required dispute procedure. Dispute Mail is not a law firm.", lifecycle: "executable" },
  { id: "unauthorized-charge", title: "Dispute an Unauthorized Charge", description: "Prepare a written record for an unauthorized transaction while directing the customer to complete the issuer's fraud process.", disclaimer: "Written correspondence does not replace required fraud reporting. Dispute Mail is not a law firm and does not provide legal advice.", lifecycle: "executable" },
  { id: "billing-error", title: "Dispute a Billing Error", description: "Challenge an incorrect invoice, bill, statement, or service charge with a factual record.", disclaimer: "Billing disputes may have different deadlines. Dispute Mail is not a law firm and does not provide legal advice.", lifecycle: "executable" },
  { id: "subscription-billing", title: "Dispute a Subscription Charge", description: "Document recurring billing, cancellation, duplicate charges, or other subscription billing problems.", disclaimer: D, lifecycle: "executable" },
  { id: "service-contract", title: "Dispute a Service Contract", description: "Compare service-contract terms against what was billed or performed and prepare a documented dispute.", disclaimer: D, lifecycle: "executable" },
  { id: "insurance-billing", title: "Dispute Insurance Billing or Payment", description: "Document a disputed insurance bill, claim payment, benefit calculation, or related charge.", disclaimer: D, lifecycle: "executable" },
  { id: "follow-up-no-response", title: "Follow Up on a Dispute With No Response", description: "Create a documented follow-up tied to the original dispute, submission date, and proof of delivery.", disclaimer: D, lifecycle: "executable" },
  { id: "inadequate-response", title: "Escalate an Unresolved Dispute", description: "Compare the original dispute to the response received and prepare a documented escalation for the unresolved issue.", disclaimer: D, lifecycle: "executable" },
  { id: "cease-contact", title: "Document a Collection Communication Request", description: "Prepare a narrow written communication request for a collector based on the customer's stated circumstances.", disclaimer: "Legal effects of a communication request vary by circumstance. Dispute Mail is not a law firm and does not provide legal advice.", lifecycle: "executable" },
  { id: "transunion-dispute", title: "Dispute TransUnion Credit Report", description: "Dispute inaccurate, incomplete, or unverifiable information on a TransUnion credit report.", disclaimer: D, lifecycle: "executable" },
  { id: "experian-dispute", title: "Dispute Experian Credit Report", description: "Dispute inaccurate, incomplete, or unverifiable information on an Experian credit report.", disclaimer: D, lifecycle: "executable" },
  { id: "equifax-dispute", title: "Dispute Equifax Credit Report", description: "Dispute inaccurate, incomplete, or unverifiable information on an Equifax credit report.", disclaimer: D, lifecycle: "executable" },
  { id: "lexisnexis-dispute", title: "Dispute LexisNexis Report", description: "Dispute inaccurate or unverifiable information in a LexisNexis consumer report.", disclaimer: D, lifecycle: "executable" },
  { id: "fcra-dispute", title: "FCRA Dispute Letter", description: "Dispute inaccurate credit reporting under the Fair Credit Reporting Act.", disclaimer: D, lifecycle: "executable" },
  { id: "fdcpa-dispute", title: "FDCPA Dispute Letter", description: "Dispute unfair or deceptive debt collection practices under the Fair Debt Collection Practices Act.", disclaimer: D, lifecycle: "executable" },
  { id: "debt-lawsuit-response", title: "Respond to a Debt Lawsuit", description: "Prepare a documented response to a debt collection lawsuit or court summons.", disclaimer: "Dispute Mail provides document preparation and mailing assistance. It is not a law firm and does not provide legal advice. Court filings have strict deadlines and procedural requirements.", lifecycle: "executable" },
];

const STANDARD_STEPS: WorkflowStep[] = [
  "intro", "document", "facts", "objective", "analysis", "evidence", "strategy",
  "draft", "review", "attachments", "recipient", "mailing", "checkout", "submitted",
];

export const workflows: Record<WorkflowId, WorkflowDefinition> = Object.fromEntries(
  definitions.map((definition) => [
    definition.id,
    { ...definition, steps: STANDARD_STEPS, goldStandardStages: GOLD_STAGES },
  ]),
) as Record<WorkflowId, WorkflowDefinition>;
