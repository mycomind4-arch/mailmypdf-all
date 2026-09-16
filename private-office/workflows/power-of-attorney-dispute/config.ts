import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "power-of-attorney-dispute",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/power-of-attorney-dispute",
  startPath: "/private-office/workflows/power-of-attorney-dispute/start",
  title: "Power Of Attorney Dispute",
  seoTitle: "Power Of Attorney Dispute | Private Office | MailMyPDF",
  seoDescription: "Use the Power Of Attorney Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "Power Of Attorney Dispute",
  heroDescription: "Use a guided power of attorney dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
