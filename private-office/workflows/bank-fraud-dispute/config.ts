import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "bank-fraud-dispute",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/bank-fraud-dispute",
  startPath: "/private-office/workflows/bank-fraud-dispute/start",
  title: "Bank Fraud Dispute",
  seoTitle: "Bank Fraud Dispute | Private Office | MailMyPDF",
  seoDescription: "Use the Bank Fraud Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "Bank Fraud Dispute",
  heroDescription: "Use a guided bank fraud dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
