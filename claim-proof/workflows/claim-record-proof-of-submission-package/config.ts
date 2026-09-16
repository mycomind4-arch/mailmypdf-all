import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "claim-record-proof-of-submission-package",
  sectionId: "claim-proof",
  sectionName: "Claim Proof",
  sectionPath: "/claim-proof",
  path: "/claim-proof/workflows/claim-record-proof-of-submission-package",
  startPath: "/claim-proof/workflows/claim-record-proof-of-submission-package/start",
  title: "Claim Record Proof Of Submission Package",
  seoTitle: "Claim Record Proof Of Submission Package | Claim Proof | MailMyPDF",
  seoDescription: "Use the Claim Record Proof Of Submission Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Claim Proof workflow",
  heroTitle: "Claim Record Proof Of Submission Package",
  heroDescription: "Use a guided claim record proof of submission package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
