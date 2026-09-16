import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "past-due-invoice-notice",
  sectionId: "small-business",
  sectionName: "Small Business",
  sectionPath: "/small-business",
  path: "/small-business/workflows/past-due-invoice-notice",
  startPath: "/small-business/workflows/past-due-invoice-notice/start",
  title: "Past Due Invoice Notice",
  seoTitle: "Past Due Invoice Notice | Small Business | MailMyPDF",
  seoDescription: "Use the Past Due Invoice Notice workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Small Business workflow",
  heroTitle: "Past Due Invoice Notice",
  heroDescription: "Use a guided past due invoice notice workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
