export type WorkflowCandidateNormalizationStatus =
  | "MODELED_REFERENCE_CONFIRMED"
  | "NEEDS_CANONICAL_ID"
  | "NEEDS_CANONICAL_ROUTE";

export type WorkflowCandidateReviewStatus = "NEEDS_INDIVIDUAL_REVIEW";

export type WorkflowSeoCandidate = {
  /** Internal extraction key only. Never use this as a public route or workflow id. */
  candidateKey: string;
  vertical: string;
  title: string;
  sourcePath: string;
  sourceEvidence: string;
  reviewStatus: WorkflowCandidateReviewStatus;
  normalizationStatus: WorkflowCandidateNormalizationStatus;
  /** Existing implementation/config reference when the source is already concrete. */
  implementationRef?: string;
};

const NEEDS_REVIEW = "NEEDS_INDIVIDUAL_REVIEW" as const;

function candidate(
  candidateKey: string,
  vertical: string,
  title: string,
  sourcePath: string,
  sourceEvidence: string,
  normalizationStatus: WorkflowCandidateNormalizationStatus = "NEEDS_CANONICAL_ID",
  implementationRef?: string,
): WorkflowSeoCandidate {
  return {
    candidateKey,
    vertical,
    title,
    sourcePath,
    sourceEvidence,
    reviewStatus: NEEDS_REVIEW,
    normalizationStatus,
    ...(implementationRef ? { implementationRef } : {}),
  };
}

/**
 * REVIEW-ONLY WORKFLOW EXTRACTION REGISTRY.
 *
 * These records capture workflow concepts that are explicitly named in the current
 * build specs. The build specs are discovery/provenance inputs, NOT an assertion
 * that the workflow definition, SEO brief, legal/domain rules, evidence model, or
 * execution flow has reached the required final standard.
 *
 * Nothing in this registry is indexable and nothing here becomes a canonical route
 * automatically. Each candidate must later be individually reviewed, upgraded to
 * what the workflow is actually supposed to become, normalized against the live
 * product topology, and then deliberately promoted into the authority catalog.
 *
 * Do not invent missing workflows to satisfy a target count. Some specs describe
 * larger future families without enumerating the individual nodes; those families
 * remain intentionally unresolved until source material names the actual workflows.
 */
