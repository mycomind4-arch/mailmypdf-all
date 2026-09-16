import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "respond-immigration-notice",
  sectionId: "immigration-mail",
  sectionName: "Immigration Mail",
  sectionPath: "/immigration-mail",
  path: "/immigration-mail/workflows/respond-immigration-notice",
  startPath: "/immigration-mail/workflows/respond-immigration-notice/start",
  title: "Respond Immigration Notice",
  seoTitle: "Respond Immigration Notice | Immigration Mail | MailMyPDF",
  seoDescription: "Use the Respond Immigration Notice workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Immigration Mail workflow",
  heroTitle: "Respond Immigration Notice",
  heroDescription: "Use a guided respond immigration notice workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
