import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "irs-balance-due-notice-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/irs-balance-due-notice-response",
  startPath: "/notice-respond/workflows/irs-balance-due-notice-response/start",
  title: "IRS Balance Due Notice Response",
  seoTitle: "IRS Balance Due Notice Response | Notice Respond | MailMyPDF",
  seoDescription: "Use the IRS Balance Due Notice Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "IRS Balance Due Notice Response",
  heroDescription: "Use a guided irs balance due notice response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
