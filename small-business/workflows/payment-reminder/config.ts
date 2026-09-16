import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "payment-reminder",
  sectionId: "small-business",
  sectionName: "Small Business",
  sectionPath: "/small-business",
  path: "/small-business/workflows/payment-reminder",
  startPath: "/small-business/workflows/payment-reminder/start",
  title: "Payment Reminder",
  seoTitle: "Payment Reminder | Small Business | MailMyPDF",
  seoDescription: "Use the Payment Reminder workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Small Business workflow",
  heroTitle: "Payment Reminder",
  heroDescription: "Use a guided payment reminder workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
