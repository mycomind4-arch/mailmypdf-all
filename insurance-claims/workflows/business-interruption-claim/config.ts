import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "business-interruption-claim",
  sectionId: "insurance-claims",
  sectionName: "Insurance Claims",
  sectionPath: "/insurance-claims",
  path: "/insurance-claims/workflows/business-interruption-claim",
  startPath: "/insurance-claims/workflows/business-interruption-claim/start",
  title: "Business Interruption Claim",
  seoTitle: "Business Interruption Claim | Insurance Claims | MailMyPDF",
  seoDescription: "Use the Business Interruption Claim workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Insurance Claims workflow",
  heroTitle: "Business Interruption Claim",
  heroDescription: "Use a guided business interruption claim workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
