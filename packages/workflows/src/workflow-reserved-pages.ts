import type { WorkflowAuthorityPage } from "./workflow-page-contract.js";
import type { PipelineId } from "./pipeline-registry.js";
import { WORKFLOW_AUTHORITY_SECTIONS } from "./workflow-page-contract.js";

const reserve = (
  workflowId: string,
  vertical: string,
  title: string,
  pipeline: PipelineId,
  slug: string,
  primaryIntent: string,
): WorkflowAuthorityPage => ({
  workflowId,
  vertical,
  pipeline,
  title,
  canonicalPath: `/${vertical}/${slug}`,
  primaryIntent,
  maturity: "placeholder",
  authoritySections: WORKFLOW_AUTHORITY_SECTIONS,
  officialSources: [],
  relatedWorkflows: [],
});

/** Reserved pages for future workflows. URLs are intentionally stable before implementation. */
export const RESERVED_WORKFLOW_AUTHORITY_PAGES: readonly WorkflowAuthorityPage[] = [
  // Core
  reserve("mail-a-pdf", "mail", "Mail a PDF", "P01_CORE_MAIL", "mail-a-pdf", "mail a PDF"),
  reserve("write-a-letter", "mail", "Write a Letter", "P01_CORE_MAIL", "write-a-letter", "write a letter"),
  reserve("send-a-letter", "mail", "Send a Letter", "P01_CORE_MAIL", "send-a-letter", "send a letter"),
  reserve("letter-templates", "mail", "Letter Templates", "P01_CORE_MAIL", "letter-templates", "letter template"),
  reserve("proof-of-mailing", "mail", "Proof of Mailing", "P01_CORE_MAIL", "proof-of-mailing", "proof of mailing"),
  reserve("proof-of-service", "mail", "Proof of Service", "P01_CORE_MAIL", "proof-of-service", "proof of service"),

  // Records
  reserve("records-request", "records", "Records Request", "P08_RECORDS", "records-request", "records request"),
  reserve("public-records-request", "records", "Public Records Request", "P08_RECORDS", "public-records-request", "public records request"),
  reserve("agency-records-request", "records", "Agency Records Request", "P08_RECORDS", "agency-records-request", "agency records request"),
  reserve("records-follow-up", "records", "Records Request Follow-Up", "P08_RECORDS", "records-follow-up", "records request follow up"),
  reserve("records-deficiency-response", "records", "Respond to a Records Deficiency", "P08_RECORDS", "records-deficiency-response", "records deficiency response"),

  // Tenant
  reserve("tenant-notice-response", "tenant", "Tenant Notice Response", "P09_REGULATORY", "tenant-notice-response", "tenant notice response"),
  reserve("repair-condition-response", "tenant", "Repair and Condition Response", "P09_REGULATORY", "repair-condition-response", "tenant repair response"),
  reserve("tenant-dispute", "tenant", "Tenant Dispute", "P09_REGULATORY", "tenant-dispute", "tenant dispute"),
  reserve("landlord-correspondence", "tenant", "Landlord Correspondence", "P09_REGULATORY", "landlord-correspondence", "landlord correspondence"),
  reserve("tenant-evidence-package", "tenant", "Tenant Evidence Package", "P10_CLAIM_PROOF", "tenant-evidence-package", "tenant evidence package"),

  // Permits / regulatory
  reserve("permit-reply", "permit", "Permit Reply", "P09_REGULATORY", "permit-reply", "permit reply"),
  reserve("permit-denial-response", "permit", "Permit Denial Response", "P09_REGULATORY", "permit-denial-response", "permit denial response"),
  reserve("permit-correction-response", "permit", "Permit Correction Response", "P09_REGULATORY", "permit-correction-response", "permit correction response"),
  reserve("agency-permit-correspondence", "permit", "Agency Permit Correspondence", "P09_REGULATORY", "agency-permit-correspondence", "agency permit correspondence"),
  reserve("permit-supporting-documents", "permit", "Permit Supporting Documents", "P10_CLAIM_PROOF", "permit-supporting-documents", "permit supporting documents"),

  // Benefits
  reserve("benefits-appeal", "benefits", "Benefits Appeal", "P03_APPEAL", "benefits-appeal", "benefits appeal"),
  reserve("benefits-denial", "benefits", "Benefits Denial", "P03_APPEAL", "benefits-denial", "benefits denial appeal"),
  reserve("benefits-reconsideration", "benefits", "Benefits Reconsideration", "P03_APPEAL", "benefits-reconsideration", "benefits reconsideration"),
  reserve("benefits-documentation", "benefits", "Benefits Documentation Package", "P10_CLAIM_PROOF", "benefits-documentation", "benefits documentation"),
  reserve("benefits-review-preparation", "benefits", "Benefits Review Preparation", "P03_APPEAL", "benefits-review-preparation", "benefits review preparation"),

  // Claim proof
  reserve("claim-proof", "claim", "Claim Proof", "P10_CLAIM_PROOF", "claim-proof", "claim proof"),
  reserve("claim-evidence-package", "claim", "Claim Evidence Package", "P10_CLAIM_PROOF", "claim-evidence-package", "claim evidence package"),
  reserve("claim-documentation", "claim", "Claim Documentation", "P10_CLAIM_PROOF", "claim-documentation", "claim documentation"),
  reserve("claim-submission-package", "claim", "Claim Submission Package", "P10_CLAIM_PROOF", "claim-submission-package", "claim submission package"),

  // General government response workflows belong to Notice Respond.
  reserve("government-notice-response", "notice", "Government Notice Response", "P02_OFFICIAL_RESPONSE", "government-notice-response", "government notice response"),
  reserve("government-letter-response", "notice", "Government Letter Response", "P02_OFFICIAL_RESPONSE", "government-letter-response", "government letter response"),
  reserve("agency-request-response", "notice", "Agency Request Response", "P02_OFFICIAL_RESPONSE", "agency-request-response", "agency request response"),
  reserve("government-evidence-package", "notice", "Government Evidence Package", "P10_CLAIM_PROOF", "government-evidence-package", "government evidence package"),
  reserve("deadline-compliance-response", "notice", "Deadline and Compliance Response", "P02_OFFICIAL_RESPONSE", "deadline-compliance-response", "government deadline compliance response"),

  // Future ecosystem discovery / expansion
  reserve("code-enforcement-response", "future", "Code Enforcement Response", "P09_REGULATORY", "code-enforcement-response", "code enforcement response"),
  reserve("insurance-claim-proof", "future", "Insurance Claim Proof", "P10_CLAIM_PROOF", "insurance-claim-proof", "insurance claim proof"),
  reserve("benefits-evidence-request", "future", "Benefits Evidence Request", "P10_CLAIM_PROOF", "benefits-evidence-request", "benefits evidence request"),
  reserve("agency-correction-response", "future", "Agency Correction Response", "P09_REGULATORY", "agency-correction-response", "agency correction response"),
];

export const reservedWorkflowAuthorityPageIds = RESERVED_WORKFLOW_AUTHORITY_PAGES.map((page) => page.workflowId);
