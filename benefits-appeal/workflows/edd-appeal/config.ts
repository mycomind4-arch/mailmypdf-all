import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "edd-appeal",
  sectionId: "benefits-appeal",
  sectionName: "Benefits Appeal",
  sectionPath: "/benefits-appeal",
  path: "/benefits-appeal/workflows/edd-appeal",
  startPath: "/benefits-appeal/workflows/edd-appeal/start",
  title: "Edd Appeal",
  seoTitle: "Edd Appeal | Benefits Appeal | MailMyPDF",
  seoDescription: "Use the Edd Appeal workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Benefits Appeal workflow",
  heroTitle: "Edd Appeal",
  heroDescription: "Use a guided edd appeal workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
