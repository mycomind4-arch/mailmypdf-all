import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "medical-necessity-evidence-package",
  sectionId: "claim-proof",
  sectionName: "Claim Proof",
  sectionPath: "/claim-proof",
  path: "/claim-proof/workflows/medical-necessity-evidence-package",
  startPath: "/claim-proof/workflows/medical-necessity-evidence-package/start",
  title: "Medical Necessity Evidence Package",
  seoTitle: "Medical Necessity Evidence Package | Claim Proof | MailMyPDF",
  seoDescription: "Use the Medical Necessity Evidence Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Claim Proof workflow",
  heroTitle: "Medical Necessity Evidence Package",
  heroDescription: "Use a guided medical necessity evidence package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
