import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "trust-accounting-demand",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/trust-accounting-demand",
  startPath: "/private-office/workflows/trust-accounting-demand/start",
  title: "Trust Accounting Demand",
  seoTitle: "Trust Accounting Demand | Private Office | MailMyPDF",
  seoDescription: "Use the Trust Accounting Demand workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "Trust Accounting Demand",
  heroDescription: "Use a guided trust accounting demand workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
