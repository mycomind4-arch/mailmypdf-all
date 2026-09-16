import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "denied-insurance-claim",
  sectionId: "insurance-claims",
  sectionName: "Insurance Claims",
  sectionPath: "/insurance-claims",
  path: "/insurance-claims/workflows/denied-insurance-claim",
  startPath: "/insurance-claims/workflows/denied-insurance-claim/start",
  title: "Denied Insurance Claim",
  seoTitle: "Denied Insurance Claim | Insurance Claims | MailMyPDF",
  seoDescription: "Use the Denied Insurance Claim workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Insurance Claims workflow",
  heroTitle: "Denied Insurance Claim",
  heroDescription: "Use a guided denied insurance claim workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
