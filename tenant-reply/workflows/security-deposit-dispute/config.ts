import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "security-deposit-dispute",
  sectionId: "tenant-reply",
  sectionName: "Tenant Reply",
  sectionPath: "/tenant-reply",
  path: "/tenant-reply/workflows/security-deposit-dispute",
  startPath: "/tenant-reply/workflows/security-deposit-dispute/start",
  title: "Security Deposit Dispute",
  seoTitle: "Security Deposit Dispute | Tenant Reply | MailMyPDF",
  seoDescription: "Use the Security Deposit Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Tenant Reply workflow",
  heroTitle: "Security Deposit Dispute",
  heroDescription: "Use a guided security deposit dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
