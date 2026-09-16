import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "security-deposit-demand",
  sectionId: "tenant-reply",
  sectionName: "Tenant Reply",
  sectionPath: "/tenant-reply",
  path: "/tenant-reply/workflows/security-deposit-demand",
  startPath: "/tenant-reply/workflows/security-deposit-demand/start",
  title: "Security Deposit Demand",
  seoTitle: "Security Deposit Demand | Tenant Reply | MailMyPDF",
  seoDescription: "Use the Security Deposit Demand workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Tenant Reply workflow",
  heroTitle: "Security Deposit Demand",
  heroDescription: "Use a guided security deposit demand workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
