import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "appeal-car-insurance-claim",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/appeal-car-insurance-claim",
  startPath: "/appeal-mail/workflows/appeal-car-insurance-claim/start",
  title: "Appeal Car Insurance Claim",
  seoTitle: "Appeal Car Insurance Claim | Appeal Mail | MailMyPDF",
  seoDescription: "Use the Appeal Car Insurance Claim workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Appeal Car Insurance Claim",
  heroDescription: "Use a guided appeal car insurance claim workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
