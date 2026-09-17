import type { WorkflowLandingConfig } from "@mailmypdf/design-system"
import heroImage from "./assets/medicaid-appeal-hero.jpg"

export const workflowConfig = {
  id: "appeal-medicaid-denial",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/appeal-medicaid-denial",
  startPath: "/appeal-mail/workflows/appeal-medicaid-denial/start",
  title: "Appeal Medicaid Denial",
  seoTitle: "Appeal Medicaid Denial | Appeal Mail | MailMyPDF",
  seoDescription: "Use the Appeal Medicaid Denial workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Appeal Medicaid Denial",
  heroDescription: "Use a guided appeal medicaid denial workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  heroImage,
  heroImageAlt: "Medicaid appeal coverage denial review form",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
