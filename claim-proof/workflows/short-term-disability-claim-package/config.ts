import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "short-term-disability-claim-package",
  sectionId: "claim-proof",
  sectionName: "Claim Proof",
  sectionPath: "/claim-proof",
  path: "/claim-proof/workflows/short-term-disability-claim-package",
  startPath: "/claim-proof/workflows/short-term-disability-claim-package/start",
  title: "Short Term Disability Claim Package",
  seoTitle: "Short Term Disability Claim Package | Claim Proof | MailMyPDF",
  seoDescription: "Use the Short Term Disability Claim Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Claim Proof workflow",
  heroTitle: "Short Term Disability Claim Package",
  heroDescription: "Use a guided short term disability claim package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
