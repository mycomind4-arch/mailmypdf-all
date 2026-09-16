import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "travel-claim-package",
  sectionId: "claim-proof",
  sectionName: "Claim Proof",
  sectionPath: "/claim-proof",
  path: "/claim-proof/workflows/travel-claim-package",
  startPath: "/claim-proof/workflows/travel-claim-package/start",
  title: "Travel Claim Package",
  seoTitle: "Travel Claim Package | Claim Proof | MailMyPDF",
  seoDescription: "Use the Travel Claim Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Claim Proof workflow",
  heroTitle: "Travel Claim Package",
  heroDescription: "Use a guided travel claim package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
