import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "unemployment-appeal",
  sectionId: "benefits-appeal",
  sectionName: "Benefits Appeal",
  sectionPath: "/benefits-appeal",
  path: "/benefits-appeal/workflows/unemployment-appeal",
  startPath: "/benefits-appeal/workflows/unemployment-appeal/start",
  title: "Unemployment Appeal",
  seoTitle: "Unemployment Appeal | Benefits Appeal | MailMyPDF",
  seoDescription: "Use the Unemployment Appeal workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Benefits Appeal workflow",
  heroTitle: "Unemployment Appeal",
  heroDescription: "Use a guided unemployment appeal workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
