import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "financial-aid-reinstatement",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/financial-aid-reinstatement",
  startPath: "/appeal-mail/workflows/financial-aid-reinstatement/start",
  title: "Financial Aid Reinstatement",
  seoTitle: "Financial Aid Reinstatement | Appeal Mail | MailMyPDF",
  seoDescription: "Use the Financial Aid Reinstatement workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Financial Aid Reinstatement",
  heroDescription: "Use a guided financial aid reinstatement workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
