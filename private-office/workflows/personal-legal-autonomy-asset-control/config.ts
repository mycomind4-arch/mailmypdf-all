import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "personal-legal-autonomy-asset-control",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/personal-legal-autonomy-asset-control",
  startPath: "/private-office/workflows/personal-legal-autonomy-asset-control/start",
  title: "Personal Legal Autonomy Asset Control",
  seoTitle: "Personal Legal Autonomy Asset Control | Private Office | MailMyPDF",
  seoDescription: "Use the Personal Legal Autonomy Asset Control workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "Personal Legal Autonomy Asset Control",
  heroDescription: "Use a guided personal legal autonomy asset control workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
