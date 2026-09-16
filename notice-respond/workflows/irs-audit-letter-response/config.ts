import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "irs-audit-letter-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/irs-audit-letter-response",
  startPath: "/notice-respond/workflows/irs-audit-letter-response/start",
  title: "IRS Audit Letter Response",
  seoTitle: "IRS Audit Letter Response | Notice Respond | MailMyPDF",
  seoDescription: "Use the IRS Audit Letter Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "IRS Audit Letter Response",
  heroDescription: "Use a guided irs audit letter response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