export const SEO_WORKFLOW_CANDIDATES: readonly WorkflowSeoCandidate[] = [
  // Notice Respond — build-specs/01_NOTICE_RESPOND.md
  candidate("notice-respond:cp2000-response", "notice-respond", "CP2000 Response", "build-specs/01_NOTICE_RESPOND.md", "Named flagship workflow; an implementation route also exists.", "NEEDS_CANONICAL_ROUTE", "apps/verticals/notice-respond/src/routes/workflows/cp2000-response.tsx"),
  candidate("notice-respond:cp14-response", "notice-respond", "CP14 Response", "build-specs/01_NOTICE_RESPOND.md", "Named flagship workflow; an implementation route also exists.", "NEEDS_CANONICAL_ROUTE", "apps/verticals/notice-respond/src/routes/workflows/cp14-response.tsx"),
  candidate("notice-respond:cp504-response", "notice-respond", "CP504 Response", "build-specs/01_NOTICE_RESPOND.md", "Named flagship workflow; an implementation route also exists.", "NEEDS_CANONICAL_ROUTE", "apps/verticals/notice-respond/src/routes/workflows/cp504-response.tsx"),
  candidate("notice-respond:cp523-response", "notice-respond", "CP523 Response", "build-specs/01_NOTICE_RESPOND.md", "Named flagship workflow; an implementation route also exists.", "NEEDS_CANONICAL_ROUTE", "apps/verticals/notice-respond/src/routes/workflows/cp523-response.tsx"),
  candidate("notice-respond:court-summons", "notice-respond", "Court Summons Response", "build-specs/01_NOTICE_RESPOND.md", "Named flagship workflow; an implementation route also exists.", "NEEDS_CANONICAL_ROUTE", "apps/verticals/notice-respond/src/routes/workflows/court-summons.tsx"),
  candidate("notice-respond:dmv-notice", "notice-respond", "DMV Notice Response", "build-specs/01_NOTICE_RESPOND.md", "Named flagship workflow; an implementation route also exists.", "NEEDS_CANONICAL_ROUTE", "apps/verticals/notice-respond/src/routes/workflows/dmv-notice.tsx"),
  candidate("notice-respond:irs-identity-verification", "notice-respond", "IRS Identity Verification Notice", "build-specs/01_NOTICE_RESPOND.md", "Named in the planned workflow directory."),
  candidate("notice-respond:irs-appeals-cdp", "notice-respond", "IRS Appeals / Collection Due Process Notice", "build-specs/01_NOTICE_RESPOND.md", "Named in the planned workflow directory."),
  candidate("notice-respond:ssa-notice", "notice-respond", "SSA Notice Response", "build-specs/01_NOTICE_RESPOND.md", "Named in the planned workflow directory."),
  candidate("notice-respond:social-security-overpayment", "notice-respond", "Social Security Overpayment Notice", "build-specs/01_NOTICE_RESPOND.md", "Named in the planned workflow directory."),
  candidate("notice-respond:benefits-eligibility", "notice-respond", "Benefits Eligibility Notice", "build-specs/01_NOTICE_RESPOND.md", "Named in the planned workflow directory."),
  candidate("notice-respond:state-tax-notice", "notice-respond", "State Tax Notice", "build-specs/01_NOTICE_RESPOND.md", "Named in the planned workflow directory."),
  candidate("notice-respond:state-agency-notice", "notice-respond", "State Agency Notice", "build-specs/01_NOTICE_RESPOND.md", "Named in the planned workflow directory."),
  candidate("notice-respond:local-code-compliance", "notice-respond", "Local Code / Compliance Notice", "build-specs/01_NOTICE_RESPOND.md", "Named in the planned workflow directory."),
  candidate("notice-respond:jury-duty-admin", "notice-respond", "Jury Duty / Administrative Notice", "build-specs/01_NOTICE_RESPOND.md", "Named in the planned workflow directory."),
  candidate("notice-respond:general-government-notice", "notice-respond", "General Government Notice Response", "build-specs/01_NOTICE_RESPOND.md", "Named in the planned workflow directory."),

  // Appeal Mail — build-specs/02_APPEAL_MAIL.md
  candidate("appeal-mail:ssdi-denial", "appeal-mail", "SSDI Denial Appeal", "build-specs/02_APPEAL_MAIL.md", "Explicit pricing/workflow profile in the spec."),
  candidate("appeal-mail:irs-cp2000", "appeal-mail", "IRS CP2000 Appeal / Response", "build-specs/02_APPEAL_MAIL.md", "Explicit pricing/workflow profile in the spec."),
  candidate("appeal-mail:unemployment-denial", "appeal-mail", "Unemployment Denial Appeal", "build-specs/02_APPEAL_MAIL.md", "Explicit pricing/workflow profile in the spec."),
  candidate("appeal-mail:academic-dismissal", "appeal-mail", "Academic Dismissal Appeal", "build-specs/02_APPEAL_MAIL.md", "Explicit pricing/workflow profile in the spec."),
  candidate("appeal-mail:insurance-denial", "appeal-mail", "Insurance Denial Appeal", "build-specs/02_APPEAL_MAIL.md", "Explicit pricing/workflow profile in the spec."),
  candidate("appeal-mail:professional-license", "appeal-mail", "Professional License Appeal", "build-specs/02_APPEAL_MAIL.md", "Explicit pricing/workflow profile in the spec."),
  candidate("appeal-mail:specialized-admin", "appeal-mail", "Specialized Administrative Appeal", "build-specs/02_APPEAL_MAIL.md", "Explicit pricing/workflow profile in the spec."),

  // Immigration Mail — build-specs/03_IMMIGRATION_MAIL.md
  candidate("immigration-mail:respond-to-notice", "immigration-mail", "Respond to Notice", "build-specs/03_IMMIGRATION_MAIL.md", "Named launch workflow in the spec."),
  candidate("immigration-mail:supporting-documents", "immigration-mail", "Supporting Documents", "build-specs/03_IMMIGRATION_MAIL.md", "Named launch workflow in the spec."),
  candidate("immigration-mail:explanation-letter", "immigration-mail", "Explanation Letter", "build-specs/03_IMMIGRATION_MAIL.md", "Named launch workflow in the spec."),
  candidate("immigration-mail:rfe-noid", "immigration-mail", "RFE / NOID Response Workspace", "build-specs/03_IMMIGRATION_MAIL.md", "Named launch workflow in the spec."),
  candidate("immigration-mail:consular-nvc-follow-up", "immigration-mail", "Consular or NVC Follow-Up", "build-specs/03_IMMIGRATION_MAIL.md", "Named launch workflow in the spec."),
  candidate("immigration-mail:address-contact-update", "immigration-mail", "Address / Contact Update Packet", "build-specs/03_IMMIGRATION_MAIL.md", "Named launch workflow in the spec."),
  candidate("immigration-mail:interview-appointment-prep", "immigration-mail", "Interview / Appointment Preparation Packet", "build-specs/03_IMMIGRATION_MAIL.md", "Named launch workflow in the spec."),

  // Dispute Mail — build-specs/04_DISPUTE_MAIL.md
  ...[
    ["debt-collection-dispute", "Debt Collection Dispute"],
    ["dispute-collection-agency", "Collection Agency Dispute"],
    ["debt-dispute", "Debt Dispute"],
    ["debt-validation", "Debt Validation"],
    ["credit-report", "Credit Report Dispute"],
    ["credit-report-collections", "Credit Report Collections Dispute"],
    ["hard-inquiry", "Hard Inquiry Dispute"],
    ["charge-off", "Charge-Off Dispute"],
    ["medical-collections", "Medical Collections Dispute"],
    ["student-loan", "Student Loan Dispute"],
    ["transunion-dispute", "TransUnion Dispute"],
    ["experian-dispute", "Experian Dispute"],
    ["equifax-dispute", "Equifax Dispute"],
    ["lexisnexis-dispute", "LexisNexis Dispute"],
    ["fcra-dispute", "FCRA Dispute"],
    ["credit-card-billing", "Credit Card Billing Dispute"],
    ["unauthorized-charge", "Unauthorized Charge Dispute"],
    ["billing-error", "Billing Error Dispute"],
    ["subscription-billing", "Subscription Billing Dispute"],
    ["service-contract", "Service Contract Dispute"],
    ["insurance-billing", "Insurance Billing Dispute"],
    ["follow-up-no-response", "Follow-Up: No Response"],
    ["inadequate-response", "Inadequate Response Follow-Up"],
    ["cease-contact", "Cease Contact Request"],
    ["fdcpa-dispute", "FDCPA Dispute"],
    ["debt-lawsuit-response", "Debt Lawsuit Response"],
  ].map(([slug, title]) => candidate(`dispute-mail:${slug}`, "dispute-mail", title, "build-specs/04_DISPUTE_MAIL.md", "Named workflow slug in the spec directory matrix.", "NEEDS_CANONICAL_ROUTE", `apps/verticals/dispute-mail/src/routes/workflows/${slug}.tsx`)),

  // Small Business — build-specs/05_SMALL_BUSINESS.md
  candidate("small-business:payment-reminder", "small-business", "Payment Reminder", "build-specs/05_SMALL_BUSINESS.md", "Named current executable catalog workflow."),
  candidate("small-business:payment-demand", "small-business", "Payment Demand", "build-specs/05_SMALL_BUSINESS.md", "Named current executable catalog workflow."),
  candidate("small-business:contract-renewal", "small-business", "Contract Renewal", "build-specs/05_SMALL_BUSINESS.md", "Named current executable catalog workflow."),
  candidate("small-business:compliance-notice", "small-business", "Compliance Notice", "build-specs/05_SMALL_BUSINESS.md", "Named current executable catalog workflow."),
  candidate("small-business:customer-dispute-response", "small-business", "Customer Dispute Response", "build-specs/05_SMALL_BUSINESS.md", "Named current executable catalog workflow."),
  candidate("small-business:late-payment-follow-up", "small-business", "Late Payment Follow-Up", "build-specs/05_SMALL_BUSINESS.md", "Named future workflow example; not treated as executable."),
  candidate("small-business:vendor-dispute-response", "small-business", "Vendor Dispute Response", "build-specs/05_SMALL_BUSINESS.md", "Named future workflow example; not treated as executable."),
  candidate("small-business:contract-termination-notice", "small-business", "Contract Termination Notice", "build-specs/05_SMALL_BUSINESS.md", "Named future workflow example; not treated as executable."),
  candidate("small-business:compliance-reminder", "small-business", "Compliance Reminder", "build-specs/05_SMALL_BUSINESS.md", "Named future workflow example; not treated as executable."),
  candidate("small-business:business-records-request", "small-business", "Business Records Request", "build-specs/05_SMALL_BUSINESS.md", "Named future workflow example; not treated as executable."),
  candidate("small-business:refund-chargeback-correspondence", "small-business", "Customer Refund or Chargeback Correspondence", "build-specs/05_SMALL_BUSINESS.md", "Named future workflow example; not treated as executable."),

  // Records Requests — build-specs/06_RECORDS_REQUESTS.md
  candidate("records-request:city-public-records", "records-request", "City Public Records Request", "build-specs/06_RECORDS_REQUESTS.md", "Named example workflow in the records directory."),
  candidate("records-request:state-agency-records", "records-request", "State Agency Records Request", "build-specs/06_RECORDS_REQUESTS.md", "Named example workflow in the records directory."),
  candidate("records-request:police-incident-report", "records-request", "Police Incident Report Request", "build-specs/06_RECORDS_REQUESTS.md", "Named example workflow in the records directory."),
  candidate("records-request:court-file", "records-request", "Court File Request", "build-specs/06_RECORDS_REQUESTS.md", "Named example workflow in the records directory."),
  candidate("records-request:code-enforcement-records", "records-request", "Code Enforcement Records Request", "build-specs/06_RECORDS_REQUESTS.md", "Named example workflow in the records directory."),
  candidate("records-request:planning-department-records", "records-request", "Planning Department Records Request", "build-specs/06_RECORDS_REQUESTS.md", "Named example workflow in the records directory."),
  candidate("records-request:business-license-records", "records-request", "Business License Records Request", "build-specs/06_RECORDS_REQUESTS.md", "Named example workflow in the records directory."),
  candidate("records-request:school-records", "records-request", "School Records Request", "build-specs/06_RECORDS_REQUESTS.md", "Named example workflow in the records directory."),
  candidate("records-request:employment-file", "records-request", "Employment File Request", "build-specs/06_RECORDS_REQUESTS.md", "Named example workflow in the records directory."),

  // Code Enforcement — build-specs/07_CODE_ENFORCEMENT.md
  candidate("code-enforcement:response", "code-enforcement", "Code Enforcement Response", "build-specs/07_CODE_ENFORCEMENT.md", "Explicit flagship workflow. The spec references a much larger future family but does not enumerate safe canonical nodes."),

  // Benefits Appeal — build-specs/08_BENEFITS_APPEAL.md
  candidate("benefits-appeal:social-security-disability", "benefits-appeal", "Social Security Disability Appeal", "build-specs/08_BENEFITS_APPEAL.md", "Named launch workflow."),
  candidate("benefits-appeal:ssi-denial", "benefits-appeal", "SSI Denial Appeal", "build-specs/08_BENEFITS_APPEAL.md", "Named launch workflow."),
  candidate("benefits-appeal:medicaid-denial", "benefits-appeal", "Medicaid Denial Appeal", "build-specs/08_BENEFITS_APPEAL.md", "Named launch workflow."),
  candidate("benefits-appeal:snap-food-assistance", "benefits-appeal", "SNAP / Food Assistance Appeal", "build-specs/08_BENEFITS_APPEAL.md", "Named launch workflow."),
  candidate("benefits-appeal:unemployment-benefits", "benefits-appeal", "Unemployment Benefits Appeal", "build-specs/08_BENEFITS_APPEAL.md", "Named launch workflow."),
  candidate("benefits-appeal:workers-compensation", "benefits-appeal", "Workers’ Compensation Appeal", "build-specs/08_BENEFITS_APPEAL.md", "Named launch workflow."),
  candidate("benefits-appeal:veteran-benefits", "benefits-appeal", "Veteran Benefits Appeal", "build-specs/08_BENEFITS_APPEAL.md", "Named launch workflow."),
  candidate("benefits-appeal:housing-assistance", "benefits-appeal", "Housing Assistance Appeal", "build-specs/08_BENEFITS_APPEAL.md", "Named launch workflow."),
  candidate("benefits-appeal:medicare-denial", "benefits-appeal", "Medicare Denial Appeal", "build-specs/08_BENEFITS_APPEAL.md", "Named launch workflow."),
  candidate("benefits-appeal:state-assistance", "benefits-appeal", "State Assistance Appeal", "build-specs/08_BENEFITS_APPEAL.md", "Named launch workflow."),

  // Private Office — build-specs/09_PRIVATE_OFFICE.md
  candidate("private-office:contractor-dispute", "private-office", "Contractor Dispute", "build-specs/09_PRIVATE_OFFICE.md", "Named flagship workflow."),
  candidate("private-office:property-insurance-claim", "private-office", "Property Insurance Claim", "build-specs/09_PRIVATE_OFFICE.md", "Named flagship workflow."),
  candidate("private-office:bank-wire-transfer-dispute", "private-office", "Bank / Wire Transfer Dispute", "build-specs/09_PRIVATE_OFFICE.md", "Named flagship workflow."),
  candidate("private-office:trust-beneficiary-notice", "private-office", "Trust Beneficiary Notice", "build-specs/09_PRIVATE_OFFICE.md", "Named flagship workflow."),
  candidate("private-office:security-deposit-dispute", "private-office", "Security Deposit Dispute", "build-specs/09_PRIVATE_OFFICE.md", "Named flagship workflow."),
];
