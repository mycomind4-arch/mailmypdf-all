import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "follow-up-after-compliance-submission",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/follow-up-after-compliance-submission",
  startPath: "/code-enforcement/workflows/follow-up-after-compliance-submission/start",
  title: "Follow Up After Compliance Submission",
  seoTitle: "Follow Up After Compliance Submission | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Follow Up After Compliance Submission workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Follow Up After Compliance Submission",
  heroDescription: "Use a guided follow up after compliance submission workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
