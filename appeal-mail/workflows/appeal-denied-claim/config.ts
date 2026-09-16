import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "appeal-denied-claim",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/appeal-denied-claim",
  startPath: "/appeal-mail/workflows/appeal-denied-claim/start",
  title: "Appeal Denied Claim",
  seoTitle: "Appeal Denied Claim | Appeal Mail | MailMyPDF",
  seoDescription: "Use the Appeal Denied Claim workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Appeal Denied Claim",
  heroDescription: "Use a guided appeal denied claim workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
