import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "disability-claim-evidence-package",
  sectionId: "claim-proof",
  sectionName: "Claim Proof",
  sectionPath: "/claim-proof",
  path: "/claim-proof/workflows/disability-claim-evidence-package",
  startPath: "/claim-proof/workflows/disability-claim-evidence-package/start",
  title: "Disability Claim Evidence Package",
  seoTitle: "Disability Claim Evidence Package | Claim Proof | MailMyPDF",
  seoDescription: "Use the Disability Claim Evidence Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Claim Proof workflow",
  heroTitle: "Disability Claim Evidence Package",
  heroDescription: "Use a guided disability claim evidence package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
