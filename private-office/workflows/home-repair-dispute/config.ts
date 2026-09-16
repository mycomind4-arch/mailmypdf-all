import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "home-repair-dispute",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/home-repair-dispute",
  startPath: "/private-office/workflows/home-repair-dispute/start",
  title: "Home Repair Dispute",
  seoTitle: "Home Repair Dispute | Private Office | MailMyPDF",
  seoDescription: "Use the Home Repair Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "Home Repair Dispute",
  heroDescription: "Use a guided home repair dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
