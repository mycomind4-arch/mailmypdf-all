import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "reimbursement-claim-package",
  sectionId: "claim-proof",
  sectionName: "Claim Proof",
  sectionPath: "/claim-proof",
  path: "/claim-proof/workflows/reimbursement-claim-package",
  startPath: "/claim-proof/workflows/reimbursement-claim-package/start",
  title: "Reimbursement Claim Package",
  seoTitle: "Reimbursement Claim Package | Claim Proof | MailMyPDF",
  seoDescription: "Use the Reimbursement Claim Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Claim Proof workflow",
  heroTitle: "Reimbursement Claim Package",
  heroDescription: "Use a guided reimbursement claim package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
