import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "auto-insurance-claim",
  sectionId: "insurance-claims",
  sectionName: "Insurance Claims",
  sectionPath: "/insurance-claims",
  path: "/insurance-claims/workflows/auto-insurance-claim",
  startPath: "/insurance-claims/workflows/auto-insurance-claim/start",
  title: "Auto Insurance Claim",
  seoTitle: "Auto Insurance Claim | Insurance Claims | MailMyPDF",
  seoDescription: "Use the Auto Insurance Claim workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Insurance Claims workflow",
  heroTitle: "Auto Insurance Claim",
  heroDescription: "Use a guided auto insurance claim workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
