import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "medicaid-denial-appeal",
  sectionId: "benefits-appeal",
  sectionName: "Benefits Appeal",
  sectionPath: "/benefits-appeal",
  path: "/benefits-appeal/workflows/medicaid-denial-appeal",
  startPath: "/benefits-appeal/workflows/medicaid-denial-appeal/start",
  title: "Medicaid Denial Appeal",
  seoTitle: "Medicaid Denial Appeal | Benefits Appeal | MailMyPDF",
  seoDescription: "Use the Medicaid Denial Appeal workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Benefits Appeal workflow",
  heroTitle: "Medicaid Denial Appeal",
  heroDescription: "Use a guided medicaid denial appeal workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
