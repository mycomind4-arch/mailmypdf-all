import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "appeal-after-notice",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/appeal-after-notice",
  startPath: "/notice-respond/workflows/appeal-after-notice/start",
  title: "Appeal After Notice",
  seoTitle: "Appeal After Notice | Notice Respond | MailMyPDF",
  seoDescription: "Use the Appeal After Notice workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Appeal After Notice",
  heroDescription: "Use a guided appeal after notice workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
