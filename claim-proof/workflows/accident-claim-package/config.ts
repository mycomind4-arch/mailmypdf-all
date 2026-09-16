import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "accident-claim-package",
  sectionId: "claim-proof",
  sectionName: "Claim Proof",
  sectionPath: "/claim-proof",
  path: "/claim-proof/workflows/accident-claim-package",
  startPath: "/claim-proof/workflows/accident-claim-package/start",
  title: "Accident Claim Package",
  seoTitle: "Accident Claim Package | Claim Proof | MailMyPDF",
  seoDescription: "Use the Accident Claim Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Claim Proof workflow",
  heroTitle: "Accident Claim Package",
  heroDescription: "Use a guided accident claim package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
