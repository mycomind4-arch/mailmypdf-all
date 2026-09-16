import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "government-accountability-investigation",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/government-accountability-investigation",
  startPath: "/private-office/workflows/government-accountability-investigation/start",
  title: "Government Accountability Investigation",
  seoTitle: "Government Accountability Investigation | Private Office | MailMyPDF",
  seoDescription: "Use the Government Accountability Investigation workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "Government Accountability Investigation",
  heroDescription: "Use a guided government accountability investigation workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
