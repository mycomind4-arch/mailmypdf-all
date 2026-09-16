import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "long-term-disability-claim",
  sectionId: "insurance-claims",
  sectionName: "Insurance Claims",
  sectionPath: "/insurance-claims",
  path: "/insurance-claims/workflows/long-term-disability-claim",
  startPath: "/insurance-claims/workflows/long-term-disability-claim/start",
  title: "Long Term Disability Claim",
  seoTitle: "Long Term Disability Claim | Insurance Claims | MailMyPDF",
  seoDescription: "Use the Long Term Disability Claim workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Insurance Claims workflow",
  heroTitle: "Long Term Disability Claim",
  heroDescription: "Use a guided long term disability claim workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
