import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "ssi-overpayment-appeal",
  sectionId: "benefits-appeal",
  sectionName: "Benefits Appeal",
  sectionPath: "/benefits-appeal",
  path: "/benefits-appeal/workflows/ssi-overpayment-appeal",
  startPath: "/benefits-appeal/workflows/ssi-overpayment-appeal/start",
  title: "SSI Overpayment Appeal",
  seoTitle: "SSI Overpayment Appeal | Benefits Appeal | MailMyPDF",
  seoDescription: "Use the SSI Overpayment Appeal workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Benefits Appeal workflow",
  heroTitle: "SSI Overpayment Appeal",
  heroDescription: "Use a guided ssi overpayment appeal workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
