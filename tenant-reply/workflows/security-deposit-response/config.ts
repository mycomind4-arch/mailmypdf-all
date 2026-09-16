import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "security-deposit-response",
  sectionId: "tenant-reply",
  sectionName: "Tenant Reply",
  sectionPath: "/tenant-reply",
  path: "/tenant-reply/workflows/security-deposit-response",
  startPath: "/tenant-reply/workflows/security-deposit-response/start",
  title: "Security Deposit Response",
  seoTitle: "Security Deposit Response | Tenant Reply | MailMyPDF",
  seoDescription: "Use the Security Deposit Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Tenant Reply workflow",
  heroTitle: "Security Deposit Response",
  heroDescription: "Use a guided security deposit response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
