import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "insurance-claim-documentation",
  sectionId: "claim-proof",
  sectionName: "Claim Proof",
  sectionPath: "/claim-proof",
  path: "/claim-proof/workflows/insurance-claim-documentation",
  startPath: "/claim-proof/workflows/insurance-claim-documentation/start",
  title: "Insurance Claim Documentation",
  seoTitle: "Insurance Claim Documentation | Claim Proof | MailMyPDF",
  seoDescription: "Use the Insurance Claim Documentation workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Claim Proof workflow",
  heroTitle: "Insurance Claim Documentation",
  heroDescription: "Use a guided insurance claim documentation workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
