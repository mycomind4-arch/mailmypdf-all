import type { WorkflowLandingConfig } from "@mailmypdf/design-system"
import heroImage from "./assets/workflow-hero.png"

export const workflowConfig = {
  id: "appeal-insurance-claim-denial",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/appeal-insurance-claim-denial",
  startPath: "/appeal-mail/workflows/appeal-insurance-claim-denial/start",
  title: "Appeal Insurance Claim Denial",
  seoTitle: "Appeal Insurance Claim Denial | Appeal Mail | MailMyPDF",
  seoDescription: "Use the Appeal Insurance Claim Denial workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Appeal Insurance Claim Denial",
  heroDescription: "Use a guided appeal insurance claim denial workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  heroImage,
  heroImageAlt: "Health insurance claim appeal denial review form",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
