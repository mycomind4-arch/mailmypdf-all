import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "prepare-insurance-claim",
  sectionId: "insurance-claims",
  sectionName: "Insurance Claims",
  sectionPath: "/insurance-claims",
  path: "/insurance-claims/workflows/prepare-insurance-claim",
  startPath: "/insurance-claims/workflows/prepare-insurance-claim/start",
  title: "Prepare Insurance Claim",
  seoTitle: "Prepare Insurance Claim | Insurance Claims | MailMyPDF",
  seoDescription: "Use the Prepare Insurance Claim workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Insurance Claims workflow",
  heroTitle: "Prepare Insurance Claim",
  heroDescription: "Use a guided prepare insurance claim workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
