import type { WorkflowLandingConfig } from "@mailmypdf/design-system"
import heroImage from "./assets/unemployment-appeal-hero.jpg"

export const workflowConfig = {
  id: "appeal-unemployment-denial",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/appeal-unemployment-denial",
  startPath: "/appeal-mail/workflows/appeal-unemployment-denial/start",
  title: "Appeal Unemployment Denial",
  seoTitle: "Appeal Unemployment Denial | Appeal Mail | MailMyPDF",
  seoDescription: "Use the Appeal Unemployment Denial workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Appeal Unemployment Denial",
  heroDescription: "Use a guided appeal unemployment denial workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  heroImage,
  heroImageAlt: "Unemployment benefits appeal request form",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
