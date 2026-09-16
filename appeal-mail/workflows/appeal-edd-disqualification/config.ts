import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "appeal-edd-disqualification",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/appeal-edd-disqualification",
  startPath: "/appeal-mail/workflows/appeal-edd-disqualification/start",
  title: "Appeal Edd Disqualification",
  seoTitle: "Appeal Edd Disqualification | Appeal Mail | MailMyPDF",
  seoDescription: "Use the Appeal Edd Disqualification workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Appeal Edd Disqualification",
  heroDescription: "Use a guided appeal edd disqualification workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
