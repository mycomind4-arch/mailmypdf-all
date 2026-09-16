import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "appeals-council-preparation",
  sectionId: "benefits-appeal",
  sectionName: "Benefits Appeal",
  sectionPath: "/benefits-appeal",
  path: "/benefits-appeal/workflows/appeals-council-preparation",
  startPath: "/benefits-appeal/workflows/appeals-council-preparation/start",
  title: "Appeals Council Preparation",
  seoTitle: "Appeals Council Preparation | Benefits Appeal | MailMyPDF",
  seoDescription: "Use the Appeals Council Preparation workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Benefits Appeal workflow",
  heroTitle: "Appeals Council Preparation",
  heroDescription: "Use a guided appeals council preparation workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
