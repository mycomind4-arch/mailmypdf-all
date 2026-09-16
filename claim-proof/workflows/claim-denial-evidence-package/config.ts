import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "claim-denial-evidence-package",
  sectionId: "claim-proof",
  sectionName: "Claim Proof",
  sectionPath: "/claim-proof",
  path: "/claim-proof/workflows/claim-denial-evidence-package",
  startPath: "/claim-proof/workflows/claim-denial-evidence-package/start",
  title: "Claim Denial Evidence Package",
  seoTitle: "Claim Denial Evidence Package | Claim Proof | MailMyPDF",
  seoDescription: "Use the Claim Denial Evidence Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Claim Proof workflow",
  heroTitle: "Claim Denial Evidence Package",
  heroDescription: "Use a guided claim denial evidence package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
