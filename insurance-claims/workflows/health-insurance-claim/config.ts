import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "health-insurance-claim",
  sectionId: "insurance-claims",
  sectionName: "Insurance Claims",
  sectionPath: "/insurance-claims",
  path: "/insurance-claims/workflows/health-insurance-claim",
  startPath: "/insurance-claims/workflows/health-insurance-claim/start",
  title: "Health Insurance Claim",
  seoTitle: "Health Insurance Claim | Insurance Claims | MailMyPDF",
  seoDescription: "Use the Health Insurance Claim workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Insurance Claims workflow",
  heroTitle: "Health Insurance Claim",
  heroDescription: "Use a guided health insurance claim workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
