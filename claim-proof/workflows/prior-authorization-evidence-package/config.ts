import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "prior-authorization-evidence-package",
  sectionId: "claim-proof",
  sectionName: "Claim Proof",
  sectionPath: "/claim-proof",
  path: "/claim-proof/workflows/prior-authorization-evidence-package",
  startPath: "/claim-proof/workflows/prior-authorization-evidence-package/start",
  title: "Prior Authorization Evidence Package",
  seoTitle: "Prior Authorization Evidence Package | Claim Proof | MailMyPDF",
  seoDescription: "Use the Prior Authorization Evidence Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Claim Proof workflow",
  heroTitle: "Prior Authorization Evidence Package",
  heroDescription: "Use a guided prior authorization evidence package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
