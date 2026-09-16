import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "medicaid-appeal",
  sectionId: "benefits-appeal",
  sectionName: "Benefits Appeal",
  sectionPath: "/benefits-appeal",
  path: "/benefits-appeal/workflows/medicaid-appeal",
  startPath: "/benefits-appeal/workflows/medicaid-appeal/start",
  title: "Medicaid Appeal",
  seoTitle: "Medicaid Appeal | Benefits Appeal | MailMyPDF",
  seoDescription: "Use the Medicaid Appeal workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Benefits Appeal workflow",
  heroTitle: "Medicaid Appeal",
  heroDescription: "Use a guided medicaid appeal workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
