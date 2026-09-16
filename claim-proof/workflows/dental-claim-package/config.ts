import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "dental-claim-package",
  sectionId: "claim-proof",
  sectionName: "Claim Proof",
  sectionPath: "/claim-proof",
  path: "/claim-proof/workflows/dental-claim-package",
  startPath: "/claim-proof/workflows/dental-claim-package/start",
  title: "Dental Claim Package",
  seoTitle: "Dental Claim Package | Claim Proof | MailMyPDF",
  seoDescription: "Use the Dental Claim Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Claim Proof workflow",
  heroTitle: "Dental Claim Package",
  heroDescription: "Use a guided dental claim package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
