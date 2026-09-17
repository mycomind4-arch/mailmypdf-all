import type { WorkflowLandingConfig } from "@mailmypdf/design-system"
import heroImage from "./assets/workflow-hero.png"

export const workflowConfig = {
  id: "appeal-ssi-denial",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/appeal-ssi-denial",
  startPath: "/appeal-mail/workflows/appeal-ssi-denial/start",
  title: "Appeal SSI Denial",
  seoTitle: "Appeal SSI Denial | Appeal Mail | MailMyPDF",
  seoDescription: "Use the Appeal SSI Denial workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Appeal SSI Denial",
  heroDescription: "Use a guided appeal ssi denial workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  heroImage,
  heroImageAlt: "Supplemental Security Income request for reconsideration appeal form",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
