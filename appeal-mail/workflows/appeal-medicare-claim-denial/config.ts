import type { WorkflowLandingConfig } from "@mailmypdf/design-system"
import heroImage from "./assets/medicare-appeal-hero.jpg"

export const workflowConfig = {
  id: "appeal-medicare-claim-denial",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/appeal-medicare-claim-denial",
  startPath: "/appeal-mail/workflows/appeal-medicare-claim-denial/start",
  title: "Appeal Medicare Claim Denial",
  seoTitle: "Appeal Medicare Claim Denial | Appeal Mail | MailMyPDF",
  seoDescription: "Use the Appeal Medicare Claim Denial workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Appeal Medicare Claim Denial",
  heroDescription: "Use a guided appeal medicare claim denial workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  heroImage,
  heroImageAlt: "Medicare coverage appeal request for redetermination form",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
