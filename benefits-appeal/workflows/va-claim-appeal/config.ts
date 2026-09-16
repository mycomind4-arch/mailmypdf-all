import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "va-claim-appeal",
  sectionId: "benefits-appeal",
  sectionName: "Benefits Appeal",
  sectionPath: "/benefits-appeal",
  path: "/benefits-appeal/workflows/va-claim-appeal",
  startPath: "/benefits-appeal/workflows/va-claim-appeal/start",
  title: "VA Claim Appeal",
  seoTitle: "VA Claim Appeal | Benefits Appeal | MailMyPDF",
  seoDescription: "Use the VA Claim Appeal workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Benefits Appeal workflow",
  heroTitle: "VA Claim Appeal",
  heroDescription: "Use a guided va claim appeal workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
