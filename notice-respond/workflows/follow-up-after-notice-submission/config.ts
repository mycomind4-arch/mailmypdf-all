import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "follow-up-after-notice-submission",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/follow-up-after-notice-submission",
  startPath: "/notice-respond/workflows/follow-up-after-notice-submission/start",
  title: "Follow Up After Notice Submission",
  seoTitle: "Follow Up After Notice Submission | Notice Respond | MailMyPDF",
  seoDescription: "Use the Follow Up After Notice Submission workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Follow Up After Notice Submission",
  heroDescription: "Use a guided follow up after notice submission workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
