import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "irs-30-day-letter-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/irs-30-day-letter-response",
  startPath: "/notice-respond/workflows/irs-30-day-letter-response/start",
  title: "IRS 30 Day Letter Response",
  seoTitle: "IRS 30 Day Letter Response | Notice Respond | MailMyPDF",
  seoDescription: "Use the IRS 30 Day Letter Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "IRS 30 Day Letter Response",
  heroDescription: "Use a guided irs 30 day letter response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
