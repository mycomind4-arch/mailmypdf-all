import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "irs-income-tax-notice-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/irs-income-tax-notice-response",
  startPath: "/notice-respond/workflows/irs-income-tax-notice-response/start",
  title: "IRS Income Tax Notice Response",
  seoTitle: "IRS Income Tax Notice Response | Notice Respond | MailMyPDF",
  seoDescription: "Use the IRS Income Tax Notice Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "IRS Income Tax Notice Response",
  heroDescription: "Use a guided irs income tax notice response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
