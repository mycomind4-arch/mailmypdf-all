import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "short-term-disability-claim",
  sectionId: "insurance-claims",
  sectionName: "Insurance Claims",
  sectionPath: "/insurance-claims",
  path: "/insurance-claims/workflows/short-term-disability-claim",
  startPath: "/insurance-claims/workflows/short-term-disability-claim/start",
  title: "Short Term Disability Claim",
  seoTitle: "Short Term Disability Claim | Insurance Claims | MailMyPDF",
  seoDescription: "Use the Short Term Disability Claim workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Insurance Claims workflow",
  heroTitle: "Short Term Disability Claim",
  heroDescription: "Use a guided short term disability claim workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
