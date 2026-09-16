import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "long-term-disability-claim-package",
  sectionId: "claim-proof",
  sectionName: "Claim Proof",
  sectionPath: "/claim-proof",
  path: "/claim-proof/workflows/long-term-disability-claim-package",
  startPath: "/claim-proof/workflows/long-term-disability-claim-package/start",
  title: "Long Term Disability Claim Package",
  seoTitle: "Long Term Disability Claim Package | Claim Proof | MailMyPDF",
  seoDescription: "Use the Long Term Disability Claim Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Claim Proof workflow",
  heroTitle: "Long Term Disability Claim Package",
  heroDescription: "Use a guided long term disability claim package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
