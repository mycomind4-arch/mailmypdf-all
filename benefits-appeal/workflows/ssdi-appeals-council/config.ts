import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "ssdi-appeals-council",
  sectionId: "benefits-appeal",
  sectionName: "Benefits Appeal",
  sectionPath: "/benefits-appeal",
  path: "/benefits-appeal/workflows/ssdi-appeals-council",
  startPath: "/benefits-appeal/workflows/ssdi-appeals-council/start",
  title: "SSDI Appeals Council",
  seoTitle: "SSDI Appeals Council | Benefits Appeal | MailMyPDF",
  seoDescription: "Use the SSDI Appeals Council workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Benefits Appeal workflow",
  heroTitle: "SSDI Appeals Council",
  heroDescription: "Use a guided ssdi appeals council workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
