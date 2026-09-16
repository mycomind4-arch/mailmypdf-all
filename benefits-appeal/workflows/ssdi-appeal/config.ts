import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "ssdi-appeal",
  sectionId: "benefits-appeal",
  sectionName: "Benefits Appeal",
  sectionPath: "/benefits-appeal",
  path: "/benefits-appeal/workflows/ssdi-appeal",
  startPath: "/benefits-appeal/workflows/ssdi-appeal/start",
  title: "SSDI Appeal",
  seoTitle: "SSDI Appeal | Benefits Appeal | MailMyPDF",
  seoDescription: "Use the SSDI Appeal workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Benefits Appeal workflow",
  heroTitle: "SSDI Appeal",
  heroDescription: "Use a guided ssdi appeal workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
