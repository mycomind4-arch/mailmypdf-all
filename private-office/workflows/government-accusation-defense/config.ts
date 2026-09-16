import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "government-accusation-defense",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/government-accusation-defense",
  startPath: "/private-office/workflows/government-accusation-defense/start",
  title: "Government Accusation Defense",
  seoTitle: "Government Accusation Defense | Private Office | MailMyPDF",
  seoDescription: "Use the Government Accusation Defense workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "Government Accusation Defense",
  heroDescription: "Use a guided government accusation defense workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
