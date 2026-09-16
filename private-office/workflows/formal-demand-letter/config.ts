import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "formal-demand-letter",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/formal-demand-letter",
  startPath: "/private-office/workflows/formal-demand-letter/start",
  title: "Formal Demand Letter",
  seoTitle: "Formal Demand Letter | Private Office | MailMyPDF",
  seoDescription: "Use the Formal Demand Letter workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "Formal Demand Letter",
  heroDescription: "Use a guided formal demand letter workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
