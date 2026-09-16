import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "claim-timeline-package",
  sectionId: "claim-proof",
  sectionName: "Claim Proof",
  sectionPath: "/claim-proof",
  path: "/claim-proof/workflows/claim-timeline-package",
  startPath: "/claim-proof/workflows/claim-timeline-package/start",
  title: "Claim Timeline Package",
  seoTitle: "Claim Timeline Package | Claim Proof | MailMyPDF",
  seoDescription: "Use the Claim Timeline Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Claim Proof workflow",
  heroTitle: "Claim Timeline Package",
  heroDescription: "Use a guided claim timeline package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
