import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "final-payment-reminder",
  sectionId: "small-business",
  sectionName: "Small Business",
  sectionPath: "/small-business",
  path: "/small-business/workflows/final-payment-reminder",
  startPath: "/small-business/workflows/final-payment-reminder/start",
  title: "Final Payment Reminder",
  seoTitle: "Final Payment Reminder | Small Business | MailMyPDF",
  seoDescription: "Use the Final Payment Reminder workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Small Business workflow",
  heroTitle: "Final Payment Reminder",
  heroDescription: "Use a guided final payment reminder workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
