import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "disability-claim-appeal",
  sectionId: "benefits-appeal",
  sectionName: "Benefits Appeal",
  sectionPath: "/benefits-appeal",
  path: "/benefits-appeal/workflows/disability-claim-appeal",
  startPath: "/benefits-appeal/workflows/disability-claim-appeal/start",
  title: "Disability Claim Appeal",
  seoTitle: "Disability Claim Appeal | Benefits Appeal | MailMyPDF",
  seoDescription: "Use the Disability Claim Appeal workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Benefits Appeal workflow",
  heroTitle: "Disability Claim Appeal",
  heroDescription: "Use a guided disability claim appeal workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
