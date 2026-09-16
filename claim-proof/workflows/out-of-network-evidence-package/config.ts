import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "out-of-network-evidence-package",
  sectionId: "claim-proof",
  sectionName: "Claim Proof",
  sectionPath: "/claim-proof",
  path: "/claim-proof/workflows/out-of-network-evidence-package",
  startPath: "/claim-proof/workflows/out-of-network-evidence-package/start",
  title: "Out Of Network Evidence Package",
  seoTitle: "Out Of Network Evidence Package | Claim Proof | MailMyPDF",
  seoDescription: "Use the Out Of Network Evidence Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Claim Proof workflow",
  heroTitle: "Out Of Network Evidence Package",
  heroDescription: "Use a guided out of network evidence package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
