export type WorkflowNavItem = {
  label: string;
  href: string;
  pipeline: string;
};

export type WorkflowNavGroup = {
  product: string;
  href: string;
  description: string;
  workflows: readonly WorkflowNavItem[];
};

export const WORKFLOW_NAV_GROUPS: readonly WorkflowNavGroup[] = [
  {
    product: "MailMyPDF",
    href: "/mail",
    description: "Core document and letter mailing workflows",
    workflows: [
      { label: "Mail a PDF", href: "/mail/mail-a-pdf", pipeline: "P01" },
      { label: "Write a Letter", href: "/mail/write-a-letter", pipeline: "P01" },
      { label: "Send a Letter Online", href: "/mail/send-a-letter-online", pipeline: "P01" },
      { label: "Send Documents by Mail", href: "/mail/send-documents", pipeline: "P01" },
      { label: "Templates", href: "/mail/templates", pipeline: "P01" },
      { label: "Proof of Mailing", href: "/mail/proof-of-mailing", pipeline: "P01" },
      { label: "Proof of Delivery", href: "/mail/proof-of-delivery", pipeline: "P01" },
      { label: "Proof of Service", href: "/mail/proof-of-service", pipeline: "P01" },
    ],
  },
  {
    product: "Appeal Mail",
    href: "/appeal-reply",
    description: "Appeals, reconsiderations, denials, and adverse decisions",
    workflows: [
      { label: "Appeal a Denied Claim", href: "/appeal/denied-claim", pipeline: "P03" },
      { label: "Appeal a Government Decision", href: "/appeal/government-decision", pipeline: "P03" },
      { label: "Respond to a Court Ruling", href: "/appeal/court-ruling", pipeline: "P04" },
      { label: "Request Reconsideration", href: "/appeal/reconsideration", pipeline: "P03" },
      { label: "Insurance Claim Denial", href: "/appeal/insurance-claim-denial", pipeline: "P03" },
      { label: "Insurance Denial Letter", href: "/appeal/insurance-denial-letter", pipeline: "P03" },
      { label: "Insurance Coverage Denial", href: "/appeal/insurance-coverage-denial", pipeline: "P03" },
      { label: "Medical Insurance Denial", href: "/appeal/medical-insurance-denial", pipeline: "P03" },
      { label: "Medical Necessity Appeal", href: "/appeal/medical-necessity-appeal", pipeline: "P03" },
      { label: "Prior Authorization Denial", href: "/appeal/prior-authorization-denial", pipeline: "P03" },
      { label: "Out-of-Network Denial", href: "/appeal/out-of-network-denial", pipeline: "P03" },
      { label: "Dental Insurance Appeal", href: "/appeal/dental-insurance-appeal", pipeline: "P03" },
      { label: "Car Insurance Appeal", href: "/appeal/car-insurance-appeal", pipeline: "P03" },
      { label: "Life Insurance Denial", href: "/appeal/life-insurance-denial", pipeline: "P03" },
      { label: "Claim Denial Letter", href: "/appeal/claim-denial-letter", pipeline: "P03" },
      { label: "SSDI Denial", href: "/appeal/ssdi-denial", pipeline: "P03" },
      { label: "SSI Denial", href: "/appeal/ssi-denial", pipeline: "P03" },
      { label: "Social Security Denial", href: "/appeal/social-security-denial", pipeline: "P03" },
      { label: "Medicaid Denial", href: "/appeal/medicaid-denial", pipeline: "P03" },
      { label: "Unemployment Denial", href: "/appeal/unemployment-denial", pipeline: "P03" },
      { label: "EDD Denial", href: "/appeal/edd-denial", pipeline: "P03" },
      { label: "Financial Aid Appeal", href: "/appeal/financial-aid-appeal", pipeline: "P03" },
      { label: "SAP Appeal", href: "/appeal/sap-appeal", pipeline: "P03" },
      { label: "Financial Aid Suspension", href: "/appeal/financial-aid-suspension-appeal", pipeline: "P03" },
      { label: "Financial Aid Reinstatement", href: "/appeal/financial-aid-reinstatement", pipeline: "P03" },
      { label: "Financial Aid Special Circumstances", href: "/appeal/financial-aid-special-circumstances", pipeline: "P03" },
      { label: "Scholarship Appeal", href: "/appeal/scholarship-appeal", pipeline: "P03" },
      { label: "FAFSA Appeal", href: "/appeal/fafsa-appeal", pipeline: "P03" },
      { label: "License Suspension Appeal", href: "/appeal/license-suspension-appeal", pipeline: "P09" },
      { label: "Driver's License Suspension", href: "/appeal/drivers-license-suspension", pipeline: "P09" },
      { label: "License Revocation Appeal", href: "/appeal/license-revocation-appeal", pipeline: "P09" },
      { label: "DMV Suspension Appeal", href: "/appeal/dmv-suspension-appeal", pipeline: "P09" },
      { label: "Registration Suspension Appeal", href: "/appeal/registration-suspension-appeal", pipeline: "P09" },
    ],
  },
  {
    product: "Notice Respond",
    href: "/notice-response",
    description: "Official notices, agency actions, summonses, and formal responses",
    workflows: [
      { label: "IRS Notice", href: "/notice/irs-notice", pipeline: "P02" },
      { label: "CP2000 Response", href: "/notice/cp2000-response", pipeline: "P02" },
      { label: "Court Summons", href: "/notice/court-summons", pipeline: "P04" },
      { label: "Agency Action", href: "/notice/agency-action", pipeline: "P02" },
      { label: "File an Appeal", href: "/notice/file-appeal", pipeline: "P03" },
    ],
  },
  {
    product: "Immigration Mail",
    href: "/immigration",
    description: "Immigration notices, evidence packages, and explanation letters",
    workflows: [
      { label: "Respond to a Notice", href: "/immigration/respond-to-notice", pipeline: "P05" },
      { label: "Submit Supporting Documents", href: "/immigration/supporting-documents", pipeline: "P05" },
      { label: "Prepare an Explanation Letter", href: "/immigration/explanation-letter", pipeline: "P05" },
    ],
  },
  {
    product: "Dispute Mail",
    href: "/dispute-mail",
    description: "Debt, credit, billing, collections, and consumer disputes",
    workflows: [
      { label: "Debt Collection Dispute", href: "/dispute/debt-collection-dispute", pipeline: "P06" },
      { label: "Dispute Collection Agency", href: "/dispute/dispute-collection-agency", pipeline: "P06" },
      { label: "Debt Dispute", href: "/dispute/debt-dispute", pipeline: "P06" },
      { label: "Debt Validation", href: "/dispute/debt-validation", pipeline: "P06" },
      { label: "Credit Report Error", href: "/dispute/credit-report", pipeline: "P06" },
      { label: "Credit Report Collections", href: "/dispute/credit-report-collections", pipeline: "P06" },
      { label: "Hard Inquiry", href: "/dispute/hard-inquiry", pipeline: "P06" },
      { label: "Charge-Off Reporting", href: "/dispute/charge-off", pipeline: "P06" },
      { label: "Medical Collections", href: "/dispute/medical-collections", pipeline: "P06" },
      { label: "Student Loan Account", href: "/dispute/student-loan", pipeline: "P06" },
      { label: "Credit Card Billing Error", href: "/dispute/credit-card-billing", pipeline: "P06" },
      { label: "Unauthorized Charge", href: "/dispute/unauthorized-charge", pipeline: "P06" },
      { label: "Billing Error", href: "/dispute/billing-error", pipeline: "P06" },
      { label: "Subscription Charge", href: "/dispute/subscription-billing", pipeline: "P06" },
      { label: "Service Contract", href: "/dispute/service-contract", pipeline: "P06" },
      { label: "Insurance Billing or Payment", href: "/dispute/insurance-billing", pipeline: "P06" },
      { label: "Follow Up With No Response", href: "/dispute/follow-up-no-response", pipeline: "P06" },
      { label: "Escalate an Unresolved Dispute", href: "/dispute/inadequate-response", pipeline: "P06" },
      { label: "Collection Communication Request", href: "/dispute/cease-contact", pipeline: "P06" },
    ],
  },
  {
    product: "Small Business Mail",
    href: "/small-business-mail",
    description: "Business correspondence, reminders, demands, and compliance workflows",
    workflows: [
      { label: "Payment Reminder", href: "/business/payment-reminder", pipeline: "P07" },
      { label: "Payment Demand", href: "/business/payment-demand", pipeline: "P07" },
      { label: "Contract Renewal", href: "/business/contract-renewal", pipeline: "P07" },
      { label: "Compliance Notice", href: "/business/compliance-notice", pipeline: "P07" },
      { label: "Customer Dispute Response", href: "/business/customer-dispute-response", pipeline: "P07" },
    ],
  },
  {
    product: "Records Request",
    href: "/records",
    description: "Records and public-information request workflows",
    workflows: [
      { label: "Records Request", href: "/records/records-request", pipeline: "P08" },
      { label: "Public Records Request", href: "/records/public-records-request", pipeline: "P08" },
      { label: "Agency Records Request", href: "/records/agency-records-request", pipeline: "P08" },
      { label: "Records Follow-Up", href: "/records/follow-up", pipeline: "P08" },
    ],
  },
  {
    product: "Tenant Reply",
    href: "/tenant",
    description: "Tenant notices, repair correspondence, and housing responses",
    workflows: [
      { label: "Tenant Notice Response", href: "/tenant/notice-response", pipeline: "P09" },
      { label: "Repair / Condition Response", href: "/tenant/repair-condition-response", pipeline: "P09" },
      { label: "Tenant Dispute", href: "/tenant/dispute", pipeline: "P09" },
      { label: "Landlord Correspondence", href: "/tenant/landlord-correspondence", pipeline: "P09" },
    ],
  },
  {
    product: "Permit Reply",
    href: "/permit",
    description: "Permit, licensing, deficiency, and regulatory response workflows",
    workflows: [
      { label: "Permit Reply", href: "/permit/permit-reply", pipeline: "P09" },
      { label: "Permit Denial Response", href: "/permit/permit-denial-response", pipeline: "P09" },
      { label: "Permit Correction Response", href: "/permit/permit-correction-response", pipeline: "P09" },
      { label: "Agency Permit Correspondence", href: "/permit/agency-permit-correspondence", pipeline: "P09" },
    ],
  },
  {
    product: "Benefits Appeal",
    href: "/benefits",
    description: "Benefits denials, reconsideration, documentation, and review preparation",
    workflows: [
      { label: "Benefits Appeal", href: "/benefits/benefits-appeal", pipeline: "P03" },
      { label: "Benefits Denial", href: "/benefits/benefits-denial", pipeline: "P03" },
      { label: "Benefits Reconsideration", href: "/benefits/benefits-reconsideration", pipeline: "P03" },
      { label: "Benefits Documentation", href: "/benefits/benefits-documentation", pipeline: "P10" },
      { label: "Benefits Hearing Preparation", href: "/benefits/hearing-preparation", pipeline: "P03" },
    ],
  },
  {
    product: "Claim Proof",
    href: "/claim",
    description: "Evidence-first claim documentation and proof packages",
    workflows: [
      { label: "Claim Proof", href: "/claim/claim-proof", pipeline: "P10" },
      { label: "Claim Evidence Package", href: "/claim/evidence-package", pipeline: "P10" },
      { label: "Claim Documentation", href: "/claim/documentation", pipeline: "P10" },
      { label: "Claim Submission Package", href: "/claim/submission-package", pipeline: "P10" },
    ],
  },
  {
    product: "GovReply",
    href: "/govreply",
    description: "Government and agency response workflows",
    workflows: [
      { label: "Government Notice Response", href: "/govreply/government-notice-response", pipeline: "P02" },
      { label: "Government Letter Response", href: "/govreply/government-letter-response", pipeline: "P02" },
      { label: "Agency Request Response", href: "/govreply/agency-request-response", pipeline: "P02" },
      { label: "Evidence Package", href: "/govreply/evidence-package", pipeline: "P10" },
      { label: "Deadline / Compliance Response", href: "/govreply/deadline-compliance", pipeline: "P02" },
    ],
  },
];

export const allWorkflowNavItems = WORKFLOW_NAV_GROUPS.flatMap((group) => group.workflows);
